import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { isUniqueViolation, withoutUndefined } from '../prisma/errors.js';
import type { Bike } from '../prisma/types.js';
import { PrismaService } from '../prisma.service.js';
import { CreateBikeDto } from './create-bike.dto.js';
import { UpdateBikeDto } from './update-bike.dto.js';

@Injectable()
export class BikesService {
  constructor(private readonly prisma: PrismaService) {}

  private bikeQuery() {
    return this.prisma.db.orm.public.Bike.include('owner').include('user').include('currentBattery');
  }

  async findAll() {
    return this.bikeQuery().orderBy((bike) => bike.createdAt.desc()).all();
  }

  async findOne(id: number) {
    const bike = await this.bikeQuery().first({ id });

    if (!bike) {
      throw new NotFoundException(`Bike with id ${id} not found`);
    }

    return bike;
  }

  async create(data: CreateBikeDto): Promise<Bike> {
    try {
      return await this.prisma.db.orm.public.Bike.include('owner')
        .include('user')
        .include('currentBattery')
        .create({
          plateNumber: data.plateNumber,
          chassisNumber: data.chassisNumber,
          serialNumber: data.serialNumber,
          model: data.model,
          image: data.image,
          status: data.status ?? 'active',
          ownerId: data.ownerId,
          userId: data.userId,
          currentBatteryId: data.currentBatteryId,
        });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException(
          'A bike with this plate number, chassis number, serial number, or current battery already exists',
        );
      }

      throw error;
    }
  }

  async update(id: number, data: UpdateBikeDto): Promise<Bike> {
    await this.findOne(id);

    try {
      const bike = await this.prisma.db.orm.public.Bike.where({ id })
        .include('owner')
        .include('user')
        .include('currentBattery')
        .update(
          withoutUndefined({
            plateNumber: data.plateNumber,
            chassisNumber: data.chassisNumber,
            serialNumber: data.serialNumber,
            model: data.model,
            image: data.image,
            status: data.status,
            ownerId: data.ownerId,
            userId: data.userId,
            currentBatteryId: data.currentBatteryId,
          }),
        );

      if (!bike) {
        throw new NotFoundException(`Bike with id ${id} not found`);
      }

      return bike;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException(
          'A bike with this plate number, chassis number, serial number, or current battery already exists',
        );
      }

      throw error;
    }
  }

  async remove(id: number): Promise<Bike> {
    await this.findOne(id);

    const bike = await this.prisma.db.orm.public.Bike.where({ id }).delete();

    if (!bike) {
      throw new NotFoundException(`Bike with id ${id} not found`);
    }

    return bike;
  }
}
