import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Bike, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service.js';
import { CreateBikeDto } from './create-bike.dto.js';
import { UpdateBikeDto } from './update-bike.dto.js';

@Injectable()
export class BikesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Bike[]> {
    return this.prisma.bike.findMany({
      orderBy: { createdAt: 'desc' },
      include: { owner: true, rider: true, currentBattery: true },
    });
  }

  async findOne(id: number): Promise<Bike> {
    const bike = await this.prisma.bike.findUnique({
      where: { id },
      include: { owner: true, rider: true, currentBattery: true },
    });

    if (!bike) {
      throw new NotFoundException(`Bike with id ${id} not found`);
    }

    return bike;
  }

  async create(data: CreateBikeDto): Promise<Bike> {
    const bikeData: Prisma.BikeCreateInput = {
      plateNumber: data.plateNumber,
      vin: data.vin,
      model: data.model,
      status: data.status ?? 'active',
      owner: data.ownerId ? { connect: { id: data.ownerId } } : undefined,
      rider: data.riderId ? { connect: { id: data.riderId } } : undefined,
      currentBattery: data.currentBatteryId
        ? { connect: { id: data.currentBatteryId } }
        : undefined,
    };

    try {
      return await this.prisma.bike.create({
        data: bikeData,
        include: { owner: true, rider: true, currentBattery: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('A bike with this plate number or VIN already exists');
      }

      throw error;
    }
  }

  async update(id: number, data: UpdateBikeDto): Promise<Bike> {
    await this.findOne(id);

    const updateData: Prisma.BikeUpdateInput = {
      plateNumber: data.plateNumber,
      vin: data.vin,
      model: data.model,
      status: data.status,
      owner: data.ownerId !== undefined ? { connect: { id: data.ownerId } } : undefined,
      rider: data.riderId !== undefined ? { connect: { id: data.riderId } } : undefined,
      currentBattery:
        data.currentBatteryId !== undefined
          ? { connect: { id: data.currentBatteryId } }
          : undefined,
    };

    try {
      return await this.prisma.bike.update({
        where: { id },
        data: updateData,
        include: { owner: true, rider: true, currentBattery: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('A bike with this plate number or VIN already exists');
      }

      throw error;
    }
  }

  async remove(id: number): Promise<Bike> {
    await this.findOne(id);

    return this.prisma.bike.delete({ where: { id } });
  }
}
