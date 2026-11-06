import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma.service.js';
import type { JwtPayload } from './auth.types.js';
import { PermissionsService } from './permissions.service.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly permissionsService: PermissionsService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    const user = await this.prisma.db.orm.public.User.first({ id: payload.sub });

    if (!user?.isActive) {
      throw new UnauthorizedException();
    }

    const rolePermissions = await this.permissionsService.getPermissionNamesForRole(user.roleId);

    return {
      sub: user.id,
      username: user.username,
      type: user.type,
      roleId: user.roleId,
      stationId: user.stationId ?? null,
      adminBypass: this.permissionsService.hasAdminBypass(rolePermissions),
    } satisfies JwtPayload;
  }
}
