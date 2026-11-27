import { describe, expect, it } from 'vitest';
import { buildTopUpReceiptDocument } from './top-up-receipt.builder.js';

describe('buildTopUpReceiptDocument', () => {
  it('builds French text lines by default', () => {
    const document = buildTopUpReceiptDocument({
      receiptNumber: 'TU-2026-000001',
      issuedAt: new Date('2026-11-27T10:00:00.000Z'),
      locale: 'fr',
      agent: { id: 1, name: 'Agent A' },
      rider: { userId: 2, name: 'Jean Moto', phone: '+250700000000' },
      wallet: { id: 3, currency: 'USD', balanceBefore: 10, balanceAfter: 60 },
      quote: {
        cashCollected: 50,
        discountAmount: 0,
        taxableBase: 50,
        taxAmount: 0,
        taxRateBps: 0,
        walletCredit: 50,
        pricingVersion: '2026-11-27',
      },
      ledgerTransactionId: 99,
    });

    expect(document.locale).toBe('fr');
    expect(document.layout.columns).toBe(32);
    expect(document.textLines.some((line) => line.includes('RECU DE RECHARGE'))).toBe(true);
    expect(document.textLines.some((line) => line.includes('TU-2026-000001'))).toBe(true);
    expect(document.textLines.some((line) => line.includes('Crédit portefeuille'))).toBe(true);
  });

  it('marks duplicate banner when reprint is true', () => {
    const document = buildTopUpReceiptDocument({
      receiptNumber: 'TU-2026-000002',
      issuedAt: new Date('2026-11-27T10:00:00.000Z'),
      locale: 'fr',
      reprint: true,
      agent: { id: 1, name: 'Agent A' },
      rider: { userId: 2, name: 'Jean Moto' },
      wallet: { id: 3, currency: 'USD', balanceBefore: 0, balanceAfter: 25 },
      quote: {
        cashCollected: 25,
        discountAmount: 0,
        taxableBase: 25,
        taxAmount: 0,
        taxRateBps: 0,
        walletCredit: 25,
        pricingVersion: '2026-11-27',
      },
      ledgerTransactionId: 100,
    });

    expect(document.textLines.some((line) => line.includes('DUPLICATA'))).toBe(true);
  });
});