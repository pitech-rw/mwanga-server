import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { isUniqueViolation, withoutUndefined } from '../prisma/errors.js';
import type { Battery } from '../prisma/types.js';
import { PrismaService } from '../prisma.service.js';
import { CreateBatteryDto } from './create-battery.dto.js';
import { UpdateBatteryDto } from './update-battery.dto.js';

@Injectable()
export class BatteriesService {
  constructor(private readonly prisma: PrismaService) {}

  private batteryQuery() {
    return this.prisma.db.orm.public.Battery.include('station');
  }

  async findAll() {
    return this.batteryQuery().orderBy((battery) => battery.createdAt.desc()).all();
  }

  async findOne(id: number) {
    const battery = await this.batteryQuery().first({ id });

    if (!battery) {
      throw new NotFoundException(`Battery with id ${id} not found`);
    }

    return battery;
  }

  async create(data: CreateBatteryDto): Promise<Battery> {
    try {
      return await this.prisma.db.orm.public.Battery.include('station').create({
        serialNumber: data.serialNumber,
        manufacturer: data.manufacturer,
        oem: data.oem,
        model: data.model,
        batteryType: data.batteryType ?? 'lithium',
        status: data.status ?? 'available',
        soc: data.soc ?? 100,
        soh: data.soh ?? 100,
        cycleCount: data.cycleCount ?? 0,
        voltage: data.voltage,
        stationId: data.stationId,
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException('A battery with this serial number already exists');
      }

      throw error;
    }
  }

  async update(id: number, data: UpdateBatteryDto): Promise<Battery> {
    await this.findOne(id);

    try {
      const battery = await this.prisma.db.orm.public.Battery.where({ id })
        .include('station')
        .update(
          withoutUndefined({
            serialNumber: data.serialNumber,
            manufacturer: data.manufacturer,
            oem: data.oem,
            model: data.model,
            batteryType: data.batteryType,
            status: data.status,
            soc: data.soc,
            soh: data.soh,
            cycleCount: data.cycleCount,
            voltage: data.voltage,
            stationId: data.stationId,
          }),
        );

      if (!battery) {
        throw new NotFoundException(`Battery with id ${id} not found`);
      }

      return battery;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException('A battery with this serial number already exists');
      }

      throw error;
    }
  }

  async remove(id: number): Promise<Battery> {
    await this.findOne(id);

    const battery = await this.prisma.db.orm.public.Battery.where({ id }).delete();

    if (!battery) {
      throw new NotFoundException(`Battery with id ${id} not found`);
    }

    return battery;
  }
}
