import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../prisma.service.js';
import type { UserType } from '../prisma/types.js';

export async function assertRiderBelongsToOwner(
  prisma: PrismaService,
  riderUserId: number,
  ownerId: number,
): Promise<void> {
  const rider = await prisma.db.orm.public.User.first({ id: riderUserId });
  if (!rider) {
    throw new BadRequestException(`User with id ${riderUserId} not found`);
  }
  if (rider.type !== 'rider' && rider.type !== 'owner') {
    throw new BadRequestException('Assigned user must be a rider or owner account');
  }
  if (rider.type === 'rider' && rider.ownerId !== ownerId) {
    throw new BadRequestException('Rider does not belong to this bike owner');
  }
  if (rider.type === 'owner') {
    const proprietor = await prisma.db.orm.public.Owner.first({ userId: riderUserId });
    if (!proprietor || proprietor.id !== ownerId) {
      throw new BadRequestException('Owner account does not match this bike owner');
    }
  }
}

export function assertOwnerTypeInvariant(type: UserType, ownerId: number | null | undefined): void {
  if (type === 'rider' && ownerId == null) {
    throw new BadRequestException('Riders must be assigned to an owner fleet (ownerId)');
  }
  if (type === 'owner' && ownerId != null) {
    throw new BadRequestException('Owner portal accounts must not set ownerId; link via Owner.userId');
  }
  if (type === 'agent' && ownerId != null) {
    throw new BadRequestException('Agent accounts must not have ownerId set');
  }
  if (type !== 'rider' && type !== 'owner' && ownerId != null) {
    throw new BadRequestException('Only riders may have ownerId set');
  }
}
