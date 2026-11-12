import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { asNumeric, isUniqueViolation } from '../prisma/errors.js';
import type { LedgerTransaction, Wallet } from '../prisma/types.js';
import { PrismaService } from '../prisma.service.js';
import { signedDeltaForLine } from './ledger-balance.js';
import type { LedgerLineInput, PostTransactionInput } from './ledger.types.js';
import { DEFAULT_REVENUE_ACCOUNT_CODE } from './ledger.types.js';

export type LedgerTx = Parameters<Parameters<PrismaService['db']['transaction']>[0]>[0];

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  private lineAccountKind(line: LedgerLineInput): 'company' | 'wallet' | 'revenue' {
    const targets = [line.companyAccountId, line.walletId, line.revenueAccountId].filter(
      (id) => id != null,
    );
    if (targets.length !== 1) {
      throw new BadRequestException('Each ledger line must reference exactly one account');
    }
    if (line.companyAccountId != null) {
      return 'company';
    }
    if (line.walletId != null) {
      return 'wallet';
    }
    return 'revenue';
  }

  private validateLines(lines: readonly [LedgerLineInput, LedgerLineInput]) {
    if (lines.length !== 2) {
      throw new BadRequestException('Ledger transactions require exactly two lines');
    }

    const [a, b] = lines;
    for (const line of lines) {
      if (!(line.amount > 0)) {
        throw new BadRequestException('Ledger line amount must be positive');
      }
      this.lineAccountKind(line);
    }

    if (a.amount !== b.amount) {
      throw new BadRequestException('Debit and credit amounts must match');
    }

    const directions = new Set(lines.map((line) => line.direction));
    if (!directions.has('debit') || !directions.has('credit')) {
      throw new BadRequestException('Ledger transactions require one debit and one credit line');
    }
  }

  private async applyLineBalanceUpdate(tx: LedgerTx, line: LedgerLineInput): Promise<void> {
    const kind = this.lineAccountKind(line);
    const delta = signedDeltaForLine(kind, line.direction, line.amount);

    if (line.companyAccountId != null) {
      const account = await tx.orm.public.CompanyAccount.first({ id: line.companyAccountId });
      if (!account) {
        throw new NotFoundException(`Company account ${line.companyAccountId} not found`);
      }
      const next = Number(account.balance) + delta;
      if (next < 0) {
        throw new BadRequestException('Insufficient company account balance');
      }
      await tx.orm.public.CompanyAccount.where({ id: account.id }).update({
        balance: asNumeric(next),
      });
      return;
    }

    if (line.walletId != null) {
      const wallet = await tx.orm.public.Wallet.first({ id: line.walletId });
      if (!wallet) {
        throw new NotFoundException(`Wallet ${line.walletId} not found`);
      }
      const next = Number(wallet.balance) + delta;
      if (next < 0) {
        throw new BadRequestException('Insufficient wallet balance');
      }
      await tx.orm.public.Wallet.where({ id: wallet.id }).update({
        balance: asNumeric(next),
      });
      return;
    }

    if (line.revenueAccountId != null) {
      const revenue = await tx.orm.public.RevenueAccount.first({ id: line.revenueAccountId });
      if (!revenue) {
        throw new NotFoundException(`Revenue account ${line.revenueAccountId} not found`);
      }
      const next = Number(revenue.balance) + delta;
      await tx.orm.public.RevenueAccount.where({ id: revenue.id }).update({
        balance: asNumeric(next),
      });
    }
  }

  async postTransaction(tx: LedgerTx, input: PostTransactionInput): Promise<LedgerTransaction> {
    this.validateLines(input.lines);

    const [lineA, lineB] = input.lines;

    if (input.kind === 'float_topup') {
      const hasCompanyDebit = input.lines.some(
        (line) => line.direction === 'debit' && line.companyAccountId != null,
      );
      const hasWalletCredit = input.lines.some(
        (line) => line.direction === 'credit' && line.walletId != null,
      );
      if (!hasCompanyDebit || !hasWalletCredit) {
        throw new BadRequestException('Float top-up must debit company account and credit wallet');
      }
      if (!input.externalReference?.trim()) {
        throw new BadRequestException('externalReference is required for float top-up');
      }
    }

    if (input.kind === 'agent_topup') {
      const debitWallet = input.lines.find(
        (line) => line.direction === 'debit' && line.walletId != null,
      );
      const creditWallet = input.lines.find(
        (line) => line.direction === 'credit' && line.walletId != null,
      );
      if (
        debitWallet?.walletId == null ||
        creditWallet?.walletId == null ||
        debitWallet.walletId === creditWallet.walletId
      ) {
        throw new BadRequestException(
          'Agent top-up must debit the agent wallet and credit a different wallet',
        );
      }
      if (!input.externalReference?.trim()) {
        throw new BadRequestException('externalReference is required for agent top-up');
      }
    }

    if (input.kind === 'swap_fee') {
      const hasWalletDebit = input.lines.some(
        (line) => line.direction === 'debit' && line.walletId != null,
      );
      const hasRevenueCredit = input.lines.some(
        (line) => line.direction === 'credit' && line.revenueAccountId != null,
      );
      if (!hasWalletDebit || !hasRevenueCredit) {
        throw new BadRequestException('Swap fee must debit wallet and credit revenue account');
      }
    }

    let created: LedgerTransaction;
    try {
      created = await tx.orm.public.LedgerTransaction.create({
        kind: input.kind,
        externalReference: input.externalReference?.trim() || undefined,
        idempotencyKey: input.idempotencyKey,
        actorUserId: input.actorUserId,
        walletId: input.walletId,
        swapTransactionId: input.swapTransactionId,
        description: input.description,
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('A ledger transaction with this reference already exists');
      }
      throw error;
    }

    await tx.orm.public.LedgerLine.create({
      transactionId: created.id,
      direction: lineA.direction,
      amount: asNumeric(lineA.amount),
      companyAccountId: lineA.companyAccountId,
      walletId: lineA.walletId,
      revenueAccountId: lineA.revenueAccountId,
    });

    await tx.orm.public.LedgerLine.create({
      transactionId: created.id,
      direction: lineB.direction,
      amount: asNumeric(lineB.amount),
      companyAccountId: lineB.companyAccountId,
      walletId: lineB.walletId,
      revenueAccountId: lineB.revenueAccountId,
    });

    await this.applyLineBalanceUpdate(tx, lineA);
    await this.applyLineBalanceUpdate(tx, lineB);

    const loaded = await tx.orm.public.LedgerTransaction.include('lines').first({ id: created.id });
    if (!loaded) {
      throw new NotFoundException('Ledger transaction was not created');
    }

    return loaded;
  }

  async creditFloatInTx(
    tx: LedgerTx,
    params: {
      walletId: number;
      companyAccountId: number;
      amount: number;
      externalReference: string;
      actorUserId?: number;
      description?: string;
    },
  ): Promise<LedgerTransaction> {
    const wallet = await tx.orm.public.Wallet.first({ id: params.walletId });
    if (!wallet) {
      throw new NotFoundException(`Wallet ${params.walletId} not found`);
    }

    const company = await tx.orm.public.CompanyAccount.first({ id: params.companyAccountId });
    if (!company) {
      throw new NotFoundException(`Company account ${params.companyAccountId} not found`);
    }

    if (wallet.currency !== company.currency) {
      throw new BadRequestException('Wallet and company account currency must match');
    }

    this.assertCompanyAccountSolvent(company, params.amount);

    return this.postTransaction(tx, {
      kind: 'float_topup',
      walletId: wallet.id,
      actorUserId: params.actorUserId,
      externalReference: params.externalReference,
      description: params.description,
      lines: [
        {
          direction: 'debit',
          amount: params.amount,
          companyAccountId: company.id,
        },
        {
          direction: 'credit',
          amount: params.amount,
          walletId: wallet.id,
        },
      ],
    });
  }

  async transferAgentFloatInTx(
    tx: LedgerTx,
    params: {
      agentWalletId: number;
      targetWalletId: number;
      amount: number;
      externalReference: string;
      actorUserId: number;
      description?: string;
    },
  ): Promise<LedgerTransaction> {
    if (!(params.amount > 0)) {
      throw new BadRequestException('Top-up amount must be positive');
    }

    const source = await tx.orm.public.Wallet.first({ id: params.agentWalletId });
    if (!source) {
      throw new NotFoundException(`Wallet ${params.agentWalletId} not found`);
    }
    if (source.agentId == null) {
      throw new BadRequestException('Source wallet is not an agent float');
    }

    const agent = await tx.orm.public.Agent.first({ id: source.agentId });
    if (!agent || agent.userId !== params.actorUserId) {
      throw new BadRequestException('Agent float does not belong to the acting user');
    }

    const target = await tx.orm.public.Wallet.first({ id: params.targetWalletId });
    if (!target) {
      throw new NotFoundException(`Wallet ${params.targetWalletId} not found`);
    }

    const targetIsRider = target.userId != null && target.ownerId == null && target.agentId == null;
    const targetIsOwner = target.ownerId != null && target.userId == null && target.agentId == null;
    if (!targetIsRider && !targetIsOwner) {
      throw new BadRequestException('Top-up target must be a rider or owner wallet');
    }

    if (source.currency !== target.currency) {
      throw new BadRequestException('Agent float and target wallet currency must match');
    }

    this.assertWalletSolvent(source, params.amount);

    return this.postTransaction(tx, {
      kind: 'agent_topup',
      walletId: target.id,
      actorUserId: params.actorUserId,
      externalReference: params.externalReference,
      description: params.description,
      lines: [
        {
          direction: 'debit',
          amount: params.amount,
          walletId: source.id,
        },
        {
          direction: 'credit',
          amount: params.amount,
          walletId: target.id,
        },
      ],
    });
  }

  async resolveDefaultRevenueAccount(tx: LedgerTx) {
    const revenue = await tx.orm.public.RevenueAccount.where({
      code: DEFAULT_REVENUE_ACCOUNT_CODE,
    }).first();

    if (!revenue) {
      throw new BadRequestException(
        `Revenue account "${DEFAULT_REVENUE_ACCOUNT_CODE}" is not configured. Run seed:ledger-accounts.`,
      );
    }

    return revenue;
  }

  async captureSwapFeeInTx(
    tx: LedgerTx,
    params: {
      walletId: number;
      amount: number;
      swapTransactionId: number;
      description?: string;
    },
  ): Promise<{ ledgerTransaction: LedgerTransaction; walletBalanceAfter: number }> {
    if (!(params.amount > 0)) {
      throw new BadRequestException('Swap fee amount must be positive');
    }

    const wallet = await tx.orm.public.Wallet.first({ id: params.walletId });
    if (!wallet) {
      throw new NotFoundException(`Wallet ${params.walletId} not found`);
    }

    this.assertWalletSolvent(wallet, params.amount);

    const revenue = await this.resolveDefaultRevenueAccount(tx);
    if (wallet.currency !== revenue.currency) {
      throw new BadRequestException('Wallet and revenue account currency must match');
    }

    const ledgerTransaction = await this.postTransaction(tx, {
      kind: 'swap_fee',
      walletId: wallet.id,
      swapTransactionId: params.swapTransactionId,
      description: params.description ?? `Swap fee for transaction ${params.swapTransactionId}`,
      lines: [
        {
          direction: 'debit',
          amount: params.amount,
          walletId: wallet.id,
        },
        {
          direction: 'credit',
          amount: params.amount,
          revenueAccountId: revenue.id,
        },
      ],
    });

    const updatedWallet = await tx.orm.public.Wallet.first({ id: wallet.id });
    if (!updatedWallet) {
      throw new NotFoundException(`Wallet ${wallet.id} not found after fee capture`);
    }

    return {
      ledgerTransaction,
      walletBalanceAfter: Number(updatedWallet.balance),
    };
  }

  assertWalletSolvent(wallet: Wallet, debitAmount: number): void {
    const balance = Number(wallet.balance);
    if (balance < debitAmount) {
      throw new BadRequestException('Insufficient wallet balance');
    }
  }

  /** Float top-up debits the company account by `debitAmount`. */
  assertCompanyAccountSolvent(
    company: { balance: string | number },
    debitAmount: number,
  ): void {
    if (!(debitAmount > 0)) {
      throw new BadRequestException('Top-up amount must be positive');
    }
    const balance = Number(company.balance);
    if (balance < debitAmount) {
      throw new BadRequestException('Insufficient company account balance');
    }
  }

  async listTransactionsForWallet(walletId: number, limit = 50) {
    const [byHeader, lines] = await Promise.all([
      this.prisma.db.orm.public.LedgerTransaction.include('lines').where({ walletId }).all(),
      this.prisma.db.orm.public.LedgerLine.where({ walletId }).all(),
    ]);
    const seen = new Set(byHeader.map((row) => row.id));
    const missingIds = [...new Set(lines.map((line) => line.transactionId))].filter((id) => !seen.has(id));
    const extras = (
      await Promise.all(
        missingIds.map((id) => this.prisma.db.orm.public.LedgerTransaction.include('lines').first({ id })),
      )
    ).filter((row) => row != null);

    return [...byHeader, ...extras]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async listTransactionsForCompanyAccount(companyAccountId: number, limit = 50) {
    const lines = await this.prisma.db.orm.public.LedgerLine.where({ companyAccountId }).all();
    const ids = [...new Set(lines.map((line) => line.transactionId))];
    const transactions = (
      await Promise.all(
        ids.map((id) => this.prisma.db.orm.public.LedgerTransaction.include('lines').first({ id })),
      )
    ).filter((row) => row != null);

    return transactions
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }
}
