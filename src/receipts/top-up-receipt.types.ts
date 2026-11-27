import type { ReceiptLocale } from './receipt-config.js';

export type AgentTopUpReceiptDocument = {
  kind: 'agent_rider_topup';
  locale: ReceiptLocale;
  receiptNumber: string;
  issuedAt: string;
  reprint: boolean;
  merchant: {
    name: string;
    tin?: string;
    address?: string;
  };
  agent: {
    id: number;
    name: string;
  };
  rider: {
    userId: number;
    name: string;
    phone?: string;
  };
  wallet: {
    id: number;
    currency: string;
    balanceBefore: number;
    balanceAfter: number;
  };
  amounts: {
    currency: string;
    cashCollected: number;
    discountAmount: number;
    taxAmount: number;
    walletCredit: number;
    taxRateBps: number;
    discountCode?: string;
  };
  ledgerTransactionId: number;
  layout: {
    paperWidthMm: 58;
    columns: 32;
  };
  textLines: string[];
};

export type AgentTopUpResponse = {
  transaction: import('../prisma/types.js').LedgerTransaction;
  receipt: AgentTopUpReceiptDocument | null;
};

export function parseReceiptDocument(raw: string): AgentTopUpReceiptDocument {
  return JSON.parse(raw) as AgentTopUpReceiptDocument;
}

export function serializeReceiptDocument(document: AgentTopUpReceiptDocument): string {
  return JSON.stringify(document);
}