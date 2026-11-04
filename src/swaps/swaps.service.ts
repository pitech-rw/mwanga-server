import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { asNumeric, isUniqueViolation, withoutUndefined } from '../prisma/errors.js';
import type { PaymentStatus, SwapStatus, SwapTransaction } from '../prisma/types.js';
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

  private async batterySoc(batteryId?: number) {
    if (batteryId === undefined) {
      return undefined;
    }

    const battery = await this.prisma.db.orm.public.Battery.first({ id: batteryId });
    return battery?.soc;
  }

  private swapQuery() {
    return this.prisma.db.orm.public.SwapTransaction.include('rider')
      .include('bike')
      .include('station')
      .include('card')
      .include('oldBattery')
      .include('newBattery');
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

    try {
      return await this.swapQuery().create({
        riderId: data.riderId,
        bikeId: data.bikeId,
        stationId: data.stationId,
        cardId: data.cardId,
        oldBatteryId: data.oldBatteryId,
        newBatteryId: data.newBatteryId,
        oldBatterySoc: data.oldBatterySoc ?? (await this.batterySoc(data.oldBatteryId)),
        newBatterySoc: data.newBatterySoc ?? (await this.batterySoc(data.newBatteryId)),
        status,
        paymentStatus,
        fee: asNumeric(data.fee ?? 0),
        walletBalanceAfter: asNumeric(data.walletBalanceAfter ?? 0),
        paymentReference: data.paymentReference,
        notes: data.notes,
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

    const oldBatterySoc =
      data.oldBatterySoc !== undefined
        ? data.oldBatterySoc
        : data.oldBatteryId !== undefined
          ? await this.batterySoc(data.oldBatteryId)
          : undefined;
    const newBatterySoc =
      data.newBatterySoc !== undefined
        ? data.newBatterySoc
        : data.newBatteryId !== undefined
          ? await this.batterySoc(data.newBatteryId)
          : undefined;

    try {
      const swap = await this.prisma.db.orm.public.SwapTransaction.where({ id })
        .include('rider')
        .include('bike')
        .include('station')
        .include('card')
        .include('oldBattery')
        .include('newBattery')
        .update(
          withoutUndefined({
            riderId: data.riderId,
            bikeId: data.bikeId,
            stationId: data.stationId,
            cardId: data.cardId,
            oldBatteryId: data.oldBatteryId,
            newBatteryId: data.newBatteryId,
            oldBatterySoc,
            newBatterySoc,
            status,
            paymentStatus,
            fee: data.fee === undefined ? undefined : asNumeric(data.fee),
            walletBalanceAfter:
              data.walletBalanceAfter === undefined ? undefined : asNumeric(data.walletBalanceAfter),
            paymentReference: data.paymentReference,
            notes: data.notes,
            completedAt: data.completedAt,
          }),
        );

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
