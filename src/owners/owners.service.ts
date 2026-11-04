import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { isUniqueViolation, withoutUndefined } from '../prisma/errors.js';
import type { Owner } from '../prisma/types.js';
import { PrismaService } from '../prisma.service.js';
import { CreateOwnerDto } from './create-owner.dto.js';
import { UpdateOwnerDto } from './update-owner.dto.js';

@Injectable()
export class OwnersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Owner[]> {
    return this.prisma.db.orm.public.Owner.orderBy((owner) => owner.createdAt.desc()).all();
  }

  async findOne(id: number): Promise<Owner> {
    const owner = await this.prisma.db.orm.public.Owner.first({ id });

    if (!owner) {
      throw new NotFoundException(`Owner with id ${id} not found`);
    }

    return owner;
  }

  async create(data: CreateOwnerDto): Promise<Owner> {
    try {
      return await this.prisma.db.orm.public.Owner.create({
        name: data.name,
        phone: data.phone,
        email: data.email,
        status: data.status ?? 'active',
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException('An owner with this email already exists');
      }

      throw error;
    }
  }

  async update(id: number, data: UpdateOwnerDto): Promise<Owner> {
    await this.findOne(id);

    try {
      const owner = await this.prisma.db.orm.public.Owner.where({ id }).update(
        withoutUndefined({
          name: data.name,
          phone: data.phone,
          email: data.email,
          status: data.status,
        }),
      );

      if (!owner) {
        throw new NotFoundException(`Owner with id ${id} not found`);
      }

      return owner;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException('An owner with this email already exists');
      }

      throw error;
    }
  }

  async remove(id: number): Promise<Owner> {
    await this.findOne(id);

    const owner = await this.prisma.db.orm.public.Owner.where({ id }).delete();

    if (!owner) {
      throw new NotFoundException(`Owner with id ${id} not found`);
    }

    return owner;
  }
}
