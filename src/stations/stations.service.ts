import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Station } from '@prisma/client';
import { PrismaService } from '../prisma.service.js';
import { CreateStationDto } from './create-station.dto.js';
import { UpdateStationDto } from './update-station.dto.js';

@Injectable()
export class StationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Station[]> {
    return this.prisma.station.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number): Promise<Station> {
    const station = await this.prisma.station.findUnique({ where: { id } });

    if (!station) {
      throw new NotFoundException(`Station with id ${id} not found`);
    }

    return station;
  }

  async create(data: CreateStationDto): Promise<Station> {
    const stationData: Prisma.StationCreateInput = {
      code: data.code,
      name: data.name,
      type: data.type,
      model: data.model,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      latitude: data.latitude,
      longitude: data.longitude,
      address: data.address,
      status: data.status ?? 'active',
      capacity: data.capacity ?? 0,
    };

    try {
      return await this.prisma.station.create({ data: stationData });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('A station with this code already exists');
      }

      throw error;
    }
  }

  async update(id: number, data: UpdateStationDto): Promise<Station> {
    await this.findOne(id);

    try {
      return await this.prisma.station.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('A station with this code already exists');
      }

      throw error;
    }
  }

  async remove(id: number): Promise<Station> {
    await this.findOne(id);

    return this.prisma.station.delete({ where: { id } });
  }
}
