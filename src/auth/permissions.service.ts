import { Injectable } from '@nestjs/common';
import { PERMISSIONS } from './permission-catalog.js';
import { PrismaService } from '../prisma.service.js';

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPermissionNamesForRole(roleId: number): Promise<Set<string>> {
    const permissions = await this.prisma.db.orm.public.Permission.where({ roleId }).all();
    return new Set(permissions.map((permission) => permission.name));
  }

  hasAdminBypass(permissionNames: Set<string>): boolean {
    return permissionNames.has(PERMISSIONS.system.admin);
  }

  satisfiesRequired(
    permissionNames: Set<string>,
    required: readonly string[],
  ): boolean {
    if (this.hasAdminBypass(permissionNames)) {
      return true;
    }

    return required.every((permission) => permissionNames.has(permission));
  }
}
