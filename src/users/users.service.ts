import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { isUniqueViolation, withoutUndefined } from '../prisma/errors.js';
import type { User } from '../prisma/types.js';
import { PrismaService } from '../prisma.service.js';
import { CreateUserDto } from './create-user.dto.js';
import { UpdateUserDto } from './update-user.dto.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private userQuery() {
    return this.prisma.db.orm.public.User.include('role');
  }

  private async requireRole(roleId: number) {
    const role = await this.prisma.db.orm.public.Role.first({ id: roleId });

    if (!role) {
      throw new NotFoundException(`Role with id ${roleId} not found`);
    }
  }

  async findAll(): Promise<User[]> {
    return this.userQuery().orderBy((user) => user.createdAt.desc()).all();
  }

  async findOne(id: number): Promise<User> {
    const user = await this.userQuery().first({ id });

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return user;
  }

  async create(data: CreateUserDto): Promise<User> {
    await this.requireRole(data.roleId);

    try {
      return await this.prisma.db.orm.public.User.include('role').create({
        username: data.username,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        address: data.address,
        image: data.image,
        nationalId: data.nationalId,
        type: data.type,
        roleId: data.roleId,
        isActive: data.isActive ?? true,
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException(
          'A user with this email, username, phone, or national ID already exists',
        );
      }

      throw error;
    }
  }

  async update(id: number, data: UpdateUserDto): Promise<User> {
    await this.findOne(id);

    if (data.roleId !== undefined) {
      await this.requireRole(data.roleId);
    }

    try {
      const user = await this.userQuery()
        .where({ id })
        .update(
          withoutUndefined({
            username: data.username,
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            phone: data.phone,
            address: data.address,
            image: data.image,
            nationalId: data.nationalId,
            type: data.type,
            roleId: data.roleId,
            isActive: data.isActive,
          }),
        );

      if (!user) {
        throw new NotFoundException(`User with id ${id} not found`);
      }

      return user;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException(
          'A user with this email, username, phone, or national ID already exists',
        );
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
