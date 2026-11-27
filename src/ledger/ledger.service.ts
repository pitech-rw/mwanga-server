import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DEFAULT_CURRENCY } from '../config/default-currency.js';
import { apiBadRequest } from '../errors/api-error.js';
import { LedgerCodes } from '../errors/codes.js';
import { asNumeric, isUniqueViolation } from '../prisma/errors.js';
import type { LedgerTransaction, Wallet } from '../prisma/types.js';
import { PrismaService } from '../prisma.service.js';
import { signedDeltaForLine } from './ledger-balance.js';
import type { LedgerLineInput, PostTransactionInput } from './ledger.types.js';
import {
  COMPANY_FLOAT_SOURCE_REVENUE_CODE,
  DEFAULT_REVENUE_ACCOUNT_CODE,
} from './ledger.types.js';

export type LedgerTx = Parameters<Parameters<PrismaService['db']['transaction']>[0]>[0];

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  private lineAccountKind(line: LedgerLineInput): 'company' | 'wallet' | 'revenue' {
    const targets = [line.companyAccountId, line.walletId, line.revenueAccountId].filter(
      (id) => id != null,
    );
    if (targets.length !== 1) {
      apiBadRequest(LedgerCodes.lineSingleAccount);
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
      apiBadRequest(LedgerCodes.exactlyTwoLines);
    }

    const [a, b] = lines;
    for (const line of lines) {
      if (!(line.amount > 0)) {
        apiBadRequest(LedgerCodes.positiveAmount);
      }
      this.lineAccountKind(line);
    }

    if (a.amount !== b.amount) {
      apiBadRequest(LedgerCodes.debitCreditMatch);
    }

    const directions = new Set(lines.map((line) => line.direction));
    if (!directions.has('debit') || !directions.has('credit')) {
      apiBadRequest(LedgerCodes.oneDebitOneCredit);
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
        apiBadRequest(LedgerCodes.insufficientCompanyBalance);
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
        apiBadRequest(LedgerCodes.insufficientWalletBalance);
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
        apiBadRequest(LedgerCodes.floatTopUpAccounts);
      }
      if (!input.externalReference?.trim()) {
        apiBadRequest(LedgerCodes.floatTopUpReferenceRequired);
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
        apiBadRequest(LedgerCodes.agentTopUpWalletPair);
      }
      if (!input.externalReference?.trim()) {
        apiBadRequest(LedgerCodes.agentTopUpReferenceRequired);
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
        apiBadRequest(LedgerCodes.swapFeeAccounts);
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
      apiBadRequest(LedgerCodes.currencyMismatchWalletCompany);
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

  async resolveCompanyFloatSourceAccount(tx: LedgerTx) {
    const code = COMPANY_FLOAT_SOURCE_REVENUE_CODE;
    const existing = await tx.orm.public.RevenueAccount.where({ code }).first();
    if (existing) {
      return existing;
    }

    try {
      return await tx.orm.public.RevenueAccount.create({
        code,
        name: 'Company Float Source',
        currency: DEFAULT_CURRENCY,
        balance: asNumeric(0),
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        const raced = await tx.orm.public.RevenueAccount.where({ code }).first();
        if (raced) {
          return raced;
        }
      }
      throw error;
    }
  }

  async creditCompanyFloatInTx(
    tx: LedgerTx,
    params: {
      companyAccountId: number;
      amount: number;
      externalReference: string;
      actorUserId?: number;
      description?: string;
    },
  ): Promise<LedgerTransaction> {
    if (!(params.amount > 0)) {
      apiBadRequest(LedgerCodes.topUpPositive);
    }
    if (!params.externalReference?.trim()) {
      apiBadRequest(LedgerCodes.companyFloatCreditReferenceRequired);
    }

    const company = await tx.orm.public.CompanyAccount.first({ id: params.companyAccountId });
    if (!company) {
      throw new NotFoundException(`Company account ${params.companyAccountId} not found`);
    }

    const source = await this.resolveCompanyFloatSourceAccount(tx);
    if (company.currency !== source.currency) {
      apiBadRequest(LedgerCodes.currencyMismatchCompanyRevenue);
    }

    return this.postTransaction(tx, {
      kind: 'adjustment',
      actorUserId: params.actorUserId,
      externalReference: params.externalReference,
      description: params.description,
      lines: [
        {
          direction: 'debit',
          amount: params.amount,
          revenueAccountId: source.id,
        },
        {
          direction: 'credit',
          amount: params.amount,
          companyAccountId: company.id,
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
      idempotencyKey?: string;
      actorUserId: number;
      description?: string;
    },
  ): Promise<LedgerTransaction> {
    if (!(params.amount > 0)) {
      apiBadRequest(LedgerCodes.topUpPositive);
    }

    const source = await tx.orm.public.Wallet.first({ id: params.agentWalletId });
    if (!source) {
      throw new NotFoundException(`Wallet ${params.agentWalletId} not found`);
    }
    if (source.agentId == null) {
      apiBadRequest(LedgerCodes.sourceNotAgentFloat);
    }

    const agent = await tx.orm.public.Agent.first({ id: source.agentId });
    if (!agent || agent.userId !== params.actorUserId) {
      apiBadRequest(LedgerCodes.agentFloatWrongUser);
    }

    const target = await tx.orm.public.Wallet.first({ id: params.targetWalletId });
    if (!target) {
      throw new NotFoundException(`Wallet ${params.targetWalletId} not found`);
    }

    const targetIsRider = target.userId != null && target.ownerId == null && target.agentId == null;
    const targetIsOwner = target.ownerId != null && target.userId == null && target.agentId == null;
    if (!targetIsRider && !targetIsOwner) {
      apiBadRequest(LedgerCodes.topUpTargetRiderOrOwner);
    }

    if (source.currency !== target.currency) {
      apiBadRequest(LedgerCodes.agentTargetCurrencyMismatch);
    }

    this.assertWalletSolvent(source, params.amount);

    return this.postTransaction(tx, {
      kind: 'agent_topup',
      walletId: target.id,
      actorUserId: params.actorUserId,
      externalReference: params.externalReference,
      idempotencyKey: params.idempotencyKey,
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
      apiBadRequest(LedgerCodes.revenueAccountMissing, { params: { code: DEFAULT_REVENUE_ACCOUNT_CODE } });
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
      apiBadRequest(LedgerCodes.swapFeePositive);
    }

    const wallet = await tx.orm.public.Wallet.first({ id: params.walletId });
    if (!wallet) {
      throw new NotFoundException(`Wallet ${params.walletId} not found`);
    }

    this.assertWalletSolvent(wallet, params.amount);

    const revenue = await this.resolveDefaultRevenueAccount(tx);
    if (wallet.currency !== revenue.currency) {
      apiBadRequest(LedgerCodes.currencyMismatchWalletRevenue);
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
      apiBadRequest(LedgerCodes.insufficientWalletBalance);
    }
  }

  /** Float top-up debits the company account by `debitAmount`. */
  assertCompanyAccountSolvent(
    company: { balance: string | number },
    debitAmount: number,
  ): void {
    if (!(debitAmount > 0)) {
      apiBadRequest(LedgerCodes.topUpPositive);
    }
    const balance = Number(company.balance);
    if (balance < debitAmount) {
      apiBadRequest(LedgerCodes.insufficientCompanyBalance);
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

  async listTransactionsForActor(
    actorUserId: number,
    options?: { kind?: 'float_topup' | 'agent_topup' | 'swap_fee' | 'adjustment' },
    limit = 100,
  ) {
    const query = { actorUserId, ...(options?.kind ? { kind: options.kind } : {}) };
    const rows = await this.prisma.db.orm.public.LedgerTransaction.include('lines').where(query).all();
    return rows
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }
}
