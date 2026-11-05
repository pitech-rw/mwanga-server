import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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

  async findAll() {
    return this.walletQuery().orderBy((wallet) => wallet.createdAt.desc()).all();
  }

  async findOne(id: number) {
    const wallet = await this.walletQuery().first({ id });

    if (!wallet) {
      throw new NotFoundException(`Wallet with id ${id} not found`);
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

  async update(id: number, data: UpdateWalletDto): Promise<Wallet> {
    await this.findOne(id);

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

  async remove(id: number): Promise<Wallet> {
    await this.findOne(id);

    const wallet = await this.prisma.db.orm.public.Wallet.where({ id }).delete();

    if (!wallet) {
      throw new NotFoundException(`Wallet with id ${id} not found`);
    }

    return wallet;
  }
}
