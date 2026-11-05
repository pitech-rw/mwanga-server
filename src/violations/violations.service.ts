import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { isUniqueViolation, withoutUndefined } from '../prisma/errors.js';
import type { ViolationSeverity, ViolationStatus } from '../prisma/types.js';
import { PrismaService } from '../prisma.service.js';
import { CreateViolationDto } from './create-violation.dto.js';
import { UpdateViolationDto } from './update-violation.dto.js';

@Injectable()
export class ViolationsService {
  constructor(private readonly prisma: PrismaService) {}

  private violationQuery() {
    return this.prisma.db.orm.public.Violation.include('reporter')
      .include('offender')
      .include('station');
  }

  async findAll() {
    return this.violationQuery().orderBy((violation) => violation.createdAt.desc()).all();
  }

  async findOne(id: number) {
    const violation = await this.violationQuery().first({ id });

    if (!violation) {
      throw new NotFoundException(`Violation with id ${id} not found`);
    }

    return violation;
  }

  private async assertUserExists(id: number, label: string) {
    const user = await this.prisma.db.orm.public.User.first({ id });

    if (!user) {
      throw new BadRequestException(`${label} with id ${id} not found`);
    }
  }

  private async assertStationExists(id: number) {
    const station = await this.prisma.db.orm.public.Station.first({ id });

    if (!station) {
      throw new BadRequestException(`Station with id ${id} not found`);
    }
  }

  async create(data: CreateViolationDto) {
    await this.assertUserExists(data.reporterId, 'Reporter');
    await this.assertUserExists(data.offenderId, 'Offender');

    if (data.stationId !== undefined) {
      await this.assertStationExists(data.stationId);
    }

    try {
      return await this.violationQuery().create({
        trackId: data.trackId,
        title: data.title,
        reason: data.reason,
        image: data.image,
        status: (data.status ?? 'open') as ViolationStatus,
        severity: (data.severity ?? 'medium') as ViolationSeverity,
        occurredAt: new Date(data.occurredAt),
        stationId: data.stationId,
        reporterId: data.reporterId,
        offenderId: data.offenderId,
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException('A violation with this track ID already exists');
      }

      throw error;
    }
  }

  async update(id: number, data: UpdateViolationDto) {
    await this.findOne(id);

    if (data.reporterId !== undefined) {
      await this.assertUserExists(data.reporterId, 'Reporter');
    }

    if (data.offenderId !== undefined) {
      await this.assertUserExists(data.offenderId, 'Offender');
    }

    if (data.stationId !== undefined) {
      await this.assertStationExists(data.stationId);
    }

    try {
      const violation = await this.prisma.db.orm.public.Violation.where({ id })
        .include('reporter')
        .include('offender')
        .include('station')
        .update(
          withoutUndefined({
            trackId: data.trackId,
            title: data.title,
            reason: data.reason,
            image: data.image,
            status: data.status as ViolationStatus | undefined,
            severity: data.severity as ViolationSeverity | undefined,
            occurredAt: data.occurredAt === undefined ? undefined : new Date(data.occurredAt),
            stationId: data.stationId,
            reporterId: data.reporterId,
            offenderId: data.offenderId,
          }),
        );

      if (!violation) {
        throw new NotFoundException(`Violation with id ${id} not found`);
      }

      return violation;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException('A violation with this track ID already exists');
      }

      throw error;
    }
  }

  async remove(id: number) {
    await this.findOne(id);

    const violation = await this.prisma.db.orm.public.Violation.where({ id }).delete();

    if (!violation) {
      throw new NotFoundException(`Violation with id ${id} not found`);
    }

    return violation;
  }
}
