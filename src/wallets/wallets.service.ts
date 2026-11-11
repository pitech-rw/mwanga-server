import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { ReadScopeContext } from '../auth/read-scope.js';
import { denyOrNotFoundForScopedRead, walletReadScope } from '../auth/read-scope.js';
import { resolveFleetOwnerId } from '../fleet/resolve-fleet.js';
import { LedgerService } from '../ledger/ledger.service.js';
import { asNumeric, isUniqueViolation } from '../prisma/errors.js';
import type { LedgerTransaction, Wallet } from '../prisma/types.js';
import { PrismaService } from '../prisma.service.js';
import { CreateWalletDto } from './create-wallet.dto.js';
import type { FloatCreditDto } from './float-credit.dto.js';

@Injectable()
export class WalletsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
  ) {}

  private walletQuery() {
    return this.prisma.db.orm.public.Wallet.include('owner').include('riderUser').include('agent');
  }

  async findAll(ctx: ReadScopeContext) {
    const scope = walletReadScope(ctx);
    const ordered = this.walletQuery().orderBy((wallet) => wallet.createdAt.desc());

    if (scope.mode === 'unrestricted') {
      return ordered.all();
    }

    if (scope.mode === 'owner') {
      const ownerId = await resolveFleetOwnerId(this.prisma, scope.userId, 'owner');
      return ordered.where({ ownerId }).all();
    }

    if (scope.mode === 'rider') {
      return ordered.where({ userId: scope.userId }).all();
    }

    const agent = await this.prisma.db.orm.public.Agent.first({ userId: scope.userId });
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    return ordered.where({ agentId: agent.id }).all();
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

    return wallet;
  }

  async create(data: CreateWalletDto): Promise<Wallet> {
    const owner = await this.prisma.db.orm.public.Owner.first({ id: data.ownerId });
    if (!owner) {
      throw new BadRequestException(`Owner with id ${data.ownerId} not found`);
    }

    const existing = await this.prisma.db.orm.public.Wallet.where({ ownerId: data.ownerId }).first();
    if (existing) {
      throw new BadRequestException('A wallet already exists for this owner');
    }

    try {
      return await this.walletQuery().create({
        ownerId: data.ownerId,
        balance: asNumeric(0),
        currency: data.currency,
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException('A wallet already exists for this owner');
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
