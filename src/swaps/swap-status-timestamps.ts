import type { SwapStatus } from '../prisma/types.js';

export type SwapStatusTimestampField =
  | 'assignedAt'
  | 'collectedAt'
  | 'installedAt'
  | 'completedAt'
  | 'failedAt'
  | 'cancelledAt';

export function statusTimestampsForTransition(
  status: SwapStatus,
  at: Date = new Date(),
): Partial<Record<SwapStatusTimestampField, Date>> {
  switch (status) {
    case 'assigned':
      return { assignedAt: at };
    case 'collected':
      return { collectedAt: at };
    case 'installed':
      return { installedAt: at };
    case 'completed':
      return { completedAt: at };
    case 'failed':
      return { failedAt: at };
    case 'cancelled':
      return { cancelledAt: at };
    default:
      return {};
  }
}
