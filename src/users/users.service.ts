import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { ReadScopeContext } from '../auth/read-scope.js';
import { assertCanReadUserId, isUnrestrictedRead } from '../auth/read-scope.js';
import { assertOwnerTypeInvariant } from '../fleet/fleet-rules.js';
import {
  assertUserInFleet,
  resolveFleetOwnerId,
} from '../fleet/resolve-fleet.js';
import { asNumeric } from '../prisma/errors.js';
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
    return this.prisma.db.orm.public.User.include('role')
      .include('assignedStation')
      .include('fleetOwner');
  }

  async findAll(ctx: ReadScopeContext, filters?: { type?: UserType }): Promise<SafeUser[]> {
    if (ctx.user.type === 'owner' && !isUnrestrictedRead(ctx)) {
      const fleetOwnerId = await resolveFleetOwnerId(
        this.prisma,
        ctx.user.sub,
        'owner',
      );
      const users = await this.userQuery()
        .where({ ownerId: fleetOwnerId })
        .orderBy((user) => user.createdAt.desc())
        .all();
      const proprietor = await this.userQuery().first({ id: ctx.user.sub });
      const list = proprietor ? [sanitizeUser(proprietor), ...users.map((u) => sanitizeUser(u))] : users.map((u) => sanitizeUser(u));
      return list;
    }

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
    if (ctx.user.type === 'owner' && !isUnrestrictedRead(ctx)) {
      const fleetOwnerId = await resolveFleetOwnerId(
        this.prisma,
        ctx.user.sub,
        'owner',
      );
      if (id !== ctx.user.sub) {
        await assertUserInFleet(this.prisma, fleetOwnerId, id);
      }
    } else {
      assertCanReadUserId(ctx, id);
    }

    const user = await this.userQuery().first({ id });

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return sanitizeUser(user);
  }

  async create(data: CreateUserDto): Promise<SafeUser> {
    assertOwnerTypeInvariant(data.type as UserType, data.ownerId ?? null);

    if (data.type === 'rider') {
      if (data.ownerId == null) {
        throw new BadRequestException('Riders must be assigned to an owner (ownerId)');
      }
      const owner = await this.prisma.db.orm.public.Owner.first({ id: data.ownerId });
      if (!owner) {
        throw new BadRequestException(`Owner with id ${data.ownerId} not found`);
      }
    }

    const roleId = await resolveRoleIdForType(this.prisma, data.type as UserTypeName);
    const passwordHash = await hashPassword(data.password);
    const stationId = await resolveSwapperStationId(this.prisma, {
      type: data.type as UserTypeName,
      stationId: data.stationId ?? null,
    });

    try {
      if (data.type === 'owner') {
        const user = await this.prisma.db.transaction(async (tx) => {
          const created = await tx.orm.public.User.include('role')
            .include('assignedStation')
            .include('fleetOwner')
            .create({
              username: data.username,
              firstName: data.firstName,
              lastName: data.lastName,
              email: data.email.trim().toLowerCase(),
              phone: data.phone,
              address: data.address,
              image: data.image,
              nationalId: data.nationalId,
              type: 'owner',
              roleId,
              kycStatus: data.kycStatus ?? 'pending',
              isActive: data.isActive ?? true,
              passwordHash,
              stationId: stationId ?? null,
            });

          const displayName = [data.firstName, data.lastName].filter(Boolean).join(' ').trim();
          const owner = await tx.orm.public.Owner.create({
            name: displayName || data.username,
            email: data.email.trim().toLowerCase(),
            phone: data.phone,
            status: 'active',
            userId: created.id,
          });

          await tx.orm.public.Wallet.create({
            ownerId: owner.id,
            balance: asNumeric(0),
            currency: 'CDF',
          });

          return created;
        });

        return sanitizeUser(user);
      }

      if (data.type === 'rider') {
        const user = await this.prisma.db.transaction(async (tx) => {
          const created = await tx.orm.public.User.include('role')
            .include('assignedStation')
            .include('fleetOwner')
            .create({
              username: data.username,
              firstName: data.firstName,
              lastName: data.lastName,
              email: data.email.trim().toLowerCase(),
              phone: data.phone,
              address: data.address,
              image: data.image,
              nationalId: data.nationalId,
              type: 'rider',
              roleId,
              ownerId: data.ownerId,
              kycStatus: data.kycStatus ?? 'pending',
              isActive: data.isActive ?? true,
              passwordHash,
              stationId: stationId ?? null,
            });

          await tx.orm.public.Wallet.create({
            userId: created.id,
            balance: asNumeric(0),
            currency: 'CDF',
          });

          return created;
        });

        return sanitizeUser(user);
      }

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
        ownerId: data.type === 'rider' ? data.ownerId : null,
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

    const nextOwnerId =
      data.ownerId !== undefined ? data.ownerId : existing.ownerId;
    assertOwnerTypeInvariant(nextType as UserType, nextOwnerId);
    if (nextType === 'rider' && nextOwnerId != null) {
      const owner = await this.prisma.db.orm.public.Owner.first({ id: nextOwnerId });
      if (!owner) {
        throw new BadRequestException(`Owner with id ${nextOwnerId} not found`);
      }
    }

    const ownerIdPatch =
      nextType === 'rider'
        ? nextOwnerId
        : nextType === 'owner' || nextType === 'agent'
          ? null
          : data.ownerId !== undefined
            ? data.ownerId
            : existing.type !== 'rider' && existing.type !== 'owner' && existing.type !== 'agent'
              ? null
              : undefined;

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
            ownerId: ownerIdPatch,
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
