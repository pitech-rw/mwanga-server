import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { ReadScopeContext } from '../auth/read-scope.js';
import { assertCanReadUserId, isUnrestrictedRead } from '../auth/read-scope.js';
import type { UserTypeName } from '../auth/permission-catalog.js';
import { resolveRoleIdForType } from '../auth/user-type-alignment.js';
import { hashPassword } from '../auth/password.js';
import { sanitizeUser } from '../auth/sanitize-user.js';
import { isUniqueViolation, withoutUndefined } from '../prisma/errors.js';
import type { SafeUser, UserType } from '../prisma/types.js';
import { PrismaService } from '../prisma.service.js';
import { CreateUserDto } from './create-user.dto.js';
import { resolveSwapperStationId } from './swapper-station-assignment.js';
import { UpdateUserDto } from './update-user.dto.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private userQuery() {
    return this.prisma.db.orm.public.User.include('role').include('assignedStation');
  }

  async findAll(ctx: ReadScopeContext, filters?: { type?: UserType }): Promise<SafeUser[]> {
    if (!isUnrestrictedRead(ctx)) {
      const self = await this.userQuery().first({ id: ctx.user.sub });

      if (!self) {
        throw new NotFoundException(`User with id ${ctx.user.sub} not found`);
      }

      return [sanitizeUser(self)];
    }

    const base =
      filters?.type !== undefined ? this.userQuery().where({ type: filters.type }) : this.userQuery();
    const users = await base.orderBy((user) => user.createdAt.desc()).all();
    return users.map((user) => sanitizeUser(user));
  }

  async findOne(id: number, ctx: ReadScopeContext): Promise<SafeUser> {
    assertCanReadUserId(ctx, id);

    const user = await this.userQuery().first({ id });

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return sanitizeUser(user);
  }

  async create(data: CreateUserDto): Promise<SafeUser> {
    const roleId = await resolveRoleIdForType(this.prisma, data.type as UserTypeName);
    const passwordHash = await hashPassword(data.password);
    const stationId = await resolveSwapperStationId(this.prisma, {
      type: data.type as UserTypeName,
      stationId: data.stationId ?? null,
    });

    try {
      const user = await this.userQuery().create({
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
        stationId: stationId ?? null,
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

  async update(id: number, data: UpdateUserDto, ctx: ReadScopeContext): Promise<SafeUser> {
    await this.findOne(id, ctx);

    const existing = await this.prisma.db.orm.public.User.first({ id });
    if (!existing) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    let roleId: number | undefined;
    const nextType = (data.type ?? existing.type) as UserTypeName;
    if (data.type !== undefined) {
      roleId = await resolveRoleIdForType(this.prisma, data.type as UserTypeName);
    }

    let stationId: number | null | undefined;
    if (data.type !== undefined && data.type !== 'swapper') {
      stationId = null;
    } else if (data.stationId !== undefined) {
      stationId = await resolveSwapperStationId(this.prisma, {
        type: nextType,
        stationId: data.stationId,
      });
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
            stationId,
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

  async remove(id: number, ctx: ReadScopeContext): Promise<SafeUser> {
    await this.findOne(id, ctx);

    const user = await this.prisma.db.orm.public.User.where({ id }).delete();

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return sanitizeUser(user);
  }
}
