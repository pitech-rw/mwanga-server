import { Injectable, NotFoundException } from '@nestjs/common';
import { apiBadRequest } from '../errors/api-error.js';
import { UsersCodes } from '../errors/codes.js';
import type { ReadScopeContext } from '../auth/read-scope.js';
import { assertCanReadUserId, isUnrestrictedRead } from '../auth/read-scope.js';
import { assertOwnerTypeInvariant } from '../fleet/fleet-rules.js';
import {
  assertUserInFleet,
  resolveFleetOwnerId,
} from '../fleet/resolve-fleet.js';
import { DEFAULT_CURRENCY } from '../config/default-currency.js';
import { asNumeric } from '../prisma/errors.js';
import type { UserTypeName } from '../auth/permission-catalog.js';
import { resolveRoleIdForType } from '../auth/user-type-alignment.js';
import { hashPassword } from '../auth/password.js';
import { VISIBLE_USER_WHERE } from '../erasure/erasure.constants.js';
import { presentSafeUser } from '../erasure/present-safe-user.js';
import { isUniqueViolation, withoutUndefined } from '../prisma/errors.js';
import type { SafeUser, UserType } from '../prisma/types.js';
import { PrismaService } from '../prisma.service.js';
import { assertUserActiveForAssignment } from './assert-user-active.js';
import { CreateUserDto } from './create-user.dto.js';
import { resolveSwapperStationId } from './swapper-station-assignment.js';
import { UpdateUserDto } from './update-user.dto.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private userQuery() {
    return this.prisma.db.orm.public.User.include('role')
      .include('assignedStation')
      .include('fleetOwner')
      .where(VISIBLE_USER_WHERE);
  }

  /** Rider + fleet owner directory (`riders:read`). */
  async findRidersForAgent(ctx: ReadScopeContext): Promise<Record<string, unknown>[]> {
    const [riders, owners] = await Promise.all([
      this.prisma.db.orm.public.User.include('role')
        .include('riderWallet')
        .include('fleetOwner')
        .where({ type: 'rider', isActive: true, ...VISIBLE_USER_WHERE })
        .orderBy((user) => user.createdAt.desc())
        .all(),
      this.prisma.db.orm.public.Owner.include('wallet')
        .orderBy((owner) => owner.createdAt.desc())
        .all(),
    ]);

    const riderRows = riders.map((user) => ({
      ...presentSafeUser(user),
      directoryKind: 'rider' as const,
    }));

    const ownerRows = owners.map((owner) => ({
      directoryKind: 'owner' as const,
      id: owner.id,
      name: owner.name,
      email: owner.email,
      phone: owner.phone,
      status: owner.status,
      type: 'owner' as const,
      wallet: owner.wallet,
    }));

    const label = (row: Record<string, unknown>) => {
      if (row.directoryKind === 'owner') {
        return String(row.name ?? '');
      }
      const first = typeof row.firstName === 'string' ? row.firstName : '';
      const last = typeof row.lastName === 'string' ? row.lastName : '';
      const name = [first, last].filter(Boolean).join(' ').trim();
      return name || (typeof row.username === 'string' ? row.username : '');
    };

    return [...riderRows, ...ownerRows].sort((a, b) =>
      label(a).localeCompare(label(b), undefined, { sensitivity: 'base' }),
    );
  }

  async findAll(
    ctx: ReadScopeContext,
    filters?: { type?: UserType; activeOnly?: boolean },
  ): Promise<SafeUser[]> {
    if (ctx.user.type === 'owner' && !isUnrestrictedRead(ctx)) {
      const fleetOwnerId = await resolveFleetOwnerId(
        this.prisma,
        ctx.user.sub,
        'owner',
      );
      const riderWhere: { ownerId: number; isActive?: boolean; erasedAt: null } = {
        ownerId: fleetOwnerId,
        ...VISIBLE_USER_WHERE,
      };
      if (filters?.activeOnly) {
        riderWhere.isActive = true;
      }
      const users = await this.userQuery()
        .where(riderWhere)
        .orderBy((user) => user.createdAt.desc())
        .all();
      const proprietor = await this.userQuery().first({ id: ctx.user.sub });
      const proprietorRow =
        proprietor && (!filters?.activeOnly || proprietor.isActive)
          ? [presentSafeUser(proprietor)]
          : [];
      const list = [...proprietorRow, ...users.map((u) => presentSafeUser(u))];
      return list;
    }

    if (!isUnrestrictedRead(ctx)) {
      const self = await this.userQuery().first({ id: ctx.user.sub });

      if (!self) {
        throw new NotFoundException(`User with id ${ctx.user.sub} not found`);
      }

      return [presentSafeUser(self)];
    }

    const where: { type?: UserType; isActive?: boolean; erasedAt: null } = {
      ...VISIBLE_USER_WHERE,
    };
    if (filters?.type !== undefined) {
      where.type = filters.type;
    }
    if (filters?.activeOnly) {
      where.isActive = true;
    }
    const base = this.userQuery().where(where);
    const users = await base.orderBy((user) => user.createdAt.desc()).all();
    return users.map((user) => presentSafeUser(user));
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

    return presentSafeUser(user);
  }

  async create(data: CreateUserDto): Promise<SafeUser> {
    assertOwnerTypeInvariant(data.type as UserType, data.ownerId ?? null);

    if (data.type === 'rider') {
      if (data.ownerId == null) {
        apiBadRequest(UsersCodes.riderRequiresOwner);
      }
      const owner = await this.prisma.db.orm.public.Owner.first({ id: data.ownerId });
      if (!owner) {
        apiBadRequest(UsersCodes.ownerNotFound, { params: { ownerId: data.ownerId } });
      }
    }

    const roleId = await resolveRoleIdForType(this.prisma, data.type as UserTypeName);
    const passwordHash = await hashPassword(data.password);
    const stationId = await resolveSwapperStationId(this.prisma, {
      type: data.type as UserTypeName,
      stationId: data.stationId ?? null,
    });

    const creatingActive = data.isActive ?? true;
    if (
      !creatingActive &&
      (stationId != null || (data.type === 'rider' && data.ownerId != null))
    ) {
      apiBadRequest(UsersCodes.inactiveCannotAssignOnCreate);
    }

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
            currency: DEFAULT_CURRENCY,
          });

          return created;
        });

        return presentSafeUser(user);
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
              isActive: data.isActive ?? true,
              passwordHash,
              stationId: stationId ?? null,
            });

          await tx.orm.public.Wallet.create({
            userId: created.id,
            balance: asNumeric(0),
            currency: DEFAULT_CURRENCY,
          });

          return created;
        });

        return presentSafeUser(user);
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
        isActive: data.isActive ?? true,
        passwordHash,
        stationId: stationId ?? null,
      });
      return presentSafeUser(user);
    } catch (error) {
      if (isUniqueViolation(error)) {
        apiBadRequest(UsersCodes.duplicateIdentity);
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

    const reactivating = data.isActive === true && !existing.isActive;

    if (data.isActive === false && id === ctx.user.sub) {
      apiBadRequest(UsersCodes.cannotDeactivateSelf);
    }

    if (!existing.isActive && !reactivating) {
      const touched =
        data.username !== undefined ||
        data.firstName !== undefined ||
        data.lastName !== undefined ||
        data.email !== undefined ||
        data.phone !== undefined ||
        data.address !== undefined ||
        data.image !== undefined ||
        data.nationalId !== undefined ||
        data.type !== undefined ||
        data.password !== undefined ||
        data.stationId !== undefined ||
        data.ownerId !== undefined;
      if (touched) {
        apiBadRequest(UsersCodes.inactiveMustReactivateFirst);
      }
    }

    const nextOwnerId =
      data.ownerId !== undefined ? data.ownerId : existing.ownerId;
    assertOwnerTypeInvariant(nextType as UserType, nextOwnerId);
    if (nextType === 'rider' && nextOwnerId != null) {
      const owner = await this.prisma.db.orm.public.Owner.first({ id: nextOwnerId });
      if (!owner) {
        apiBadRequest(UsersCodes.ownerNotFound, { params: { ownerId: nextOwnerId } });
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

    const nextActive = data.isActive !== undefined ? data.isActive : existing.isActive;
    if (nextActive && !existing.isActive && existing.passwordHash == null && data.password === undefined) {
      apiBadRequest(UsersCodes.reactivationRequiresPassword);
    }

    if (data.stationId !== undefined && data.stationId != null && !reactivating) {
      await assertUserActiveForAssignment(this.prisma, id);
    }
    if (
      data.ownerId !== undefined &&
      data.ownerId != null &&
      nextType === 'rider' &&
      !reactivating
    ) {
      await assertUserActiveForAssignment(this.prisma, id);
    }

    let passwordHash: string | undefined;
    if (data.password !== undefined) {
      passwordHash = await hashPassword(data.password);
    }

    let stationIdPatch = stationId;
    if (data.isActive === false) {
      stationIdPatch = null;
    }

    if (stationIdPatch !== undefined && stationIdPatch != null) {
      const incumbent = await this.prisma.db.orm.public.User.where({
        stationId: stationIdPatch,
        ...VISIBLE_USER_WHERE,
      }).all();
      for (const other of incumbent) {
        if (other.id !== id) {
          await this.prisma.db.orm.public.User.where({ id: other.id }).update({ stationId: null });
        }
      }
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
            isActive: data.isActive,
            passwordHash,
            stationId: stationIdPatch,
            ownerId: ownerIdPatch,
          }),
        );

      if (!user) {
        throw new NotFoundException(`User with id ${id} not found`);
      }

      return presentSafeUser(user);
    } catch (error) {
      if (isUniqueViolation(error)) {
        apiBadRequest(UsersCodes.duplicateIdentity);
      }

      throw error;
    }
  }

  async remove(id: number, ctx: ReadScopeContext): Promise<SafeUser> {
    await this.findOne(id, ctx);

    if (id === ctx.user.sub) {
      apiBadRequest(UsersCodes.cannotDeactivateSelf);
    }

    const user = await this.userQuery().where({ id }).update({
      isActive: false,
      passwordHash: null,
      stationId: null,
    });

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return presentSafeUser(user);
  }
}
