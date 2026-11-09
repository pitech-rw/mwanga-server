import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma.service.js';

export async function requireRiderUser(prisma: PrismaService, userId: number) {
  const user = await prisma.db.orm.public.User.where({ id: userId })
    .include('nfcCards')
    .first();

  if (!user) {
    throw new NotFoundException(`User with id ${userId} not found`);
  }

  if (user.type !== 'rider') {
    throw new BadRequestException('User is not a rider account');
  }

  if (!user.isActive) {
    throw new BadRequestException('Rider account is not active');
  }

  return user;
}
