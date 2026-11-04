import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma.service.js';

const swapOperatorTypes = new Set(['swapper', 'office', 'agent']);

export async function requireSwapper(prisma: PrismaService, swapperId: number) {
  const user = await prisma.db.orm.public.User.first({ id: swapperId });

  if (!user) {
    throw new NotFoundException(`User with id ${swapperId} not found`);
  }

  if (!user.isActive) {
    throw new BadRequestException('Swap operator account is not active');
  }

  if (!swapOperatorTypes.has(user.type)) {
    throw new BadRequestException('User is not allowed to operate swaps');
  }

  return user;
}
