import type { PrismaService } from '../prisma.service.js';

/** Bike IDs that appear in swap transactions at this station (for swapper visibility). */
export async function bikeIdsSeenAtStation(
  prisma: PrismaService,
  stationId: number,
): Promise<number[]> {
  const swaps = await prisma.db.orm.public.SwapTransaction.where({ stationId }).all();
  const ids = new Set<number>();
  for (const s of swaps) {
    ids.add(s.bikeId);
  }
  return [...ids];
}

/** NFC card IDs that appear in swap transactions at this station (for swapper visibility). */
export async function cardIdsSeenAtStation(
  prisma: PrismaService,
  stationId: number,
): Promise<number[]> {
  const swaps = await prisma.db.orm.public.SwapTransaction.where({ stationId }).all();
  const ids = new Set<number>();
  for (const s of swaps) {
    ids.add(s.cardId);
  }
  return [...ids];
}
