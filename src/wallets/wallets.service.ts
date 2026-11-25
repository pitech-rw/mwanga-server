import { Injectable, NotFoundException } from '@nestjs/common';
import { DEFAULT_CURRENCY } from '../config/default-currency.js';
import { apiBadRequest } from '../errors/api-error.js';
import { WalletsCodes } from '../errors/codes.js';
import type { ReadScopeContext } from '../auth/read-scope.js';
import { denyOrNotFoundForScopedRead, walletReadScope } from '../auth/read-scope.js';
import { resolveFleetOwnerId } from '../fleet/resolve-fleet.js';
import { LedgerService } from '../ledger/ledger.service.js';
import { asNumeric, isUniqueViolation } from '../prisma/errors.js';
import type { LedgerTransaction, Wallet } from '../prisma/types.js';
import { PrismaService } from '../prisma.service.js';
import { VISIBLE_USER_WHERE } from '../erasure/erasure.constants.js';
import {
  presentSafeWallet,
  walletHolderLinksErasedUser,
  type WalletWithHolders,
} from '../erasure/present-safe-wallet.js';
import { loadVisibleUserIds } from '../erasure/visible-user-ids.js';
import { CreateWalletDto } from './create-wallet.dto.js';
import type { FloatCreditDto } from './float-credit.dto.js';

@Injectable()
export class WalletsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
  ) {}

  /** Holder relations only — rider users are loaded separately with `VISIBLE_USER_WHERE`. */
  private walletQuery() {
    return this.prisma.db.orm.public.Wallet.include('owner').include('agent');
  }

  private async attachVisibleRiderUsers<T extends Wallet>(rows: T[]): Promise<WalletWithHolders[]> {
    const riderIds = [
      ...new Set(rows.map((row) => row.userId).filter((id): id is number => typeof id === 'number')),
    ];
    if (riderIds.length === 0) {
      return rows;
    }

    const riderIdSet = new Set(riderIds);
    const riders = (await this.prisma.db.orm.public.User.where(VISIBLE_USER_WHERE).all()).filter(
      (user) => riderIdSet.has(user.id),
    );

    const byId = new Map(riders.map((user) => [user.id, user]));
    return rows.map((row) => ({
      ...row,
      riderUser: row.userId != null ? byId.get(row.userId) : undefined,
    }));
  }

  private async presentWalletRows(rows: Wallet[]): Promise<WalletWithHolders[]> {
    const hydrated = await this.attachVisibleRiderUsers(rows);
    const visibleUserIds = await loadVisibleUserIds(this.prisma);
    return hydrated
      .filter((row) => !walletHolderLinksErasedUser(row, visibleUserIds))
      .map((row) => presentSafeWallet(row));
  }

  private async presentWalletRow(row: Wallet): Promise<WalletWithHolders> {
    const [hydrated] = await this.attachVisibleRiderUsers([row]);
    const visibleUserIds = await loadVisibleUserIds(this.prisma);
    if (!hydrated || walletHolderLinksErasedUser(hydrated, visibleUserIds)) {
      throw new NotFoundException(`Wallet with id ${row.id} not found`);
    }
    return presentSafeWallet(hydrated);
  }

  async findAll(ctx: ReadScopeContext) {
    const scope = walletReadScope(ctx);
    const ordered = this.walletQuery().orderBy((wallet) => wallet.createdAt.desc());

    if (scope.mode === 'unrestricted') {
      return this.presentWalletRows(await ordered.all());
    }

    if (scope.mode === 'owner') {
      const ownerId = await resolveFleetOwnerId(this.prisma, scope.userId, 'owner');
      return this.presentWalletRows(await ordered.where({ ownerId }).all());
    }

    if (scope.mode === 'rider') {
      return this.presentWalletRows(await ordered.where({ userId: scope.userId }).all());
    }

    const agent = await this.prisma.db.orm.public.Agent.first({ userId: scope.userId });
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    return this.presentWalletRows(await ordered.where({ agentId: agent.id }).all());
  }

  async findOne(id: number, ctx: ReadScopeContext) {
    const wallet = await this.walletQuery().first({ id });

    if (!wallet) {
      throw new NotFoundException(`Wallet with id ${id} not found`);
    }

    const scope = walletReadScope(ctx);
    if (scope.mode === 'owner') {
      const ownerId = await resolveFleetOwnerId(this.prisma, scope.userId, 'owner');
      if (wallet.ownerId !== ownerId) {
        denyOrNotFoundForScopedRead(ctx, 'not_owner');
      }
    } else if (scope.mode === 'rider') {
      if (wallet.userId !== scope.userId) {
        denyOrNotFoundForScopedRead(ctx, 'not_owner');
      }
    } else if (scope.mode === 'agent') {
      const agent = await this.prisma.db.orm.public.Agent.first({ userId: scope.userId });
      if (!agent || wallet.agentId !== agent.id) {
        denyOrNotFoundForScopedRead(ctx, 'not_owner');
      }
    }

    return this.presentWalletRow(wallet as WalletWithHolders);
  }

  async create(data: CreateWalletDto): Promise<Wallet> {
    const owner = await this.prisma.db.orm.public.Owner.first({ id: data.ownerId });
    if (!owner) {
      apiBadRequest(WalletsCodes.ownerNotFound, { params: { ownerId: data.ownerId } });
    }

    const existing = await this.prisma.db.orm.public.Wallet.where({ ownerId: data.ownerId }).first();
    if (existing) {
      apiBadRequest(WalletsCodes.walletExists);
    }

    try {
      const created = await this.walletQuery().create({
        ownerId: data.ownerId,
        balance: asNumeric(0),
        currency: DEFAULT_CURRENCY,
      });
      return this.presentWalletRow(created as WalletWithHolders);
    } catch (error) {
      if (isUniqueViolation(error)) {
        apiBadRequest(WalletsCodes.walletExists);
      }

      throw error;
    }
  }

  async floatCredit(
    id: number,
    dto: FloatCreditDto,
    ctx: ReadScopeContext,
    actorUserId: number,
  ): Promise<LedgerTransaction> {
    await this.findOne(id, ctx);

    return this.prisma.db.transaction(async (tx) =>
      this.ledger.creditFloatInTx(tx, {
        walletId: id,
        companyAccountId: dto.companyAccountId,
        amount: dto.amount,
        externalReference: dto.externalReference,
        actorUserId,
        description: dto.description,
      }),
    );
  }

  async listLedgerTransactions(id: number, ctx: ReadScopeContext) {
    await this.findOne(id, ctx);
    return this.ledger.listTransactionsForWallet(id);
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
