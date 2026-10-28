import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Wallet } from '@prisma/client';
import { PrismaService } from '../prisma.service.js';
import { CreateWalletDto } from './create-wallet.dto.js';
import { UpdateWalletDto } from './update-wallet.dto.js';

@Injectable()
export class WalletsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Wallet[]> {
    return this.prisma.wallet.findMany({
      orderBy: { createdAt: 'desc' },
      include: { rider: true },
    });
  }

  async findOne(id: number): Promise<Wallet> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { id },
      include: { rider: true },
    });

    if (!wallet) {
      throw new NotFoundException(`Wallet with id ${id} not found`);
    }

    return wallet;
  }

  async create(data: CreateWalletDto): Promise<Wallet> {
    const walletData: Prisma.WalletCreateInput = {
      balance: data.balance ?? 0,
      currency: data.currency ?? 'KES',
      rider: { connect: { id: data.riderId } },
    };

    try {
      return await this.prisma.wallet.create({
        data: walletData,
        include: { rider: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('A wallet already exists for this rider');
      }

      throw error;
    }
  }

  async update(id: number, data: UpdateWalletDto): Promise<Wallet> {
    await this.findOne(id);

    const updateData: Prisma.WalletUpdateInput = {
      balance: data.balance,
      currency: data.currency,
      rider: data.riderId !== undefined ? { connect: { id: data.riderId } } : undefined,
    };

    try {
      return await this.prisma.wallet.update({
        where: { id },
        data: updateData,
        include: { rider: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('A wallet already exists for this rider');
      }

      throw error;
    }
  }

  async remove(id: number): Promise<Wallet> {
    await this.findOne(id);

    return this.prisma.wallet.delete({ where: { id } });
  }
}
