import 'dotenv/config';
import { beforeAll, describe, expect, it } from 'vitest';
import { db } from '../prisma/db.js';
import {
  bootstrapDefaultRolePermissions,
  replaceRolePermissionsById,
  resetDefaultRolePermissions,
} from './sync-role-permissions.js';
import { PERMISSIONS } from './permission-catalog.js';

describe.sequential('sync-role-permissions (integration)', { timeout: 60_000 }, () => {
  const stamp = Date.now();
  const customRoleName = `matrix_test_${stamp}`;

  beforeAll(async () => {
    await db.connect({ url: process.env['DATABASE_URL']! });
  });

  it('bootstrap applies defaults only when a role has zero permissions', async () => {
    const role = await db.orm.public.Role.create({ name: customRoleName });

    await bootstrapDefaultRolePermissions(db);

    let rows = await db.orm.public.Permission.where({ roleId: role.id }).all();
    expect(rows).toHaveLength(0);

    await replaceRolePermissionsById(db, role.id, [PERMISSIONS.bikes.read]);
    rows = await db.orm.public.Permission.where({ roleId: role.id }).all();
    expect(rows.map((r) => r.name)).toEqual([PERMISSIONS.bikes.read]);

    await bootstrapDefaultRolePermissions(db);
    rows = await db.orm.public.Permission.where({ roleId: role.id }).all();
    expect(rows.map((r) => r.name)).toEqual([PERMISSIONS.bikes.read]);

    await db.orm.public.Permission.where({ roleId: role.id }).delete();
    await db.orm.public.Role.where({ id: role.id }).delete();
  });

  it('resetDefaultRolePermissions restores built-in role from catalog', async () => {
    const office = await db.orm.public.Role.first({ name: 'office' });
    if (!office) {
      throw new Error('office role required');
    }

    await replaceRolePermissionsById(db, office.id, [PERMISSIONS.bikes.read]);
    let rows = await db.orm.public.Permission.where({ roleId: office.id }).all();
    expect(rows.every((r) => r.name === PERMISSIONS.bikes.read)).toBe(true);

    await resetDefaultRolePermissions(db);
    rows = await db.orm.public.Permission.where({ roleId: office.id }).all();
    expect(rows.length).toBeGreaterThan(1);
    expect(rows.some((r) => r.name === PERMISSIONS.bikes.read)).toBe(true);
  });
});