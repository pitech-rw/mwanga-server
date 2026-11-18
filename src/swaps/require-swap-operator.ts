import { NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma.service.js';
import { apiBadRequest } from '../errors/api-error.js';
import { SwapsCodes } from '../errors/codes.js';

/** Rider or fleet proprietor (owner type) performing a swap. */
export async function requireSwapOperator(prisma: PrismaService, userId: number) {
  const user = await prisma.db.orm.public.User.where({ id: userId })
    .include('nfcCards')
    .include('proprietorOwner')
    .first();

  if (!user) {
    throw new NotFoundException(`User with id ${userId} not found`);
  }

  if (user.type === 'rider') {
    if (user.ownerId == null) {
      apiBadRequest(SwapsCodes.riderNoFleetOwnerShort);
    }
  } else if (user.type === 'owner') {
    if (!user.proprietorOwner) {
      apiBadRequest(SwapsCodes.ownerUserNotLinked);
    }
  } else {
    apiBadRequest(SwapsCodes.cannotOperateSwap);
  }

  if (!user.isActive) {
    apiBadRequest(SwapsCodes.accountInactive);
  }

  return user;
}