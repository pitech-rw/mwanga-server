import type { ReceiptLocale } from '../receipt-config.js';
import { receiptEn } from './en.js';
import { receiptFr } from './fr.js';

export type ReceiptMessageCatalog = {
  title: string;
  receiptNo: string;
  date: string;
  agent: string;
  rider: string;
  phone: string;
  cashCollected: string;
  discount: string;
  tax: string;
  walletCredit: string;
  balanceBefore: string;
  balanceAfter: string;
  ledgerRef: string;
  thankYou: string;
  duplicate: string;
  currencyLine: (currency: string) => string;
};

export function receiptMessages(locale: ReceiptLocale): ReceiptMessageCatalog {
  return locale === 'en' ? receiptEn : receiptFr;
}