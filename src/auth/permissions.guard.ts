import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedUser } from './auth.types.js';
import { IS_PUBLIC_KEY } from './public.decorator.js';
import { PERMISSIONS_ANY_KEY, PERMISSIONS_KEY } from './require-permissions.decorator.js';
import { PermissionsService } from './permissions.service.js';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const requiredAll = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const requiredAny = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_ANY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredAll?.length && !requiredAny?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Missing authenticated user');
    }

    const rolePermissions = await this.permissionsService.getPermissionNamesForRole(user.roleId);

    if (requiredAny?.length) {
      if (this.permissionsService.satisfiesAny(rolePermissions, requiredAny)) {
        return true;
      }
      throw new ForbiddenException('Insufficient permissions');
    }

    if (this.permissionsService.satisfiesRequired(rolePermissions, requiredAll)) {
      return true;
    }

    throw new ForbiddenException('Insufficient permissions');
  }
}
