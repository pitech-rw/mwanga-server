import { VISIBLE_USER_WHERE } from './erasure.constants.js';
import type { PrismaService } from '../prisma.service.js';

/** User ids that may appear in directory APIs (`erasedAt` is null). */
export async function loadVisibleUserIds(prisma: PrismaService): Promise<Set<number>> {
  const users = await prisma.db.orm.public.User.where(VISIBLE_USER_WHERE).all();
  return new Set(users.map((user) => user.id));
}