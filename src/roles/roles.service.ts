import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { isUniqueViolation, withoutUndefined } from '../prisma/errors.js';
import type { Role } from '../prisma/types.js';
import { PrismaService } from '../prisma.service.js';
import { CreateRoleDto } from './create-role.dto.js';
import { UpdateRoleDto } from './update-role.dto.js';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Role[]> {
    return this.prisma.db.orm.public.Role.orderBy((role) => role.id.asc()).all();
  }

  async findOne(id: number): Promise<Role> {
    const role = await this.prisma.db.orm.public.Role.first({ id });

    if (!role) {
      throw new NotFoundException(`Role with id ${id} not found`);
    }

    return role;
  }

  async create(data: CreateRoleDto): Promise<Role> {
    try {
      return await this.prisma.db.orm.public.Role.create({
        name: data.name,
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException('A role with this name already exists');
      }

      throw error;
    }
  }

  async update(id: number, data: UpdateRoleDto): Promise<Role> {
    await this.findOne(id);

    try {
      const role = await this.prisma.db.orm.public.Role.where({ id }).update(
        withoutUndefined({
          name: data.name,
        }),
      );

      if (!role) {
        throw new NotFoundException(`Role with id ${id} not found`);
      }

      return role;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException('A role with this name already exists');
      }

      throw error;
    }
  }

  async remove(id: number): Promise<Role> {
    await this.findOne(id);

    const role = await this.prisma.db.orm.public.Role.where({ id }).delete();

    if (!role) {
      throw new NotFoundException(`Role with id ${id} not found`);
    }

    return role;
  }
}
