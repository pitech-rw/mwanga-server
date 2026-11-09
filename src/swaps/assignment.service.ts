import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { asNumeric } from '../prisma/errors.js';
import type { SwapStatus } from '../prisma/types.js';
import { PrismaService } from '../prisma.service.js';
import { batteryStatusAtStation } from '../batteries/battery-status.js';
import { AssignBatteryDto } from './assign-battery.dto.js';
import { recordBatteryReading } from './record-battery-reading.js';
import { requireRiderUser } from './require-rider-user.js';
import { requireSwapper } from './require-swapper.js';
import { statusTimestampsForTransition } from './swap-status-timestamps.js';
import type { CompleteSwapDto } from './complete-swap.dto.js';

type Tx = Parameters<Parameters<PrismaService['db']['transaction']>[0]>[0];

type SwapCustody = {
  bikeId: number;
  stationId: number;
  oldBatteryId: number | null;
  newBatteryId: number | null;
};

@Injectable()
export class AssignmentService {
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

  /** Ensures scanned serial is the pack currently on the bike (assign guard). */
  private async assertIncomingSerialMatchesBike(bikeId: number, serialNumber: string): Promise<void> {
    const bike = await this.prisma.db.orm.public.Bike.where({ id: bikeId })
      .include('currentBattery')
      .first();

    if (!bike) {
      throw new NotFoundException(`Bike with id ${bikeId} not found`);
    }

    const normalizedSerial = serialNumber.trim();
    if (normalizedSerial === '') {
      throw new BadRequestException('Incoming battery serial number is required');
    }

    const incoming = await this.prisma.db.orm.public.Battery.where({
      serialNumber: normalizedSerial,
    }).first();

    if (!incoming) {
      throw new NotFoundException('No battery found with this serial number');
    }

    if (incoming.id !== bike.currentBatteryId) {
      throw new BadRequestException(
        'This serial does not match the battery currently installed on the selected bike',
      );
    }
  }

  async assignBattery(dto: AssignBatteryDto) {
    await requireSwapper(this.prisma, dto.swapperId);

    const rider = await requireRiderUser(this.prisma, dto.userId);

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

    if (bike.currentBatteryId != null) {
      const serial = dto.incomingBatterySerialNumber?.trim();
      if (!serial) {
        throw new BadRequestException(
          'incomingBatterySerialNumber is required when the bike has a mounted battery',
        );
      }
      await this.assertIncomingSerialMatchesBike(dto.bikeId, serial);
    }

    const activeCard = rider.nfcCards.find((card) => card.status === 'active');
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

    const assignedAt = new Date();

    const swap = await this.prisma.db.transaction(async (tx) => {
      const created = await tx.orm.public.SwapTransaction.include('user')
        .include('bike')
        .include('station')
        .include('card')
        .include('swapper')
        .include('oldBattery')
        .include('newBattery')
        .create({
          userId: rider.id,
          bikeId: bike.id,
          stationId: station.id,
          cardId: activeCard.id,
          swapperId: dto.swapperId,
          oldBatteryId: bike.currentBatteryId,
          newBatteryId: availableBattery.id,
          status: 'assigned',
          paymentStatus: 'pending',
          fee: asNumeric(dto.fee ?? 0),
          walletBalanceAfter: asNumeric(rider.wallet?.balance ?? 0),
          notes: dto.notes ?? 'Battery assigned by system',
          ...statusTimestampsForTransition('assigned', assignedAt),
        });

      await recordBatteryReading(tx, created.id, bike.currentBatteryId, 'in');
      await recordBatteryReading(tx, created.id, availableBattery.id, 'out');

      await tx.orm.public.Battery.where({ id: availableBattery.id }).update({
        status: 'offline',
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

      const recorded = await tx.orm.public.SwapTransaction.include('user')
        .include('bike')
        .include('station')
        .include('card')
        .include('swapper')
        .include('oldBattery')
        .include('newBattery')
        .include('readings')
        .first({ id: created.id });

      if (!recorded) {
        throw new NotFoundException(`Swap transaction with id ${created.id} not found`);
      }

      return recorded;
    });

    return {
      assignment: {
        swapId: swap.id,
        userId: rider.id,
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
    dto: CompleteSwapDto = {},
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
      if (dto.swapperId !== undefined) {
        await requireSwapper(this.prisma, dto.swapperId);
      }

      if (action === 'completed' && loaded.paymentStatus !== 'captured') {
        const riderWallet = await tx.orm.public.Wallet.where({ userId: loaded.userId }).first();

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
        .include('user')
        .include('bike')
        .include('station')
        .include('card')
        .include('swapper')
        .include('oldBattery')
        .include('newBattery')
        .include('readings')
        .update({
          status: nextStatus,
          ...(dto.swapperId !== undefined ? { swapperId: dto.swapperId } : {}),
          ...statusTimestampsForTransition(nextStatus),
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
          description: `Swap completed for rider ${updatedSwap.userId} at station ${updatedSwap.stationId}`,
        });

        await this.transferCustody(tx, updatedSwap);
      }

      if (action === 'failed' || action === 'cancelled') {
        await tx.orm.public.LedgerEntry.create({
          swapTransactionId: swapId,
          eventType: action === 'failed' ? 'swap_failed' : 'swap_cancelled',
          amount: updatedSwap.fee,
          description: `Swap ${action} for rider ${updatedSwap.userId}`,
        });

        await this.releaseIssuedBattery(tx, updatedSwap);
      }

      const settled = await tx.orm.public.SwapTransaction.where({ id: swapId })
        .include('user')
        .include('bike')
        .include('station')
        .include('card')
        .include('swapper')
        .include('oldBattery')
        .include('newBattery')
        .include('readings')
        .first();

      if (!settled) {
        throw new NotFoundException(`Swap transaction with id ${swapId} not found`);
      }

      return settled;
    });
  }

  private async transferCustody(tx: Tx, swap: SwapCustody) {
    if (swap.oldBatteryId != null && swap.oldBatteryId === swap.newBatteryId) {
      throw new BadRequestException('A swap cannot return and issue the same battery');
    }

    if (swap.newBatteryId != null) {
      const otherBike = await tx.orm.public.Bike.where({
        currentBatteryId: swap.newBatteryId,
      }).first();

      if (otherBike && otherBike.id !== swap.bikeId) {
        throw new BadRequestException('Issued battery is already mounted on another bike');
      }

      await tx.orm.public.Bike.where({ id: swap.bikeId }).update({
        currentBatteryId: swap.newBatteryId,
      });

      await tx.orm.public.Battery.where({ id: swap.newBatteryId }).update({
        stationId: null,
        status: 'in_use',
      });
    } else if (swap.oldBatteryId != null) {
      await tx.orm.public.Bike.where({ id: swap.bikeId }).update({
        currentBatteryId: null,
      });
    }

    if (swap.oldBatteryId != null) {
      await tx.orm.public.Battery.where({ id: swap.oldBatteryId }).update({
        stationId: swap.stationId,
        status: 'charging',
      });
    }
  }

  private async releaseIssuedBattery(tx: Tx, swap: SwapCustody) {
    if (swap.newBatteryId == null) {
      return;
    }

    const pack = await tx.orm.public.Battery.first({ id: swap.newBatteryId });
    const soc = pack?.soc ?? 100;

    await tx.orm.public.Battery.where({ id: swap.newBatteryId }).update({
      stationId: swap.stationId,
      status: batteryStatusAtStation(soc),
    });
  }
}
