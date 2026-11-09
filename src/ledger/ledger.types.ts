import type { LedgerDirection, LedgerTransactionKind } from '../prisma/types.js';

export type LedgerLineInput = {
  direction: LedgerDirection;
  amount: number;
  companyAccountId?: number;
  walletId?: number;
  revenueAccountId?: number;
};

export type PostTransactionInput = {
  kind: LedgerTransactionKind;
  lines: readonly [LedgerLineInput, LedgerLineInput];
  externalReference?: string;
  idempotencyKey?: string;
  actorUserId?: number;
  walletId?: number;
  swapTransactionId?: number;
  description?: string;
};

export const DEFAULT_REVENUE_ACCOUNT_CODE = 'swap_fees';
