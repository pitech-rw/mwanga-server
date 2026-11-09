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

  async listTransactionsForWallet(walletId: number, limit = 50) {
    const rows = await this.prisma.db.orm.public.LedgerTransaction.include('lines')
      .where({ walletId })
      .orderBy((row) => row.createdAt.desc())
      .all();
    return rows.slice(0, limit);
  }
}
