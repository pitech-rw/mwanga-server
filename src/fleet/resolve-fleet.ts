import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { ReadScopeContext } from '../auth/read-scope.js';
import { isUnrestrictedRead } from '../auth/read-scope.js';
import type { PrismaService } from '../prisma.service.js';
import type { UserType } from '../prisma/types.js';

/** Resolves the commercial Owner.id for portal (owner) or fleet rider accounts. */
export async function resolveFleetOwnerId(
  prisma: PrismaService,
  userId: number,
  type: UserType,
): Promise<number> {
  if (type === 'owner') {
    const proprietor = await prisma.db.orm.public.Owner.first({ userId });
    if (!proprietor) {
      throw new NotFoundException('No owner account is linked to this user');
    }
    return proprietor.id;
  }

  if (type === 'rider') {
    const rider = await prisma.db.orm.public.User.first({ id: userId });
    if (!rider) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }
    if (rider.ownerId == null) {
      throw new BadRequestException('Rider is not assigned to a fleet owner');
    }
    return rider.ownerId;
  }

  throw new ForbiddenException('User type has no fleet owner scope');
}

export async function resolveFleetOwnerIdForContext(
  prisma: PrismaService,
  ctx: ReadScopeContext,
): Promise<number | null> {
  if (isUnrestrictedRead(ctx)) {
    return null;
  }
  const type = ctx.user.type as UserType;
  if (type !== 'owner' && type !== 'rider') {
    throw new ForbiddenException('Insufficient scope to access fleet wallet');
  }
  return resolveFleetOwnerId(prisma, ctx.user.sub, type);
}

export async function assertUserInFleet(
  prisma: PrismaService,
  fleetOwnerId: number,
  targetUserId: number,
): Promise<void> {
  const target = await prisma.db.orm.public.User.first({ id: targetUserId });
  if (!target) {
    throw new NotFoundException(`User with id ${targetUserId} not found`);
  }
  const proprietor = await prisma.db.orm.public.Owner.first({ userId: targetUserId });
  if (proprietor?.id === fleetOwnerId) {
    return;
  }
  if (target.ownerId === fleetOwnerId) {
    return;
  }
  throw new ForbiddenException('You may only read users in your fleet');
}
