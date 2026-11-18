import type { PrismaService } from '../prisma.service.js';
import type { UserType } from '../prisma/types.js';
import { apiBadRequest } from '../errors/api-error.js';
import { FleetCodes } from '../errors/codes.js';

export async function assertRiderBelongsToOwner(
  prisma: PrismaService,
  riderUserId: number,
  ownerId: number,
): Promise<void> {
  const rider = await prisma.db.orm.public.User.first({ id: riderUserId });
  if (!rider) {
    apiBadRequest(FleetCodes.userNotFound, { params: { userId: riderUserId } });
  }
  if (rider.type !== 'rider' && rider.type !== 'owner') {
    apiBadRequest(FleetCodes.assignedMustBeRiderOrOwner);
  }
  if (rider.type === 'rider' && rider.ownerId !== ownerId) {
    apiBadRequest(FleetCodes.riderWrongOwner);
  }
  if (rider.type === 'owner') {
    const proprietor = await prisma.db.orm.public.Owner.first({ userId: riderUserId });
    if (!proprietor || proprietor.id !== ownerId) {
      apiBadRequest(FleetCodes.ownerAccountMismatch);
    }
  }
}

export function assertOwnerTypeInvariant(type: UserType, ownerId: number | null | undefined): void {
  if (type === 'rider' && ownerId == null) {
    apiBadRequest(FleetCodes.ridersRequireOwnerId);
  }
  if (type === 'owner' && ownerId != null) {
    apiBadRequest(FleetCodes.ownerPortalNoOwnerId);
  }
  if (type === 'agent' && ownerId != null) {
    apiBadRequest(FleetCodes.agentNoOwnerId);
  }
  if (type !== 'rider' && type !== 'owner' && ownerId != null) {
    apiBadRequest(FleetCodes.onlyRidersOwnerId);
  }
}