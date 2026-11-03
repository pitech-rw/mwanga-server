import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SwapTransaction } from '@prisma/client';
import { PrismaService } from '../prisma.service.js';
import { CreateSwapDto } from './create-swap.dto.js';
import { UpdateSwapDto } from './update-swap.dto.js';

const swapStatusMap = {
  initiated: 'initiated',
  assigned: 'assigned',
  collected: 'collected',
  installed: 'installed',
  completed: 'completed',
  failed: 'failed',
  cancelled: 'cancelled',
  reversed: 'reversed',
} as const;

const paymentStatusMap = {
  pending: 'pending',
  captured: 'captured',
  failed: 'failed',
  reversed: 'reversed',
} as const;

@Injectable()
export class SwapsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<SwapTransaction[]> {
    return this.prisma.swapTransaction.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        rider: true,
        bike: true,
        station: true,
        card: true,
        oldBattery: true,
        newBattery: true,
      },
    });
  }

  async findOne(id: number): Promise<SwapTransaction> {
    const swap = await this.prisma.swapTransaction.findUnique({
      where: { id },
      include: {
        rider: true,
        bike: true,
        station: true,
        card: true,
        oldBattery: true,
        newBattery: true,
      },
    });

    if (!swap) {
      throw new NotFoundException(`Swap transaction with id ${id} not found`);
    }

    return swap;
  }

  async create(data: CreateSwapDto): Promise<SwapTransaction> {
    const status = data.status ? swapStatusMap[data.status as keyof typeof swapStatusMap] : 'initiated';
    const paymentStatus = data.paymentStatus
      ? paymentStatusMap[data.paymentStatus as keyof typeof paymentStatusMap]
      : 'pending';

    const swapData: Prisma.SwapTransactionCreateInput = {
      rider: { connect: { id: data.riderId } },
      bike: { connect: { id: data.bikeId } },
      station: { connect: { id: data.stationId } },
      card: { connect: { id: data.cardId } },
      oldBattery: data.oldBatteryId ? { connect: { id: data.oldBatteryId } } : undefined,
      newBattery: data.newBatteryId ? { connect: { id: data.newBatteryId } } : undefined,
      status,
      paymentStatus,
      fee: data.fee ?? 0,
      walletBalanceAfter: data.walletBalanceAfter ?? 0,
      paymentReference: data.paymentReference,
      notes: data.notes,
    };

    try {
      return await this.prisma.swapTransaction.create({
        data: swapData,
        include: {
          rider: true,
          bike: true,
          station: true,
          card: true,
          oldBattery: true,
          newBattery: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('Could not create swap transaction');
      }

      throw error;
    }
  }

  async update(id: number, data: UpdateSwapDto): Promise<SwapTransaction> {
    await this.findOne(id);

    const updateData: Prisma.SwapTransactionUpdateInput = {
      rider: data.riderId !== undefined ? { connect: { id: data.riderId } } : undefined,
      bike: data.bikeId !== undefined ? { connect: { id: data.bikeId } } : undefined,
      station: data.stationId !== undefined ? { connect: { id: data.stationId } } : undefined,
      card: data.cardId !== undefined ? { connect: { id: data.cardId } } : undefined,
      oldBattery:
        data.oldBatteryId !== undefined ? { connect: { id: data.oldBatteryId } } : undefined,
      newBattery:
        data.newBatteryId !== undefined ? { connect: { id: data.newBatteryId } } : undefined,
      status: data.status ? swapStatusMap[data.status as keyof typeof swapStatusMap] : undefined,
      paymentStatus: data.paymentStatus
        ? paymentStatusMap[data.paymentStatus as keyof typeof paymentStatusMap]
        : undefined,
      fee: data.fee,
      walletBalanceAfter: data.walletBalanceAfter,
      paymentReference: data.paymentReference,
      notes: data.notes,
      completedAt: data.completedAt,
    };

    try {
      return await this.prisma.swapTransaction.update({
        where: { id },
        data: updateData,
        include: {
          rider: true,
          bike: true,
          station: true,
          card: true,
          oldBattery: true,
          newBattery: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('Could not update swap transaction');
      }

      throw error;
    }
  }

  async remove(id: number): Promise<SwapTransaction> {
    await this.findOne(id);

    return this.prisma.swapTransaction.delete({ where: { id } });
  }
}
