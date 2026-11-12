import type { LedgerDirection } from '../prisma/types.js';

export type BalanceAccountKind = 'company' | 'wallet' | 'revenue';

/** Signed delta applied to cached account balances (positive increases balance). */
export function signedDeltaForLine(
  accountKind: BalanceAccountKind,
  direction: LedgerDirection,
  amount: number,
): number {
  const magnitude = Math.abs(amount);
  switch (accountKind) {
    // Company accounts track cash available for float; debiting pays out to a wallet.
    case 'company':
      return direction === 'debit' ? -magnitude : magnitude;
    case 'wallet':
    case 'revenue':
      return direction === 'credit' ? magnitude : -magnitude;
    default: {
      const _exhaustive: never = accountKind;
      return _exhaustive;
    }
  }
}
