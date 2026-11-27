import { DEFAULT_CURRENCY } from '../config/default-currency.js';
import type { Agent, Owner, User, Wallet } from '../prisma/types.js';
import { presentSafeUser } from './present-safe-user.js';

export type WalletWithHolders = Wallet & {
  owner?: Owner | null;
  riderUser?: User | null;
  agent?: Agent | null;
};

function userIsErased(user: User | null | undefined): boolean {
  return user != null && user.erasedAt != null;
}

/** Portal user id for the wallet holder, when the holder is backed by a User row. */
export function walletHolderUserId(wallet: WalletWithHolders): number | null {
  if (wallet.userId != null) {
    return wallet.userId;
  }
  if (wallet.agent?.userId != null) {
    return wallet.agent.userId;
  }
  if (wallet.owner?.userId != null) {
    return wallet.owner.userId;
  }
  return null;
}

export function walletHolderLinksErasedUser(
  wallet: WalletWithHolders,
  visibleUserIds: ReadonlySet<number>,
): boolean {
  const holderUserId = walletHolderUserId(wallet);
  if (holderUserId == null) {
    return false;
  }
  return !visibleUserIds.has(holderUserId);
}

/** Omit erased rider users from includes; sanitize visible rider rows. */
export function presentSafeWallet<T extends WalletWithHolders>(wallet: T): T {
  const currency =
    typeof wallet.currency === 'string' && wallet.currency.trim() !== ''
      ? wallet.currency.trim()
      : DEFAULT_CURRENCY;
  const next = { ...wallet, currency };

  if (next.riderUser) {
    if (userIsErased(next.riderUser)) {
      delete next.riderUser;
    } else {
      next.riderUser = presentSafeUser(next.riderUser) as typeof next.riderUser;
    }
  }

  return next;
}