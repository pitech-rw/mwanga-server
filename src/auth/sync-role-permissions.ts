import { db } from '../prisma/db.js';
import {
  ALL_KNOWN_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  type PermissionName,
} from './permission-catalog.js';

type Database = typeof db;

export async function syncRolePermissions(database: Database, roleName: string, permissions: readonly PermissionName[]) {
  let role = await database.orm.public.Role.first({ name: roleName });

  if (!role) {
    role = await database.orm.public.Role.create({ name: roleName });
  }

  const existing = await database.orm.public.Permission.where({ roleId: role.id }).all();
  const desired = new Set(permissions);

  for (const permission of existing) {
    if (!desired.has(permission.name as PermissionName)) {
      await database.orm.public.Permission.where({ id: permission.id }).delete();
    }
  }

  const existingNames = new Set(existing.map((permission) => permission.name));

  for (const name of desired) {
    if (!existingNames.has(name)) {
      await database.orm.public.Permission.create({
        name,
        roleId: role.id,
      });
    }
  }

  return role;
}

export async function syncAllDefaultRolePermissions(database: Database) {
  for (const [roleName, permissions] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    await syncRolePermissions(database, roleName, permissions);
  }
}

export function listUnknownPermissionNames(names: Iterable<string>): string[] {
  const known = new Set<string>(ALL_KNOWN_PERMISSIONS);
  return [...names].filter((name) => !known.has(name));
}
