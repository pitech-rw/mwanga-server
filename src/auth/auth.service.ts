import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { User } from '../prisma/types.js';
import { PrismaService } from '../prisma.service.js';
import { UsersService } from '../users/users.service.js';
import type { JwtPayload } from './auth.types.js';
import { LoginDto } from './login.dto.js';
import { PermissionsService } from './permissions.service.js';
import { verifyPassword } from './password.js';
import { buildMeProfile, type MeProfileView } from './me-profile.js';
import { SIGNUP_USER_TYPE } from './sign-up.constants.js';
import type { SignUpDto } from './sign-up.dto.js';

type UserWithRole = User & { role: { id: number; name: string } };

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly permissionsService: PermissionsService,
    private readonly usersService: UsersService,
  ) {}

  private userQuery() {
    return this.prisma.db.orm.public.User.include('role');
  }

  async findUserByLoginIdentifier(identifier: string): Promise<UserWithRole | null> {
    const trimmed = identifier.trim();
    const byUsername = await this.userQuery().first({ username: trimmed });

    if (byUsername) {
      return byUsername;
    }

    const normalizedEmail = trimmed.toLowerCase();
    const byNormalizedEmail = await this.userQuery().first({ email: normalizedEmail });

    if (byNormalizedEmail) {
      return byNormalizedEmail;
    }

    if (normalizedEmail !== trimmed) {
      return this.userQuery().first({ email: trimmed });
    }

    return null;
  }

  async login(dto: LoginDto): Promise<{
    accessToken: string;
    tokenType: 'Bearer';
    user: ReturnType<typeof buildMeProfile>;
  }> {
    const user = await this.findUserByLoginIdentifier(dto.identifier);

    if (!user?.passwordHash || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await verifyPassword(dto.password, user.passwordHash);

    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.db.orm.public.User.where({ id: user.id }).update({
      lastLoginAt: new Date(),
    });

    return this.issueAuthResponse(user);
  }

  async signUp(dto: SignUpDto): Promise<{
    accessToken: string;
    tokenType: 'Bearer';
    user: ReturnType<typeof buildMeProfile>;
  }> {
    const created = await this.usersService.create({
      username: dto.username,
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone,
      password: dto.password,
      type: SIGNUP_USER_TYPE,
      isActive: true,
    });

    const user = await this.userQuery().first({ id: created.id });

    if (!user) {
      throw new NotFoundException('User was created but could not be loaded');
    }

    await this.prisma.db.orm.public.User.where({ id: user.id }).update({
      lastLoginAt: new Date(),
    });

    return this.issueAuthResponse(user);
  }

  private async issueAuthResponse(user: UserWithRole): Promise<{
    accessToken: string;
    tokenType: 'Bearer';
    user: ReturnType<typeof buildMeProfile>;
  }> {
    const accessToken = await this.signToken(user);
    const permissionNames = await this.permissionsService.getPermissionNamesForRole(user.roleId);

    return {
      accessToken,
      tokenType: 'Bearer' as const,
      user: buildMeProfile(user, [...permissionNames], 'persona'),
    };
  }

  async getProfile(userId: number, view: MeProfileView = 'persona') {
    const user = await this.userQuery().first({ id: userId });

    if (!user) {
      throw new UnauthorizedException();
    }

    const permissionNames = await this.permissionsService.getPermissionNamesForRole(user.roleId);

    return buildMeProfile(user, [...permissionNames], view);
  }

  private async signToken(user: UserWithRole): Promise<string> {
    const permissionNames = await this.permissionsService.getPermissionNamesForRole(user.roleId);

    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      type: user.type,
      roleId: user.roleId,
      stationId: user.stationId ?? null,
      adminBypass: this.permissionsService.hasAdminBypass(permissionNames),
    };

    return this.jwtService.signAsync(payload);
  }
}
