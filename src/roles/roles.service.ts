import { Injectable, NotFoundException } from '@nestjs/common';
import { apiBadRequest } from '../errors/api-error.js';
import { RolesCodes } from '../errors/codes.js';
import type { ReadScopeContext } from '../auth/read-scope.js';
import { assertCanReadRoles } from '../auth/read-scope.js';
import { buildPermissionCatalog } from '../auth/permission-catalog.js';
import type { PermissionName } from '../auth/permission-catalog.js';
import {
  listUnknownPermissionNames,
  replaceRolePermissionsById,
} from '../auth/sync-role-permissions.js';
import { isUniqueViolation, withoutUndefined } from '../prisma/errors.js';
import type { Role } from '../prisma/types.js';
import { PrismaService } from '../prisma.service.js';
import { CreateRoleDto } from './create-role.dto.js';
import type { RoleWithPermissions } from './role-with-permissions.js';
import { SetRolePermissionsDto } from './set-role-permissions.dto.js';
import { UpdateRoleDto } from './update-role.dto.js';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  getPermissionCatalog() {
    return { permissions: buildPermissionCatalog() };
  }

  private async permissionsByRoleId(): Promise<Map<number, string[]>> {
    const rows = await this.prisma.db.orm.public.Permission.all();
    const map = new Map<number, string[]>();

    for (const row of rows) {
      const list = map.get(row.roleId) ?? [];
      list.push(row.name);
      map.set(row.roleId, list);
    }

    for (const [roleId, names] of map) {
      map.set(roleId, [...new Set(names)].sort());
    }

    return map;
  }

  private attachPermissions(roles: Role[], byRoleId: Map<number, string[]>): RoleWithPermissions[] {
    return roles.map((role) => ({
      ...role,
      permissions: byRoleId.get(role.id) ?? [],
    }));
  }

  async findAll(ctx: ReadScopeContext): Promise<RoleWithPermissions[]> {
    assertCanReadRoles(ctx);

    const roles = await this.prisma.db.orm.public.Role.orderBy((role) => role.id.asc()).all();
    const byRoleId = await this.permissionsByRoleId();

    return this.attachPermissions(roles, byRoleId);
  }

  async findOne(id: number, ctx: ReadScopeContext): Promise<RoleWithPermissions> {
    assertCanReadRoles(ctx);

    const role = await this.prisma.db.orm.public.Role.first({ id });

    if (!role) {
      throw new NotFoundException(`Role with id ${id} not found`);
    }

    const permissions = await this.prisma.db.orm.public.Permission.where({ roleId: id }).all();

    return {
      ...role,
      permissions: [...new Set(permissions.map((p) => p.name))].sort(),
    };
  }

  async create(data: CreateRoleDto): Promise<RoleWithPermissions> {
    try {
      const role = await this.prisma.db.orm.public.Role.create({
        name: data.name,
      });

      return { ...role, permissions: [] };
    } catch (error) {
      if (isUniqueViolation(error)) {
        apiBadRequest(RolesCodes.duplicateRole);
      }

      throw error;
    }
  }

  async update(id: number, data: UpdateRoleDto, ctx: ReadScopeContext): Promise<RoleWithPermissions> {
    await this.findOne(id, ctx);

    try {
      const role = await this.prisma.db.orm.public.Role.where({ id }).update(
        withoutUndefined({
          name: data.name,
        }),
      );

      if (!role) {
        throw new NotFoundException(`Role with id ${id} not found`);
      }

      return this.findOne(id, ctx);
    } catch (error) {
      if (isUniqueViolation(error)) {
        apiBadRequest(RolesCodes.duplicateRole);
      }

      throw error;
    }
  }

  async setPermissions(
    id: number,
    data: SetRolePermissionsDto,
    ctx: ReadScopeContext,
  ): Promise<RoleWithPermissions> {
    await this.findOne(id, ctx);

    const unknown = listUnknownPermissionNames(data.permissions);
    if (unknown.length > 0) {
      apiBadRequest(RolesCodes.unknownPermission, {
        params: { names: unknown.join(', ') },
      });
    }

    const names = [...new Set(data.permissions)] as PermissionName[];
    await replaceRolePermissionsById(this.prisma.db, id, names);

    return this.findOne(id, ctx);
  }

  async remove(id: number, ctx: ReadScopeContext): Promise<RoleWithPermissions> {
    const existing = await this.findOne(id, ctx);

    const role = await this.prisma.db.orm.public.Role.where({ id }).delete();

    if (!role) {
      throw new NotFoundException(`Role with id ${id} not found`);
    }

    return existing;
  }
}