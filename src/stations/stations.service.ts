import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { isUniqueViolation, withoutUndefined } from '../prisma/errors.js';
import type { Station } from '../prisma/types.js';
import { PrismaService } from '../prisma.service.js';
import { CreateStationDto } from './create-station.dto.js';
import { formatStationCode, nextStationSequenceFromCodes } from './station-code.js';
import { UpdateStationDto } from './update-station.dto.js';

const CREATE_CODE_MAX_ATTEMPTS = 5;

@Injectable()
export class StationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Station[]> {
    return this.prisma.db.orm.public.Station.include('operators')
      .orderBy((station) => station.createdAt.desc())
      .all();
  }

  async findOne(id: number): Promise<Station> {
    const station = await this.prisma.db.orm.public.Station.include('operators').first({ id });

    if (!station) {
      throw new NotFoundException(`Station with id ${id} not found`);
    }

    return station;
  }

  async previewNextCode(): Promise<{ code: string }> {
    const code = await this.allocateNextStationCode();
    return { code };
  }

  async create(data: CreateStationDto): Promise<Station> {
    for (let attempt = 0; attempt < CREATE_CODE_MAX_ATTEMPTS; attempt++) {
      const code = await this.allocateNextStationCode();

      try {
        return await this.prisma.db.orm.public.Station.create({
          code,
          name: data.name,
          address: data.address,
          latitude: data.latitude,
          longitude: data.longitude,
          status: data.status ?? 'active',
          capacity: data.capacity ?? 0,
        });
      } catch (error) {
        if (isUniqueViolation(error) && attempt < CREATE_CODE_MAX_ATTEMPTS - 1) {
          continue;
        }

        if (isUniqueViolation(error)) {
          throw new BadRequestException('Could not assign a unique station code; try again');
        }

        throw error;
      }
    }

    throw new BadRequestException('Could not assign a unique station code; try again');
  }

  async update(id: number, data: UpdateStationDto): Promise<Station> {
    await this.findOne(id);

    try {
      const station = await this.prisma.db.orm.public.Station.where({ id }).update(
        withoutUndefined({
          name: data.name,
          address: data.address,
          latitude: data.latitude,
          longitude: data.longitude,
          status: data.status,
          capacity: data.capacity,
        }),
      );

      if (!station) {
        throw new NotFoundException(`Station with id ${id} not found`);
      }

      return station;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException('A station with this code already exists');
      }

      throw error;
    }
  }

  async remove(id: number): Promise<Station> {
    await this.findOne(id);

    const station = await this.prisma.db.orm.public.Station.where({ id }).delete();

    if (!station) {
      throw new NotFoundException(`Station with id ${id} not found`);
    }

    return station;
  }

  private async allocateNextStationCode(): Promise<string> {
    const stations = await this.prisma.db.orm.public.Station.all();

    try {
      const sequence = nextStationSequenceFromCodes(stations.map((station) => station.code));
      return formatStationCode(sequence);
    } catch (error) {
      if (error instanceof RangeError) {
        throw new BadRequestException(error.message);
      }

      throw error;
    }
  }
}
