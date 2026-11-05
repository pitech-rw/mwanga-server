import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { UserTypeName } from '../auth/permission-catalog.js';
import { resolveRoleIdForType } from '../auth/user-type-alignment.js';
import { hashPassword } from '../auth/password.js';
import { sanitizeUser } from '../auth/sanitize-user.js';
import { isUniqueViolation, withoutUndefined } from '../prisma/errors.js';
import type { SafeUser, UserType } from '../prisma/types.js';
import { PrismaService } from '../prisma.service.js';
import { CreateUserDto } from './create-user.dto.js';
import { UpdateUserDto } from './update-user.dto.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private userQuery() {
    return this.prisma.db.orm.public.User.include('role');
  }

  async findAll(): Promise<SafeUser[]> {
    const users = await this.userQuery().orderBy((user) => user.createdAt.desc()).all();
    return users.map((user) => sanitizeUser(user));
  }

  async findOne(id: number): Promise<SafeUser> {
    const user = await this.userQuery().first({ id });

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return sanitizeUser(user);
  }

  async create(data: CreateUserDto): Promise<SafeUser> {
    const roleId = await resolveRoleIdForType(this.prisma, data.type as UserTypeName);
    const passwordHash = await hashPassword(data.password);

    try {
      const user = await this.prisma.db.orm.public.User.include('role').create({
        username: data.username,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email.trim().toLowerCase(),
        phone: data.phone,
        address: data.address,
        image: data.image,
        nationalId: data.nationalId,
        type: data.type as UserType,
        roleId,
        kycStatus: data.kycStatus ?? 'pending',
        isActive: data.isActive ?? true,
        passwordHash,
      });
      return sanitizeUser(user);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException(
          'A user with this email, username, phone, or national ID already exists',
        );
      }

      throw error;
    }
  }

  async update(id: number, data: UpdateUserDto): Promise<SafeUser> {
    await this.findOne(id);

    let roleId: number | undefined;
    if (data.type !== undefined) {
      roleId = await resolveRoleIdForType(this.prisma, data.type as UserTypeName);
    }

    let passwordHash: string | undefined;
    if (data.password !== undefined) {
      passwordHash = await hashPassword(data.password);
    }

    try {
      const user = await this.userQuery()
        .where({ id })
        .update(
          withoutUndefined({
            username: data.username,
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email?.trim().toLowerCase(),
            phone: data.phone,
            address: data.address,
            image: data.image,
            nationalId: data.nationalId,
            type: data.type as UserType | undefined,
            roleId,
            kycStatus: data.kycStatus,
            isActive: data.isActive,
            passwordHash,
          }),
        );

      if (!user) {
        throw new NotFoundException(`User with id ${id} not found`);
      }

      return sanitizeUser(user);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException(
          'A user with this email, username, phone, or national ID already exists',
        );
      }

      throw error;
    }
  }

  async remove(id: number): Promise<SafeUser> {
    await this.findOne(id);

    const user = await this.prisma.db.orm.public.User.where({ id }).delete();

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return sanitizeUser(user);
  }
}
