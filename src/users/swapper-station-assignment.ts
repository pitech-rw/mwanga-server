import { BadRequestException } from '@nestjs/common';
import type { UserTypeName } from '../auth/permission-catalog.js';
import type { PrismaService } from '../prisma.service.js';

export async function resolveSwapperStationId(
  prisma: PrismaService,
  options: {
    type: UserTypeName;
    stationId: number | null | undefined;
  },
): Promise<number | null | undefined> {
  const { type, stationId } = options;

  if (stationId === undefined) {
    return undefined;
  }

  if (type !== 'swapper') {
    if (stationId !== null) {
      throw new BadRequestException('Only swapper users can be assigned to a station');
    }
    return null;
  }

  if (stationId === null) {
    return null;
  }

  const station = await prisma.db.orm.public.Station.first({ id: stationId });
  if (!station) {
    throw new BadRequestException(`Station with id ${stationId} not found`);
  }

  return stationId;
}
