import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma.service.js';

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
      throw new BadRequestException('Rider is not assigned to an owner fleet');
    }
  } else if (user.type === 'owner') {
    if (!user.proprietorOwner) {
      throw new BadRequestException('Owner user is not linked to an owner record');
    }
  } else {
    throw new BadRequestException('User cannot operate swaps for this account');
  }

  if (!user.isActive) {
    throw new BadRequestException('User account is not active');
  }

  return user;
}
