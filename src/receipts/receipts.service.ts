import { Injectable, NotFoundException } from '@nestjs/common';
import { apiBadRequest } from '../errors/api-error.js';
import { ReceiptCodes } from '../errors/codes.js';
import { LedgerService } from '../ledger/ledger.service.js';
import { asNumeric } from '../prisma/errors.js';
import type { AgentTopUpReceipt, LedgerTransaction, Wallet } from '../prisma/types.js';
import { PrismaService } from '../prisma.service.js';
import { parseReceiptLocale, readReceiptDefaultLocale, type ReceiptLocale } from './receipt-config.js';
import { allocateReceiptNumberInTx } from './receipt-sequence.js';
import { buildTopUpReceiptDocument } from './top-up-receipt.builder.js';
import { quoteTopUp } from './top-up-pricing.js';
import {
  parseReceiptDocument,
  serializeReceiptDocument,
  type AgentTopUpReceiptDocument,
  type AgentTopUpResponse,
} from './top-up-receipt.types.js';

function isRiderWallet(wallet: Wallet): boolean {
  return wallet.userId != null && wallet.ownerId == null && wallet.agentId == null;
}

function isOwnerWallet(wallet: Wallet): boolean {
  return wallet.ownerId != null && wallet.userId == null && wallet.agentId == null;
}

export type RiderTopUpParams = {
  actorUserId: number;
  agentId: number;
  agentName: string;
  agentWalletId: number;
  targetWalletId: number;
  amount: number;
  discountCode?: string;
  note?: string;
  idempotencyKey?: string;
  locale?: string;
};

@Injectable()
export class ReceiptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
  ) {}

  async findByIdempotencyKey(idempotencyKey: string): Promise<AgentTopUpResponse | null> {
    const receipt = await this.prisma.db.orm.public.AgentTopUpReceipt.first({
      idempotencyKey,
    });
    if (!receipt) {
      const ledger = await this.prisma.db.orm.public.LedgerTransaction.include('lines').first({
        idempotencyKey,
      });
      if (!ledger) {
        return null;
      }
      return { transaction: ledger, receipt: null };
    }

    const transaction = await this.prisma.db.orm.public.LedgerTransaction.include('lines').first({
      id: receipt.ledgerTransactionId,
    });
    if (!transaction) {
      return null;
    }

    return {
      transaction,
      receipt: parseReceiptDocument(receipt.document),
    };
  }

  async topUpWithReceipt(params: RiderTopUpParams): Promise<AgentTopUpResponse> {
    const idempotencyKey = params.idempotencyKey?.trim() || undefined;
    if (idempotencyKey) {
      const existing = await this.findByIdempotencyKey(idempotencyKey);
      if (existing) {
        return existing;
      }
    }

    const locale = parseReceiptLocale(params.locale, readReceiptDefaultLocale());

    const target = await this.prisma.db.orm.public.Wallet.first({ id: params.targetWalletId });
    if (!target) {
      throw new NotFoundException(`Wallet ${params.targetWalletId} not found`);
    }

    if (isOwnerWallet(target)) {
      return this.ownerTopUpWithoutReceipt(params, idempotencyKey);
    }

    if (!isRiderWallet(target)) {
      apiBadRequest(ReceiptCodes.riderWalletRequired);
    }

    const quote = quoteTopUp(params.amount, params.discountCode);
    const rider = await this.prisma.db.orm.public.User.first({ id: target.userId! });
    if (!rider) {
      throw new NotFoundException(`Rider user ${target.userId} not found`);
    }

    const balanceBefore = Number(target.balance);
    const issuedAt = new Date();

    const result = await this.prisma.db.transaction(async (tx) => {
      const receiptNumber = await allocateReceiptNumberInTx(tx, issuedAt);

      const transaction = await this.ledger.transferAgentFloatInTx(tx, {
        agentWalletId: params.agentWalletId,
        targetWalletId: params.targetWalletId,
        amount: quote.walletCredit,
        externalReference: receiptNumber,
        idempotencyKey,
        actorUserId: params.actorUserId,
        description: params.note,
      });

      const updatedWallet = await tx.orm.public.Wallet.first({ id: target.id });
      const balanceAfter = updatedWallet ? Number(updatedWallet.balance) : balanceBefore + quote.walletCredit;

      const document = buildTopUpReceiptDocument({
        receiptNumber,
        issuedAt: transaction.createdAt ?? issuedAt,
        locale,
        agent: { id: params.agentId, name: params.agentName },
        rider: {
          userId: rider.id,
          name: `${rider.firstName} ${rider.lastName}`.trim(),
          phone: rider.phone,
        },
        wallet: {
          id: target.id,
          currency: target.currency,
          balanceBefore,
          balanceAfter,
        },
        quote,
        ledgerTransactionId: transaction.id,
      });

      await tx.orm.public.AgentTopUpReceipt.create({
        receiptNumber,
        ledgerTransactionId: transaction.id,
        idempotencyKey,
        agentId: params.agentId,
        actorUserId: params.actorUserId,
        riderUserId: rider.id,
        walletId: target.id,
        currency: target.currency,
        cashCollected: asNumeric(quote.cashCollected),
        discountAmount: asNumeric(quote.discountAmount),
        taxAmount: asNumeric(quote.taxAmount),
        walletCredit: asNumeric(quote.walletCredit),
        balanceBefore: asNumeric(balanceBefore),
        balanceAfter: asNumeric(balanceAfter),
        taxRateBps: quote.taxRateBps,
        discountCode: quote.discountCode,
        pricingVersion: quote.pricingVersion,
        locale,
        document: serializeReceiptDocument(document),
      });

      return { transaction, receipt: document };
    });

    return result;
  }

  private async ownerTopUpWithoutReceipt(
    params: RiderTopUpParams,
    idempotencyKey: string | undefined,
  ): Promise<AgentTopUpResponse> {
    const quote = quoteTopUp(params.amount, params.discountCode);
    const reference =
      idempotencyKey ??
      `OT-${params.actorUserId}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const transaction = await this.prisma.db.transaction((tx) =>
      this.ledger.transferAgentFloatInTx(tx, {
        agentWalletId: params.agentWalletId,
        targetWalletId: params.targetWalletId,
        amount: quote.walletCredit,
        externalReference: reference,
        idempotencyKey,
        actorUserId: params.actorUserId,
        description: params.note,
      }),
    );

    return { transaction, receipt: null };
  }

  async getReceiptForReprint(
    receiptNumber: string,
    actorUserId: number,
    isAdminBypass: boolean,
  ): Promise<AgentTopUpReceiptDocument> {
    const row = await this.prisma.db.orm.public.AgentTopUpReceipt.first({ receiptNumber });
    if (!row) {
      throw new NotFoundException('Receipt not found');
    }

    if (!isAdminBypass && row.actorUserId !== actorUserId) {
      apiBadRequest(ReceiptCodes.receiptAccessDenied);
    }

    await this.prisma.db.orm.public.AgentTopUpReceipt.where({ id: row.id }).update({
      reprintCount: row.reprintCount + 1,
    });

    const document = parseReceiptDocument(row.document);
    return { ...document, reprint: true };
  }

  async listMyReceipts(actorUserId: number, limit = 50): Promise<AgentTopUpReceipt[]> {
    const rows = await this.prisma.db.orm.public.AgentTopUpReceipt.where({ actorUserId }).all();
    return rows
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }
}