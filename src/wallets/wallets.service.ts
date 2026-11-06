import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { ReadScopeContext } from '../auth/read-scope.js';
import { denyOrNotFoundForScopedRead, walletReadFilter } from '../auth/read-scope.js';
import { asNumeric, isUniqueViolation, withoutUndefined } from '../prisma/errors.js';
import type { Wallet } from '../prisma/types.js';
import { PrismaService } from '../prisma.service.js';
import { CreateWalletDto } from './create-wallet.dto.js';
import { UpdateWalletDto } from './update-wallet.dto.js';

@Injectable()
export class WalletsService {
  constructor(private readonly prisma: PrismaService) {}

  private walletQuery() {
    return this.prisma.db.orm.public.Wallet.include('user');
  }

  async findAll(ctx: ReadScopeContext) {
    const filter = walletReadFilter(ctx);
    const ordered = this.walletQuery().orderBy((wallet) => wallet.createdAt.desc());

    if (filter.unrestricted) {
      return ordered.all();
    }

    return ordered.where({ userId: filter.userId }).all();
  }

  async findOne(id: number, ctx: ReadScopeContext) {
    const wallet = await this.walletQuery().first({ id });

    if (!wallet) {
      throw new NotFoundException(`Wallet with id ${id} not found`);
    }

    const filter = walletReadFilter(ctx);
    if (!filter.unrestricted && wallet.userId !== filter.userId) {
      denyOrNotFoundForScopedRead(ctx, 'not_owner');
    }

    return wallet;
  }

  async create(data: CreateWalletDto): Promise<Wallet> {
    try {
      return await this.prisma.db.orm.public.Wallet.include('user').create({
        userId: data.userId,
        balance: asNumeric(data.balance ?? 0),
        currency: data.currency,
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException('A wallet already exists for this user');
      }

      throw error;
    }
  }

  async update(id: number, data: UpdateWalletDto, ctx: ReadScopeContext): Promise<Wallet> {
    await this.findOne(id, ctx);

    try {
      const wallet = await this.prisma.db.orm.public.Wallet.where({ id })
        .include('user')
        .update(
          withoutUndefined({
            userId: data.userId,
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
        throw new BadRequestException('A wallet already exists for this user');
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
