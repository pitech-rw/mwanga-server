import { NotFoundException } from '@nestjs/common';
import { apiBadRequest } from '../errors/api-error.js';
import { FleetCodes } from '../errors/codes.js';
import type { PrismaService } from '../prisma.service.js';

export async function resolveWalletForBikeOwner(prisma: PrismaService, bikeId: number) {
  const bike = await prisma.db.orm.public.Bike.where({ id: bikeId }).first();
  if (!bike) {
    throw new NotFoundException(`Bike with id ${bikeId} not found`);
  }

  const wallet = await prisma.db.orm.public.Wallet.where({ ownerId: bike.ownerId }).first();
  if (!wallet) {
    apiBadRequest(FleetCodes.ownerWalletMissing);
  }

  return { bike, wallet };
}
