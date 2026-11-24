import 'dotenv/config';
import { beforeAll, describe, expect, it } from 'vitest';
import { hashPassword } from '../auth/password.js';
import { db } from '../prisma/db.js';
import { PrismaService } from '../prisma.service.js';
import { ErasureRequestService } from './erasure-request.service.js';
import { UserErasureService } from './user-erasure.service.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';

describe.sequential('User erasure (integration)', { timeout: 90_000 }, () => {
  const prisma = { db } as PrismaService;
  const userErasure = new UserErasureService(prisma);
  const erasureRequests = new ErasureRequestService(prisma, userErasure);

  let riderRoleId: number;
  let createdUserId: number;
  const stamp = Date.now();
  const username = `erase_test_${stamp}`;
  const email = `erase-test-${stamp}@example.com`;

  beforeAll(async () => {
    await db.connect({ url: process.env['DATABASE_URL']! });

    const riderRole = await db.orm.public.Role.first({ name: 'rider' });
    if (!riderRole) {
      throw new Error('rider role required');
    }
    riderRoleId = riderRole.id;

    const passwordHash = await hashPassword('EraseTestPass1');
    const user = await db.orm.public.User.create({
      username,
      firstName: 'Erase',
      lastName: 'Tester',
      email,
      phone: `+2557${String(stamp).slice(-8)}`,
      type: 'rider',
      roleId: riderRoleId,
      isActive: true,
      passwordHash,
    });
    createdUserId = user.id;
  });

  it('scrubs PII and blocks login while keeping user id', async () => {
    const actor: AuthenticatedUser = {
      sub: createdUserId,
      username,
      type: 'rider',
      roleId: riderRoleId,
      stationId: null,
      adminBypass: false,
    };

    await erasureRequests.confirmSelfService(actor, 'EraseTestPass1', {
      acknowledgeBalanceForfeiture: true,
    });

    const erased = await db.orm.public.User.first({ id: createdUserId });
    expect(erased?.erasedAt).toBeTruthy();
    expect(erased?.isActive).toBe(false);
    expect(erased?.email).toBe(`erased-${createdUserId}@invalid.local`);
    expect(erased?.firstName).toBe('Erased');
    expect(erased?.passwordHash).toBeNull();

    const swaps = await db.orm.public.SwapTransaction.where({ userId: createdUserId }).all();
    for (const swap of swaps) {
      expect(swap.userId).toBe(createdUserId);
    }
  });

  it('staff erasure stays pending until admin approves', async () => {
    const officeRole = await db.orm.public.Role.first({ name: 'office' });
    const adminRole = await db.orm.public.Role.first({ name: 'admin' });
    if (!officeRole || !adminRole) {
      throw new Error('office and admin roles required');
    }

    const stamp2 = Date.now() + 1;
    const officeUser = await db.orm.public.User.create({
      username: `erase_staff_${stamp2}`,
      firstName: 'Staff',
      lastName: 'Erase',
      email: `erase-staff-${stamp2}@example.com`,
      type: 'office',
      roleId: officeRole.id,
      isActive: true,
      passwordHash: await hashPassword('StaffErase1'),
    });

    const adminUser = await db.orm.public.User.first({ type: 'admin', isActive: true });
    if (!adminUser) {
      throw new Error('active admin user required');
    }

    const staffActor: AuthenticatedUser = {
      sub: officeUser.id,
      username: officeUser.username,
      type: 'office',
      roleId: officeRole.id,
      stationId: null,
      adminBypass: false,
    };

    const request = await erasureRequests.createRequest(staffActor);
    expect(request.status).toBe('pending_approval');

    const adminActor: AuthenticatedUser = {
      sub: adminUser.id,
      username: adminUser.username,
      type: adminUser.type,
      roleId: adminUser.roleId,
      stationId: adminUser.stationId ?? null,
      adminBypass: true,
    };

    await erasureRequests.approve(request.id, adminActor);

    const erasedStaff = await db.orm.public.User.first({ id: officeUser.id });
    expect(erasedStaff?.erasedAt).toBeTruthy();
    expect(erasedStaff?.email).toBe(`erased-${officeUser.id}@invalid.local`);
  });
});