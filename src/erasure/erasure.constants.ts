import type { UserType } from '../prisma/types.js';

/** Account types that must wait for admin approval before erasure runs. */
/** Back-office / station roles that must wait for `system:admin` approval. */
export const STAFF_ERASURE_USER_TYPES = new Set<UserType>([
  'admin',
  'office',
  'office_manager',
  'swapper',
]);

/** Self-confirm with password — erasure runs immediately (no admin queue). */
export const SELF_CONFIRM_ERASURE_USER_TYPES = new Set<UserType>([
  'rider',
  'owner',
  'agent',
  'viewer',
]);

export const NON_TERMINAL_SWAP_STATUSES = [
  'initiated',
  'assigned',
  'collected',
  'installed',
] as const;