import { Injectable, NotFoundException } from '@nestjs/common';
import { apiBadRequest } from '../errors/api-error.js';
import { ErasureCodes } from '../errors/codes.js';
import { verifyPassword } from '../auth/password.js';
import { PrismaService } from '../prisma.service.js';
import type { User } from '../prisma/types.js';
import { NON_TERMINAL_SWAP_STATUSES } from './erasure.constants.js';
import { erasedUserPlaceholders } from './erased-user-placeholders.js';

export type ErasurePreconditionOptions = {
  acknowledgeBalanceForfeiture?: boolean;
};

@Injectable()
export class UserErasureService {
  constructor(private readonly prisma: PrismaService) {}

  async assertCanErase(userId: number, options?: ErasurePreconditionOptions): Promise<User> {
    const user = await this.prisma.db.orm.public.User.first({ id: userId });

    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }

    if (user.erasedAt != null) {
      apiBadRequest(ErasureCodes.alreadyErased);
    }

    const riderSwaps = await this.prisma.db.orm.public.SwapTransaction.where({ userId }).all();
    const openSwap = riderSwaps.find((swap) =>
      (NON_TERMINAL_SWAP_STATUSES as readonly string[]).includes(swap.status),
    );

    if (openSwap) {
      apiBadRequest(ErasureCodes.openSwapInProgress);
    }

    const riderWallet = await this.prisma.db.orm.public.Wallet.where({ userId }).first();
    if (riderWallet) {
      const balance = Number(riderWallet.balance);
      if (balance !== 0 && !options?.acknowledgeBalanceForfeiture) {
        apiBadRequest(
          balance > 0 ? ErasureCodes.walletBalanceRemaining : ErasureCodes.forfeitureRequired,
          { params: { balance } },
        );
      }
    }

    if (user.type === 'owner') {
      const portalOwner = await this.prisma.db.orm.public.Owner.first({ userId });
      if (portalOwner) {
        const ownerWallet = await this.prisma.db.orm.public.Wallet.where({
          ownerId: portalOwner.id,
        }).first();
        if (ownerWallet) {
          const balance = Number(ownerWallet.balance);
          if (balance !== 0 && !options?.acknowledgeBalanceForfeiture) {
            apiBadRequest(
              balance > 0 ? ErasureCodes.walletBalanceRemaining : ErasureCodes.forfeitureRequired,
              { params: { balance } },
            );
          }
        }
      }
    }

    if (user.type === 'agent') {
      const portalAgent = await this.prisma.db.orm.public.Agent.first({ userId });
      if (portalAgent) {
        const agentWallet = await this.prisma.db.orm.public.Wallet.where({
          agentId: portalAgent.id,
        }).first();
        if (agentWallet) {
          const balance = Number(agentWallet.balance);
          if (balance !== 0 && !options?.acknowledgeBalanceForfeiture) {
            apiBadRequest(
              balance > 0 ? ErasureCodes.walletBalanceRemaining : ErasureCodes.forfeitureRequired,
              { params: { balance } },
            );
          }
        }
      }
    }

    return user;
  }

  async verifyPasswordForErasure(userId: number, password: string): Promise<void> {
    const user = await this.prisma.db.orm.public.User.first({ id: userId });

    if (!user?.passwordHash) {
      apiBadRequest(ErasureCodes.confirmPasswordRequired);
    }

    const valid = await verifyPassword(password, user.passwordHash!);
    if (!valid) {
      apiBadRequest(ErasureCodes.confirmPasswordIncorrect);
    }
  }

  async executeErasure(userId: number, options?: ErasurePreconditionOptions): Promise<void> {
    const user = await this.assertCanErase(userId, options);
    const placeholders = erasedUserPlaceholders(userId);
    const piiSnapshot = [user.username, user.email, user.phone, user.nationalId, user.firstName, user.lastName]
      .filter((value): value is string => typeof value === 'string' && value.length > 0);

    await this.prisma.db.transaction(async (tx) => {
      const now = new Date();

      const bikes = await tx.orm.public.Bike.where({ userId }).all();
      for (const bike of bikes) {
        await tx.orm.public.Bike.where({ id: bike.id }).update({ userId: null });
      }

      const cards = await tx.orm.public.NfcCard.where({ userId }).all();
      for (const card of cards) {
        await tx.orm.public.NfcCard.where({ id: card.id }).update({
          userId: null,
          status: 'blocked',
        });
      }

      const portalOwner = await tx.orm.public.Owner.first({ userId });
      if (portalOwner) {
        await tx.orm.public.Owner.where({ id: portalOwner.id }).update({
          name: `Erased owner #${userId}`,
          email: `erased-owner-${userId}@invalid.local`,
          phone: null,
        });
      }

      const portalAgent = await tx.orm.public.Agent.first({ userId });
      if (portalAgent) {
        await tx.orm.public.Agent.where({ id: portalAgent.id }).update({
          name: `Erased agent #${userId}`,
          email: `erased-agent-${userId}@invalid.local`,
          phone: null,
        });
      }

      const reporterViolations = await tx.orm.public.Violation.where({ reporterId: userId }).all();
      for (const row of reporterViolations) {
        await tx.orm.public.Violation.where({ id: row.id }).update({ image: null });
      }

      const offenderViolations = await tx.orm.public.Violation.where({ offenderId: userId }).all();
      for (const row of offenderViolations) {
        await tx.orm.public.Violation.where({ id: row.id }).update({ image: null });
      }

      const incidentWhereUser = [
        ...(await tx.orm.public.Incident.where({ reporterId: userId }).all()),
        ...(await tx.orm.public.Incident.where({ damagedById: userId }).all()),
        ...(await tx.orm.public.Incident.where({ dismissedById: userId }).all()),
      ];
      const seenIncidents = new Set<number>();
      for (const incident of incidentWhereUser) {
        if (seenIncidents.has(incident.id)) {
          continue;
        }
        seenIncidents.add(incident.id);
        await tx.orm.public.Incident.where({ id: incident.id }).update({ image: null });
      }

      const swaps = await tx.orm.public.SwapTransaction.where({ userId }).all();
      for (const swap of swaps) {
        const logs = await tx.orm.public.AuditLog.where({ swapTransactionId: swap.id }).all();
        for (const log of logs) {
          if (!log.details) {
            continue;
          }
          let details = log.details;
          for (const fragment of piiSnapshot) {
            if (details.includes(fragment)) {
              details = details.split(fragment).join(`user#${userId}`);
            }
          }
          if (details !== log.details) {
            await tx.orm.public.AuditLog.where({ id: log.id }).update({ details });
          }
        }
      }

      await tx.orm.public.User.where({ id: userId }).update({
        ...placeholders,
        passwordHash: null,
        lastLoginAt: null,
        stationId: null,
        isActive: false,
        erasedAt: now,
      });
    });
  }
}