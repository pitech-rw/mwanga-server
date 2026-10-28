import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma, SwapStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service.js';
import { AssignBatteryDto } from './assign-battery.dto.js';

@Injectable()
export class AssignmentService {
  constructor(private readonly prisma: PrismaService) {}

  async assignBattery(dto: AssignBatteryDto) {
    const rider = await this.prisma.rider.findUnique({
      where: { id: dto.riderId },
      include: { wallet: true, cards: true },
    });

    if (!rider) {
      throw new NotFoundException(`Rider with id ${dto.riderId} not found`);
    }

    const bike = await this.prisma.bike.findUnique({
      where: { id: dto.bikeId },
      include: { currentBattery: true },
    });

    if (!bike) {
      throw new NotFoundException(`Bike with id ${dto.bikeId} not found`);
    }

    const station = await this.prisma.station.findUnique({
      where: { id: dto.stationId },
    });

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

    const availableBattery = await this.prisma.battery.findFirst({
      where: {
        stationId: dto.stationId,
        status: 'available',
      },
      orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
    });

    if (!availableBattery) {
      throw new BadRequestException('No available battery at the selected station');
    }

    const swap = await this.prisma.swapTransaction.create({
      data: {
        rider: { connect: { id: rider.id } },
        bike: { connect: { id: bike.id } },
        station: { connect: { id: station.id } },
        card: { connect: { id: activeCard.id } },
        oldBattery: bike.currentBatteryId ? { connect: { id: bike.currentBatteryId } } : undefined,
        newBattery: { connect: { id: availableBattery.id } },
        status: 'assigned',
        paymentStatus: 'pending',
        fee: dto.fee ?? 0,
        walletBalanceAfter: rider.wallet?.balance ?? 0,
        notes: dto.notes ?? 'Battery assigned by system',
      },
      include: {
        rider: true,
        bike: true,
        station: true,
        card: true,
        oldBattery: true,
        newBattery: true,
      },
    });

    await this.prisma.battery.update({
      where: { id: availableBattery.id },
      data: {
        status: 'assigned',
        stationId: dto.stationId,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        swapTransactionId: swap.id,
        entityType: 'swap',
        entityId: swap.id,
        actor: 'system',
        action: 'battery_assigned',
        details: `Battery ${availableBattery.serialNumber} assigned to rider ${rider.id} at station ${station.code}`,
      },
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

  async completeSwap(swapId: number, action: 'collected' | 'installed' | 'completed' | 'failed' | 'cancelled') {
    const swap = await this.prisma.swapTransaction.findUnique({
      where: { id: swapId },
      include: { rider: true, bike: true, station: true, card: true, newBattery: true, wallet: undefined },
    });

    if (!swap) {
      throw new NotFoundException(`Swap transaction with id ${swapId} not found`);
    }

    const nextStatus =
      action === 'collected'
        ? 'collected'
        : action === 'installed'
          ? 'installed'
          : action === 'completed'
            ? 'completed'
            : action === 'failed'
              ? 'failed'
              : 'cancelled';

    if (action === 'completed' && swap.paymentStatus !== 'captured') {
      const riderWallet = await this.prisma.wallet.findUnique({
        where: { riderId: swap.riderId },
      });

      if (!riderWallet) {
        throw new BadRequestException('Rider wallet not found for payment capture');
      }

      const fee = Number(swap.fee);
      const updatedBalance = Number(riderWallet.balance) - fee;

      if (updatedBalance < 0) {
        throw new BadRequestException('Insufficient wallet balance to complete the swap');
      }

      await this.prisma.wallet.update({
        where: { id: riderWallet.id },
        data: {
          balance: updatedBalance,
        },
      });

      await this.prisma.swapTransaction.update({
        where: { id: swapId },
        data: {
          paymentStatus: 'captured',
          paymentReference: `MWANGA-${swap.id}-${Date.now()}`,
          walletBalanceAfter: updatedBalance,
        },
      });
    }

    const updatedSwap = await this.prisma.swapTransaction.update({
      where: { id: swapId },
      data: {
        status: nextStatus as SwapStatus,
        completedAt:
          action === 'completed' || action === 'failed' || action === 'cancelled'
            ? new Date()
            : undefined,
      },
      include: {
        rider: true,
        bike: true,
        station: true,
        card: true,
        oldBattery: true,
        newBattery: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        swapTransactionId: swapId,
        entityType: 'swap',
        entityId: swapId,
        actor: 'system',
        action: action,
        details: `Swap ${swapId} moved to status ${nextStatus}`,
      },
    });

    if (action === 'completed') {
      await this.prisma.ledgerEntry.create({
        data: {
          swapTransactionId: swapId,
          eventType: 'swap_completed',
          amount: updatedSwap.fee,
          description: `Swap completed for rider ${updatedSwap.riderId} at station ${updatedSwap.stationId}`,
        },
      });

      if (updatedSwap.newBatteryId) {
        await this.prisma.battery.update({
          where: { id: updatedSwap.newBatteryId },
          data: {
            status: 'available',
          },
        });
      }
    }

    if (action === 'failed' || action === 'cancelled') {
      await this.prisma.ledgerEntry.create({
        data: {
          swapTransactionId: swapId,
          eventType: action === 'failed' ? 'swap_failed' : 'swap_cancelled',
          amount: updatedSwap.fee,
          description: `Swap ${action} for rider ${updatedSwap.riderId}`,
        },
      });

      if (updatedSwap.newBatteryId) {
        await this.prisma.battery.update({
          where: { id: updatedSwap.newBatteryId },
          data: { status: 'available' },
        });
      }
    }

    return updatedSwap;
  }
}
