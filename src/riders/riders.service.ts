import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { isUniqueViolation, withoutUndefined } from '../prisma/errors.js';
import type { Rider } from '../prisma/types.js';
import { PrismaService } from '../prisma.service.js';
import { CreateRiderDto } from './create-rider.dto.js';
import { UpdateRiderDto } from './update-rider.dto.js';

@Injectable()
export class RidersService {
  constructor(private readonly prisma: PrismaService) {}

  private riderQuery() {
    return this.prisma.db.orm.public.Rider.include('owner').include('wallet');
  }

  async findAll() {
    return this.riderQuery().orderBy((rider) => rider.createdAt.desc()).all();
  }

  async findOne(id: number) {
    const rider = await this.riderQuery().first({ id });

    if (!rider) {
      throw new NotFoundException(`Rider with id ${id} not found`);
    }

    return rider;
  }

  async create(data: CreateRiderDto): Promise<Rider> {
    try {
      const rider = await this.prisma.db.orm.public.Rider.include('owner').create({
        fullName: data.fullName,
        phone: data.phone,
        idNumber: data.idNumber,
        kycStatus: data.kycStatus ?? 'pending',
        status: data.status ?? 'active',
        ownerId: data.ownerId,
      });

      return rider;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException('A rider with this phone or ID already exists');
      }

      throw error;
    }
  }

  async update(id: number, data: UpdateRiderDto): Promise<Rider> {
    await this.findOne(id);

    try {
      const rider = await this.prisma.db.orm.public.Rider.where({ id })
        .include('owner')
        .update(
          withoutUndefined({
            fullName: data.fullName,
            phone: data.phone,
            idNumber: data.idNumber,
            kycStatus: data.kycStatus,
            status: data.status,
            ownerId: data.ownerId,
          }),
        );

      if (!rider) {
        throw new NotFoundException(`Rider with id ${id} not found`);
      }

      return rider;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException('A rider with this phone or ID already exists');
      }

      throw error;
    }
  }

  async remove(id: number): Promise<Rider> {
    await this.findOne(id);

    const rider = await this.prisma.db.orm.public.Rider.where({ id }).delete();

    if (!rider) {
      throw new NotFoundException(`Rider with id ${id} not found`);
    }

    return rider;
  }
}
