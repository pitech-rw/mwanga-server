import { Injectable, NotFoundException } from '@nestjs/common';
import { DEFAULT_CURRENCY } from '../config/default-currency.js';
import { apiBadRequest } from '../errors/api-error.js';
import { OwnersCodes } from '../errors/codes.js';
import type { ReadScopeContext } from '../auth/read-scope.js';
import { denyOrNotFoundForScopedRead, ownerReadScope } from '../auth/read-scope.js';
import { asNumeric, isUniqueViolation, withoutUndefined } from '../prisma/errors.js';
import type { Owner } from '../prisma/types.js';
import { PrismaService } from '../prisma.service.js';
import { assertUserActiveForAssignment } from '../users/assert-user-active.js';
import { CreateOwnerDto } from './create-owner.dto.js';
import { UpdateOwnerDto } from './update-owner.dto.js';

@Injectable()
export class OwnersService {
  constructor(private readonly prisma: PrismaService) {}

  private ownerQuery() {
    return this.prisma.db.orm.public.Owner.include('portalUser').include('wallet');
  }

  async findAll(ctx: ReadScopeContext) {
    const scope = ownerReadScope(ctx);
    const ordered = this.ownerQuery().orderBy((owner) => owner.createdAt.desc());

    if (scope.mode === 'unrestricted') {
      return ordered.all();
    }

    return ordered.where({ userId: scope.userId }).all();
  }

  async findOne(id: number, ctx: ReadScopeContext) {
    const owner = await this.ownerQuery().first({ id });

    if (!owner) {
      throw new NotFoundException(`Owner with id ${id} not found`);
    }

    const scope = ownerReadScope(ctx);
    if (scope.mode === 'portal' && owner.userId !== scope.userId) {
      denyOrNotFoundForScopedRead(ctx, 'not_owner');
    }

    return owner;
  }

  async create(data: CreateOwnerDto): Promise<Owner> {
    if (data.userId != null) {
      const user = await this.prisma.db.orm.public.User.first({ id: data.userId });
      if (!user) {
        apiBadRequest(OwnersCodes.userNotFound, { params: { userId: data.userId } });
      }
      if (user.type !== 'owner') {
        apiBadRequest(OwnersCodes.portalUserMustBeOwner);
      }
      if (user.ownerId != null) {
        apiBadRequest(OwnersCodes.portalUserMustNotHaveOwnerId);
      }
      await assertUserActiveForAssignment(this.prisma, data.userId);
    }

    try {
      return await this.prisma.db.transaction(async (tx) => {
        const owner = await tx.orm.public.Owner.include('portalUser').include('wallet').create({
            name: data.name,
            email: data.email,
            phone: data.phone,
            status: data.status ?? 'active',
            userId: data.userId,
          });

        await tx.orm.public.Wallet.create({
          ownerId: owner.id,
          balance: asNumeric(0),
          currency: data.currency ?? DEFAULT_CURRENCY,
        });

        if (data.bikes?.length) {
          for (const bike of data.bikes) {
            await tx.orm.public.Bike.create({
              plateNumber: bike.plateNumber,
              chassisNumber: bike.chassisNumber,
              serialNumber: bike.serialNumber,
              model: bike.model,
              status: 'active',
              ownerId: owner.id,
            });
          }
        }

        const loaded = await tx.orm.public.Owner.include('portalUser')
          .include('wallet')
          .include('bikes')
          .first({
            id: owner.id,
          });

        if (!loaded) {
          throw new NotFoundException(`Owner with id ${owner.id} not found`);
        }

        return loaded;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        apiBadRequest(OwnersCodes.duplicateIdentity);
      }
      throw error;
    }
  }

  async update(id: number, data: UpdateOwnerDto, ctx: ReadScopeContext): Promise<Owner> {
    await this.findOne(id, ctx);

    if (data.userId !== undefined && data.userId != null) {
      const user = await this.prisma.db.orm.public.User.first({ id: data.userId });
      if (!user) {
        apiBadRequest(OwnersCodes.userNotFound, { params: { userId: data.userId } });
      }
      if (user.type !== 'owner') {
        apiBadRequest(OwnersCodes.portalUserMustBeOwner);
      }
      await assertUserActiveForAssignment(this.prisma, data.userId);
    }

    try {
      const owner = await this.ownerQuery()
        .where({ id })
        .update(
          withoutUndefined({
            name: data.name,
            email: data.email,
            phone: data.phone,
            status: data.status,
            userId: data.userId,
          }),
        );

      if (!owner) {
        throw new NotFoundException(`Owner with id ${id} not found`);
      }

      return owner;
    } catch (error) {
      if (isUniqueViolation(error)) {
        apiBadRequest(OwnersCodes.duplicatePortalUser);
      }
      throw error;
    }
  }

  async remove(id: number, ctx: ReadScopeContext): Promise<Owner> {
    await this.findOne(id, ctx);

    const owner = await this.prisma.db.orm.public.Owner.where({ id }).delete();

    if (!owner) {
      throw new NotFoundException(`Owner with id ${id} not found`);
    }

    return owner;
  }
}
