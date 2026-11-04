import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { isUniqueViolation, withoutUndefined } from '../prisma/errors.js';
import type { User } from '../prisma/types.js';
import { PrismaService } from '../prisma.service.js';
import { CreateUserDto } from './create-user.dto.js';
import { UpdateUserDto } from './update-user.dto.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<User[]> {
    return this.prisma.db.orm.public.User.orderBy((user) => user.createdAt.desc()).all();
  }

  async findOne(id: number): Promise<User> {
    const user = await this.prisma.db.orm.public.User.first({ id });

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return user;
  }

  async create(data: CreateUserDto): Promise<User> {
    try {
      return await this.prisma.db.orm.public.User.create({
        name: data.name,
        email: data.email,
        role: data.role,
        isActive: data.isActive ?? true,
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException('A user with this email already exists');
      }

      throw error;
    }
  }

  async update(id: number, data: UpdateUserDto): Promise<User> {
    await this.findOne(id);

    try {
      const user = await this.prisma.db.orm.public.User.where({ id }).update(
        withoutUndefined({
          name: data.name,
          email: data.email,
          role: data.role,
          isActive: data.isActive,
        }),
      );

      if (!user) {
        throw new NotFoundException(`User with id ${id} not found`);
      }

      return user;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException('A user with this email already exists');
      }

      throw error;
    }
  }

  async remove(id: number): Promise<User> {
    await this.findOne(id);

    const user = await this.prisma.db.orm.public.User.where({ id }).delete();

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return user;
  }
}
