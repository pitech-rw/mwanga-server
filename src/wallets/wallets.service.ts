import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { ReadScopeContext } from '../auth/read-scope.js';
import { denyOrNotFoundForScopedRead, walletReadScope } from '../auth/read-scope.js';
import { resolveFleetOwnerIdForContext } from '../fleet/resolve-fleet.js';
import { asNumeric, isUniqueViolation, withoutUndefined } from '../prisma/errors.js';
import type { Wallet } from '../prisma/types.js';
import { PrismaService } from '../prisma.service.js';
import { CreateWalletDto } from './create-wallet.dto.js';
import { UpdateWalletDto } from './update-wallet.dto.js';

@Injectable()
export class WalletsService {
  constructor(private readonly prisma: PrismaService) {}

  private walletQuery() {
    return this.prisma.db.orm.public.Wallet.include('owner');
  }

  async findAll(ctx: ReadScopeContext) {
    const scope = walletReadScope(ctx);
    const ordered = this.walletQuery().orderBy((wallet) => wallet.createdAt.desc());

    if (scope.mode === 'unrestricted') {
      return ordered.all();
    }

    const ownerId = await resolveFleetOwnerIdForContext(this.prisma, ctx);
    if (ownerId == null) {
      throw new NotFoundException('Fleet owner not found');
    }

    return ordered.where({ ownerId }).all();
  }

  async findOne(id: number, ctx: ReadScopeContext) {
    const wallet = await this.walletQuery().first({ id });

    if (!wallet) {
      throw new NotFoundException(`Wallet with id ${id} not found`);
    }

    const scope = walletReadScope(ctx);
    if (scope.mode === 'fleet') {
      const ownerId = await resolveFleetOwnerIdForContext(this.prisma, ctx);
      if (ownerId == null || wallet.ownerId !== ownerId) {
        denyOrNotFoundForScopedRead(ctx, 'not_owner');
      }
    }

    return wallet;
  }

  async create(data: CreateWalletDto): Promise<Wallet> {
    const owner = await this.prisma.db.orm.public.Owner.first({ id: data.ownerId });
    if (!owner) {
      throw new BadRequestException(`Owner with id ${data.ownerId} not found`);
    }

    const existing = await this.prisma.db.orm.public.Wallet.where({ ownerId: data.ownerId }).first();
    if (existing) {
      throw new BadRequestException('A wallet already exists for this owner');
    }

    try {
      return await this.walletQuery().create({
        ownerId: data.ownerId,
        balance: asNumeric(data.balance ?? 0),
        currency: data.currency,
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException('A wallet already exists for this owner');
      }

      throw error;
    }
  }

  async update(id: number, data: UpdateWalletDto, ctx: ReadScopeContext): Promise<Wallet> {
    await this.findOne(id, ctx);

    if (data.ownerId !== undefined) {
      const owner = await this.prisma.db.orm.public.Owner.first({ id: data.ownerId });
      if (!owner) {
        throw new BadRequestException(`Owner with id ${data.ownerId} not found`);
      }
    }

    try {
      const wallet = await this.prisma.db.orm.public.Wallet.where({ id })
        .include('owner')
        .update(
          withoutUndefined({
            ownerId: data.ownerId,
            balance: data.balance === undefined ? undefined : asNumeric(data.balance),
            currency: data.currency,
          }),
        );

      if (!wallet) {
        throw new NotFoundException(`Wallet with id ${id} not found`);
      }

      return wallet;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException('A wallet already exists for this owner');
      }

      throw error;
    }
  }

  async remove(id: number, ctx: ReadScopeContext): Promise<Wallet> {
    await this.findOne(id, ctx);

    const wallet = await this.prisma.db.orm.public.Wallet.where({ id }).delete();

    if (!wallet) {
      throw new NotFoundException(`Wallet with id ${id} not found`);
    }

    return wallet;
  }
}
