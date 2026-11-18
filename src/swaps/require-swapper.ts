import { NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma.service.js';
import { apiBadRequest } from '../errors/api-error.js';
import { SwapsCodes } from '../errors/codes.js';

const swapOperatorTypes = new Set(['swapper', 'office']);

export async function requireSwapper(prisma: PrismaService, swapperId: number) {
  const user = await prisma.db.orm.public.User.first({ id: swapperId });

  if (!user) {
    throw new NotFoundException(`User with id ${swapperId} not found`);
  }

  if (!user.isActive) {
    apiBadRequest(SwapsCodes.operatorInactive);
  }

  if (!swapOperatorTypes.has(user.type)) {
    apiBadRequest(SwapsCodes.operatorNotAllowed);
  }

  return user;
}