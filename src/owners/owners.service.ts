import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Owner, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service.js';
import { CreateOwnerDto } from './create-owner.dto.js';
import { UpdateOwnerDto } from './update-owner.dto.js';

@Injectable()
export class OwnersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Owner[]> {
    return this.prisma.owner.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number): Promise<Owner> {
    const owner = await this.prisma.owner.findUnique({ where: { id } });

    if (!owner) {
      throw new NotFoundException(`Owner with id ${id} not found`);
    }

    return owner;
  }

  async create(data: CreateOwnerDto): Promise<Owner> {
    const ownerData: Prisma.OwnerCreateInput = {
      name: data.name,
      phone: data.phone,
      email: data.email,
      status: data.status ?? 'active',
    };

    try {
      return await this.prisma.owner.create({ data: ownerData });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('An owner with this email already exists');
      }

      throw error;
    }
  }

  async update(id: number, data: UpdateOwnerDto): Promise<Owner> {
    await this.findOne(id);

    try {
      return await this.prisma.owner.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('An owner with this email already exists');
      }

      throw error;
    }
  }

  async remove(id: number): Promise<Owner> {
    await this.findOne(id);

    return this.prisma.owner.delete({ where: { id } });
  }
}
