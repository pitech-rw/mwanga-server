import type { PrismaService } from '../prisma.service.js';
import { apiBadRequest } from '../errors/api-error.js';
import { UsersCodes } from '../errors/codes.js';

/** Blocks linking an inactive account to stations, fleet, bikes, cards, agents, or owner portal. */
export async function assertUserActiveForAssignment(
  prisma: PrismaService,
  userId: number,
): Promise<void> {
  const user = await prisma.db.orm.public.User.first({ id: userId });
  if (!user) {
    apiBadRequest(UsersCodes.userNotFound, { params: { userId } });
  }
  if (!user.isActive) {
    apiBadRequest(UsersCodes.inactiveAccount, { params: { userId } });
  }
}