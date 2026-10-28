import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Battery, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service.js';
import { CreateBatteryDto } from './create-battery.dto.js';
import { UpdateBatteryDto } from './update-battery.dto.js';

@Injectable()
export class BatteriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Battery[]> {
    return this.prisma.battery.findMany({
      orderBy: { createdAt: 'desc' },
      include: { station: true },
    });
  }

  async findOne(id: number): Promise<Battery> {
    const battery = await this.prisma.battery.findUnique({
      where: { id },
      include: { station: true },
    });

    if (!battery) {
      throw new NotFoundException(`Battery with id ${id} not found`);
    }

    return battery;
  }

  async create(data: CreateBatteryDto): Promise<Battery> {
    const batteryData: Prisma.BatteryCreateInput = {
      serialNumber: data.serialNumber,
      manufacturer: data.manufacturer,
      model: data.model,
      batteryType: data.batteryType ?? 'lithium',
      status: data.status ?? 'available',
      soc: data.soc ?? 100,
      soh: data.soh ?? 100,
      station: data.stationId ? { connect: { id: data.stationId } } : undefined,
    };

    try {
      return await this.prisma.battery.create({
        data: batteryData,
        include: { station: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('A battery with this serial number already exists');
      }

      throw error;
    }
  }

  async update(id: number, data: UpdateBatteryDto): Promise<Battery> {
    await this.findOne(id);

    const updateData: Prisma.BatteryUpdateInput = {
      serialNumber: data.serialNumber,
      manufacturer: data.manufacturer,
      model: data.model,
      batteryType: data.batteryType,
      status: data.status,
      soc: data.soc,
      soh: data.soh,
      station: data.stationId !== undefined ? { connect: { id: data.stationId } } : undefined,
    };

    try {
      return await this.prisma.battery.update({
        where: { id },
        data: updateData,
        include: { station: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('A battery with this serial number already exists');
      }

      throw error;
    }
  }

  async remove(id: number): Promise<Battery> {
    await this.findOne(id);

    return this.prisma.battery.delete({ where: { id } });
  }
}
