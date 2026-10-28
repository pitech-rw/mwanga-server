import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Rider } from '@prisma/client';
import { PrismaService } from '../prisma.service.js';
import { CreateRiderDto } from './create-rider.dto.js';
import { UpdateRiderDto } from './update-rider.dto.js';

@Injectable()
export class RidersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Rider[]> {
    return this.prisma.rider.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        owner: true,
        wallet: true,
      },
    });
  }

  async findOne(id: number): Promise<Rider> {
    const rider = await this.prisma.rider.findUnique({
      where: { id },
      include: {
        owner: true,
        wallet: true,
      },
    });

    if (!rider) {
      throw new NotFoundException(`Rider with id ${id} not found`);
    }

    return rider;
  }

  async create(data: CreateRiderDto): Promise<Rider> {
    const riderData: Prisma.RiderCreateInput = {
      fullName: data.fullName,
      phone: data.phone,
      idNumber: data.idNumber,
      kycStatus: data.kycStatus ?? 'pending',
      status: data.status ?? 'active',
      owner: data.ownerId
        ? { connect: { id: data.ownerId } }
        : undefined,
    };

    try {
      return await this.prisma.rider.create({
        data: riderData,
        include: { owner: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('A rider with this phone or ID already exists');
      }

      throw error;
    }
  }

  async update(id: number, data: UpdateRiderDto): Promise<Rider> {
    await this.findOne(id);

    const updateData: Prisma.RiderUpdateInput = {
      fullName: data.fullName,
      phone: data.phone,
      idNumber: data.idNumber,
      kycStatus: data.kycStatus,
      status: data.status,
      owner: data.ownerId !== undefined ? { connect: { id: data.ownerId } } : undefined,
    };

    try {
      return await this.prisma.rider.update({
        where: { id },
        data: updateData,
        include: { owner: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('A rider with this phone or ID already exists');
      }

      throw error;
    }
  }

  async remove(id: number): Promise<Rider> {
    await this.findOne(id);

    return this.prisma.rider.delete({ where: { id } });
  }
}
