import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { asNumeric } from '../prisma/errors.js';
import type { SwapStatus } from '../prisma/types.js';
import { PrismaService } from '../prisma.service.js';
import { AssignBatteryDto } from './assign-battery.dto.js';

@Injectable()
export class AssignmentService {
  constructor(private readonly prisma: PrismaService) {}

  private swapQuery() {
    return this.prisma.db.orm.public.SwapTransaction.include('rider')
      .include('bike')
      .include('station')
      .include('card')
      .include('oldBattery')
      .include('newBattery');
  }

  async assignBattery(dto: AssignBatteryDto) {
    const rider = await this.prisma.db.orm.public.Rider.where({ id: dto.riderId })
      .include('wallet')
      .include('cards')
      .first();

    if (!rider) {
      throw new NotFoundException(`Rider with id ${dto.riderId} not found`);
    }

    const bike = await this.prisma.db.orm.public.Bike.where({ id: dto.bikeId })
      .include('currentBattery')
      .first();

    if (!bike) {
      throw new NotFoundException(`Bike with id ${dto.bikeId} not found`);
    }

    const station = await this.prisma.db.orm.public.Station.first({ id: dto.stationId });

    if (!station) {
      throw new NotFoundException(`Station with id ${dto.stationId} not found`);
    }

    if (rider.status !== 'active') {
      throw new BadRequestException('Rider is not active and cannot receive a battery assignment');
    }

    const activeCard = rider.cards.find((card) => card.status === 'active');
    if (!activeCard) {
      throw new BadRequestException('Rider has no active NFC card for this swap');
    }

    const availableBattery = await this.prisma.db.orm.public.Battery.where({
      stationId: dto.stationId,
      status: 'available',
    })
      .orderBy([(battery) => battery.updatedAt.asc(), (battery) => battery.id.asc()])
      .first();

    if (!availableBattery) {
      throw new BadRequestException('No available battery at the selected station');
    }

    const swap = await this.prisma.db.transaction(async (tx) => {
      const created = await tx.orm.public.SwapTransaction.include('rider')
        .include('bike')
        .include('station')
        .include('card')
        .include('oldBattery')
        .include('newBattery')
        .create({
          riderId: rider.id,
          bikeId: bike.id,
          stationId: station.id,
          cardId: activeCard.id,
          oldBatteryId: bike.currentBatteryId,
          newBatteryId: availableBattery.id,
          status: 'assigned',
          paymentStatus: 'pending',
          fee: asNumeric(dto.fee ?? 0),
          walletBalanceAfter: asNumeric(rider.wallet?.balance ?? 0),
          notes: dto.notes ?? 'Battery assigned by system',
        });

      await tx.orm.public.Battery.where({ id: availableBattery.id }).update({
        status: 'assigned',
        stationId: dto.stationId,
      });

      await tx.orm.public.AuditLog.create({
        swapTransactionId: created.id,
        entityType: 'swap',
        entityId: created.id,
        actor: 'system',
        action: 'battery_assigned',
        details: `Battery ${availableBattery.serialNumber} assigned to rider ${rider.id} at station ${station.code}`,
      });

      return created;
    });

    return {
      assignment: {
        swapId: swap.id,
        riderId: rider.id,
        bikeId: bike.id,
        stationId: station.id,
        batteryId: availableBattery.id,
        serialNumber: availableBattery.serialNumber,
        status: swap.status,
        soc: availableBattery.soc,
        soh: availableBattery.soh,
        stationCode: station.code,
        cardId: activeCard.id,
      },
      swap,
    };
  }

  async completeSwap(
    swapId: number,
    action: 'collected' | 'installed' | 'completed' | 'failed' | 'cancelled',
  ) {
    const loaded = await this.swapQuery().where({ id: swapId }).first();

    if (!loaded) {
      throw new NotFoundException(`Swap transaction with id ${swapId} not found`);
    }

    const nextStatus: SwapStatus =
      action === 'collected'
        ? 'collected'
        : action === 'installed'
          ? 'installed'
          : action === 'completed'
            ? 'completed'
            : action === 'failed'
              ? 'failed'
              : 'cancelled';

    return this.prisma.db.transaction(async (tx) => {
      if (action === 'completed' && loaded.paymentStatus !== 'captured') {
        const riderWallet = await tx.orm.public.Wallet.where({ riderId: loaded.riderId }).first();

        if (!riderWallet) {
          throw new BadRequestException('Rider wallet not found for payment capture');
        }

        const fee = Number(loaded.fee);
        const updatedBalance = Number(riderWallet.balance) - fee;

        if (updatedBalance < 0) {
          throw new BadRequestException('Insufficient wallet balance to complete the swap');
        }

        await tx.orm.public.Wallet.where({ id: riderWallet.id }).update({
          balance: asNumeric(updatedBalance),
        });

        await tx.orm.public.SwapTransaction.where({ id: swapId }).update({
          paymentStatus: 'captured',
          paymentReference: `MWANGA-${loaded.id}-${Date.now()}`,
          walletBalanceAfter: asNumeric(updatedBalance),
        });
      }

      const updatedSwap = await tx.orm.public.SwapTransaction.where({ id: swapId })
        .include('rider')
        .include('bike')
        .include('station')
        .include('card')
        .include('oldBattery')
        .include('newBattery')
        .update({
          status: nextStatus,
          completedAt:
            action === 'completed' || action === 'failed' || action === 'cancelled'
              ? new Date()
              : undefined,
        });

      if (!updatedSwap) {
        throw new NotFoundException(`Swap transaction with id ${swapId} not found`);
      }

      await tx.orm.public.AuditLog.create({
        swapTransactionId: swapId,
        entityType: 'swap',
        entityId: swapId,
        actor: 'system',
        action,
        details: `Swap ${swapId} moved to status ${nextStatus}`,
      });

      if (action === 'completed') {
        await tx.orm.public.LedgerEntry.create({
          swapTransactionId: swapId,
          eventType: 'swap_completed',
          amount: updatedSwap.fee,
          description: `Swap completed for rider ${updatedSwap.riderId} at station ${updatedSwap.stationId}`,
        });

        if (updatedSwap.newBatteryId) {
          await tx.orm.public.Battery.where({ id: updatedSwap.newBatteryId }).update({
            status: 'available',
          });
        }
      }

      if (action === 'failed' || action === 'cancelled') {
        await tx.orm.public.LedgerEntry.create({
          swapTransactionId: swapId,
          eventType: action === 'failed' ? 'swap_failed' : 'swap_cancelled',
          amount: updatedSwap.fee,
          description: `Swap ${action} for rider ${updatedSwap.riderId}`,
        });

        if (updatedSwap.newBatteryId) {
          await tx.orm.public.Battery.where({ id: updatedSwap.newBatteryId }).update({
            status: 'available',
          });
        }
      }

      return updatedSwap;
    });
  }
}
