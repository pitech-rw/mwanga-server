import { NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma.service.js';
import { apiBadRequest } from '../errors/api-error.js';
import { SwapsCodes } from '../errors/codes.js';

export async function requireRiderUser(prisma: PrismaService, userId: number) {
  const user = await prisma.db.orm.public.User.where({ id: userId })
    .include('nfcCards')
    .first();

  if (!user) {
    throw new NotFoundException(`User with id ${userId} not found`);
  }

  if (user.type !== 'rider') {
    apiBadRequest(SwapsCodes.riderAccountRequired);
  }

  if (!user.isActive) {
    apiBadRequest(SwapsCodes.riderInactive);
  }

  return user;
}