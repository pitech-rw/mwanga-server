import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { asNumeric, isUniqueViolation, withoutUndefined } from '../prisma/errors.js';
import type { PaymentStatus, SwapStatus, SwapTransaction } from '../prisma/types.js';
import { PrismaService } from '../prisma.service.js';
import { CreateSwapDto } from './create-swap.dto.js';
import { recordBatteryReading } from './record-battery-reading.js';
import { requireSwapper } from './require-swapper.js';
import { statusTimestampsForTransition } from './swap-status-timestamps.js';
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
} as const satisfies Record<string, SwapStatus>;

const paymentStatusMap = {
  pending: 'pending',
  captured: 'captured',
  failed: 'failed',
  reversed: 'reversed',
} as const satisfies Record<string, PaymentStatus>;

@Injectable()
export class SwapsService {
  constructor(private readonly prisma: PrismaService) {}

  private swapQuery() {
    return this.prisma.db.orm.public.SwapTransaction.include('user')
      .include('bike')
      .include('station')
      .include('card')
      .include('swapper')
      .include('oldBattery')
      .include('newBattery')
      .include('readings');
  }

  async findAll() {
    return this.swapQuery().orderBy((swap) => swap.createdAt.desc()).all();
  }

  async findOne(id: number) {
    const swap = await this.swapQuery().first({ id });

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

    if (!status || !paymentStatus) {
      throw new BadRequestException('Invalid swap or payment status');
    }

    if (data.swapperId !== undefined) {
      await requireSwapper(this.prisma, data.swapperId);
    }

    try {
      return await this.prisma.db.transaction(async (tx) => {
        const created = await tx.orm.public.SwapTransaction.create({
          userId: data.userId,
          bikeId: data.bikeId,
          stationId: data.stationId,
          cardId: data.cardId,
          swapperId: data.swapperId,
          oldBatteryId: data.oldBatteryId,
          newBatteryId: data.newBatteryId,
          status,
          paymentStatus,
          fee: asNumeric(data.fee ?? 0),
          walletBalanceAfter: asNumeric(data.walletBalanceAfter ?? 0),
          paymentReference: data.paymentReference,
          notes: data.notes,
          ...statusTimestampsForTransition(status),
        });

        await recordBatteryReading(tx, created.id, data.oldBatteryId, 'in');
        await recordBatteryReading(tx, created.id, data.newBatteryId, 'out');

        const swap = await tx.orm.public.SwapTransaction.include('user')
          .include('bike')
          .include('station')
          .include('card')
          .include('swapper')
          .include('oldBattery')
          .include('newBattery')
          .include('readings')
          .first({ id: created.id });

        if (!swap) {
          throw new NotFoundException(`Swap transaction with id ${created.id} not found`);
        }

        return swap;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException('Could not create swap transaction');
      }

      throw error;
    }
  }

  async update(id: number, data: UpdateSwapDto): Promise<SwapTransaction> {
    await this.findOne(id);

    const status = data.status ? swapStatusMap[data.status as keyof typeof swapStatusMap] : undefined;
    const paymentStatus = data.paymentStatus
      ? paymentStatusMap[data.paymentStatus as keyof typeof paymentStatusMap]
      : undefined;

    if (data.status && !status) {
      throw new BadRequestException('Invalid swap status');
    }

    if (data.paymentStatus && !paymentStatus) {
      throw new BadRequestException('Invalid payment status');
    }

    if (data.swapperId !== undefined) {
      await requireSwapper(this.prisma, data.swapperId);
    }

    try {
      const swap = await this.prisma.db.transaction(async (tx) => {
        const updated = await tx.orm.public.SwapTransaction.where({ id })
          .include('user')
          .include('bike')
          .include('station')
          .include('card')
          .include('swapper')
          .include('oldBattery')
          .include('newBattery')
          .include('readings')
          .update(
            withoutUndefined({
              userId: data.userId,
              bikeId: data.bikeId,
              stationId: data.stationId,
              cardId: data.cardId,
              swapperId: data.swapperId,
              oldBatteryId: data.oldBatteryId,
              newBatteryId: data.newBatteryId,
              status,
              paymentStatus,
              fee: data.fee === undefined ? undefined : asNumeric(data.fee),
              walletBalanceAfter:
                data.walletBalanceAfter === undefined ? undefined : asNumeric(data.walletBalanceAfter),
              paymentReference: data.paymentReference,
              notes: data.notes,
              ...(status ? statusTimestampsForTransition(status) : {}),
            }),
          );

        if (!updated) {
          return null;
        }

        if (data.oldBatteryId !== undefined) {
          await recordBatteryReading(tx, id, data.oldBatteryId, 'in');
        }

        if (data.newBatteryId !== undefined) {
          await recordBatteryReading(tx, id, data.newBatteryId, 'out');
        }

        return tx.orm.public.SwapTransaction.include('user')
          .include('bike')
          .include('station')
          .include('card')
          .include('swapper')
          .include('oldBattery')
          .include('newBattery')
          .include('readings')
          .first({ id });
      });

      if (!swap) {
        throw new NotFoundException(`Swap transaction with id ${id} not found`);
      }

      return swap;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException('Could not update swap transaction');
      }

      throw error;
    }
  }

  async remove(id: number): Promise<SwapTransaction> {
    await this.findOne(id);

    const swap = await this.prisma.db.orm.public.SwapTransaction.where({ id }).delete();

    if (!swap) {
      throw new NotFoundException(`Swap transaction with id ${id} not found`);
    }

    return swap;
  }
}
