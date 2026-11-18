import type { PrismaService } from '../prisma.service.js';
import { apiBadRequest } from '../errors/api-error.js';
import { UsersCodes } from '../errors/codes.js';

export async function resolveSwapperStationId(
  prisma: PrismaService,
  params: { type: string; stationId: number | null | undefined },
): Promise<number | null> {
  const { type, stationId } = params;

  if (stationId == null) {
    return null;
  }

  if (type !== 'swapper') {
    apiBadRequest(UsersCodes.swapperStationOnly);
  }

  const station = await prisma.db.orm.public.Station.first({ id: stationId });

  if (!station) {
    apiBadRequest(UsersCodes.stationNotFound, { params: { stationId } });
  }

  return stationId;
}