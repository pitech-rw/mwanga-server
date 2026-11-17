import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { User } from '../prisma/types.js';
import { PrismaService } from '../prisma.service.js';
import { UsersService } from '../users/users.service.js';
import type { JwtPayload } from './auth.types.js';
import { LoginDto } from './login.dto.js';
import { PermissionsService } from './permissions.service.js';
import { hashPassword, verifyPassword } from './password.js';
import type { PasswordResetJwtPayload } from './password-reset.types.js';
import { MailService } from '../mail/mail.service.js';
import type { ForgotPasswordDto } from './forgot-password.dto.js';
import type { ResetPasswordDto } from './reset-password.dto.js';
import { buildMeProfile, type MeProfileView } from './me-profile.js';
import { SIGNUP_USER_TYPE } from './sign-up.constants.js';
import type { SignUpDto } from './sign-up.dto.js';

type UserWithRole = User & { role: { id: number; name: string } };

const PASSWORD_RESET_RESPONSE =
  'If an account exists for that email, we sent password reset instructions.';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly permissionsService: PermissionsService,
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
    private readonly config: ConfigService,
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

  async requestPasswordReset(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const user = await this.userQuery().first({ email: normalizedEmail });

    if (!user?.passwordHash || !user.isActive) {
      return { message: PASSWORD_RESET_RESPONSE };
    }

    const token = await this.jwtService.signAsync(
      { sub: user.id, purpose: 'password-reset' } satisfies PasswordResetJwtPayload,
      { expiresIn: '1h' },
    );

    const webBase =
      this.config.get<string>('APP_WEB_URL')?.replace(/\/$/, '') ?? 'http://localhost:5000';
    const resetUrl = `${webBase}/reset-password?token=${encodeURIComponent(token)}`;

    try {
      await this.mailService.sendPasswordResetEmail({
        to: user.email,
        firstName: user.firstName,
        resetUrl,
      });
    } catch (err) {
      this.logger.error(
        `Failed to send password reset email for user ${user.id}`,
        err instanceof Error ? err.stack : String(err),
      );
    }

    return { message: PASSWORD_RESET_RESPONSE };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    let payload: PasswordResetJwtPayload;

    try {
      payload = await this.jwtService.verifyAsync<PasswordResetJwtPayload>(dto.token);
    } catch {
      throw new BadRequestException('Invalid or expired reset link.');
    }

    if (payload.purpose !== 'password-reset' || typeof payload.sub !== 'number') {
      throw new BadRequestException('Invalid or expired reset link.');
    }

    const user = await this.userQuery().first({ id: payload.sub });

    if (!user?.isActive) {
      throw new BadRequestException('Invalid or expired reset link.');
    }

    const passwordHash = await hashPassword(dto.password);

    await this.prisma.db.orm.public.User.where({ id: user.id }).update({
      passwordHash,
    });

    return { message: 'Password updated. You can sign in now.' };
  }

  async getProfile(userId: number, view: MeProfileView = 'persona') {
    const user = await this.userQuery().first({ id: userId });

    if (!user?.isActive) {
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
