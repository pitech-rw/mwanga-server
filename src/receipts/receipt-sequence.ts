import type { LedgerTx } from '../ledger/ledger.service.js';
import { readReceiptSequencePrefix } from './receipt-config.js';

export function formatReceiptNumber(prefix: string, year: number, sequence: number): string {
  const padded = String(sequence).padStart(6, '0');
  return `${prefix}-${year}-${padded}`;
}

export async function allocateReceiptNumberInTx(
  tx: LedgerTx,
  issuedAt: Date,
): Promise<string> {
  const prefix = readReceiptSequencePrefix();
  const year = issuedAt.getUTCFullYear();

  let row = await tx.orm.public.ReceiptSequence.first({ id: 1 });
  if (!row) {
    row = await tx.orm.public.ReceiptSequence.create({
      id: 1,
      prefix,
      lastValue: 0,
    });
  }

  const next = row.lastValue + 1;
  await tx.orm.public.ReceiptSequence.where({ id: 1 }).update({
    prefix,
    lastValue: next,
  });

  return formatReceiptNumber(prefix, year, next);
}