import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { isUniqueViolation, withoutUndefined } from '../prisma/errors.js';
import type { Station } from '../prisma/types.js';
import { PrismaService } from '../prisma.service.js';
import { CreateStationDto } from './create-station.dto.js';
import { UpdateStationDto } from './update-station.dto.js';

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

  async create(data: CreateStationDto): Promise<Station> {
    try {
      return await this.prisma.db.orm.public.Station.create({
        code: data.code,
        name: data.name,
        latitude: data.latitude,
        longitude: data.longitude,
        status: data.status ?? 'active',
        capacity: data.capacity ?? 0,
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException('A station with this code already exists');
      }

      throw error;
    }
  }

  async update(id: number, data: UpdateStationDto): Promise<Station> {
    await this.findOne(id);

    try {
      const station = await this.prisma.db.orm.public.Station.where({ id }).update(
        withoutUndefined({
          code: data.code,
          name: data.name,
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
}
