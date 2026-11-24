import { isUniqueViolation } from '../prisma/errors.js';
import { db } from '../prisma/db.js';
import {
  ALL_KNOWN_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  type PermissionName,
} from './permission-catalog.js';

type Database = typeof db;

async function ensureRoleByName(database: Database, roleName: string) {
  let role = await database.orm.public.Role.first({ name: roleName });

  if (!role) {
    try {
      role = await database.orm.public.Role.create({ name: roleName });
    } catch (error) {
      if (!isUniqueViolation(error)) {
        throw error;
      }

      role = await database.orm.public.Role.first({ name: roleName });

      if (!role) {
        throw error;
      }
    }
  }

  return role;
}

/** Full replace of permission rows for a role (used by API and destructive reset). */
export async function replaceRolePermissionsById(
  database: Database,
  roleId: number,
  permissions: readonly PermissionName[],
): Promise<void> {
  const existing = await database.orm.public.Permission.where({ roleId }).all();
  const desired = new Set(permissions);

  for (const permission of existing) {
    if (!desired.has(permission.name as PermissionName)) {
      await database.orm.public.Permission.where({ id: permission.id }).delete();
    }
  }

  const existingNames = new Set(existing.map((permission) => permission.name));

  for (const name of desired) {
    if (!existingNames.has(name)) {
      try {
        await database.orm.public.Permission.create({
          name,
          roleId,
        });
      } catch (error) {
        if (!isUniqueViolation(error)) {
          throw error;
        }
      }
    }
  }
}

export async function syncRolePermissions(database: Database, roleName: string, permissions: readonly PermissionName[]) {
  const role = await ensureRoleByName(database, roleName);
  await replaceRolePermissionsById(database, role.id, permissions);
  return role;
}

/**
 * Ensures default role rows exist and applies catalog permissions only when a role has zero permission rows.
 * Does not change roles that already have any permissions (DB / admin authoritative).
 */
export async function bootstrapDefaultRolePermissions(database: Database) {
  for (const [roleName, permissions] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    const role = await ensureRoleByName(database, roleName);
    const existing = await database.orm.public.Permission.where({ roleId: role.id }).all();

    if (existing.length === 0) {
      await replaceRolePermissionsById(database, role.id, permissions);
    }
  }
}

/** Destructive: force-replace built-in roles from DEFAULT_ROLE_PERMISSIONS. */
export async function resetDefaultRolePermissions(database: Database) {
  for (const [roleName, permissions] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    await syncRolePermissions(database, roleName, permissions);
  }
}

/** @deprecated Prefer bootstrapDefaultRolePermissions; kept for explicit reset CLI. */
export async function syncAllDefaultRolePermissions(database: Database) {
  await resetDefaultRolePermissions(database);
}

export function listUnknownPermissionNames(names: Iterable<string>): string[] {
  const known = new Set<string>(ALL_KNOWN_PERMISSIONS);
  return [...names].filter((name) => !known.has(name));
}