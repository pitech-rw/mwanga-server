import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma.service.js';

export async function resolveWalletForBikeOwner(prisma: PrismaService, bikeId: number) {
  const bike = await prisma.db.orm.public.Bike.where({ id: bikeId }).first();
  if (!bike) {
    throw new NotFoundException(`Bike with id ${bikeId} not found`);
  }

  const wallet = await prisma.db.orm.public.Wallet.where({ ownerId: bike.ownerId }).first();
  if (!wallet) {
    throw new BadRequestException('Owner wallet not found for payment capture');
  }

  return { bike, wallet };
}
