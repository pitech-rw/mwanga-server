import { afterEach, describe, expect, it } from 'vitest';
import { quoteTopUp } from './top-up-pricing.js';

describe('quoteTopUp', () => {
  afterEach(() => {
    delete process.env['TOPUP_MIN'];
    delete process.env['TOPUP_MAX'];
    delete process.env['TOPUP_STEP'];
    delete process.env['TOPUP_TAX_RATE_BPS'];
    delete process.env['TOPUP_DISCOUNT_JSON'];
  });

  it('credits wallet with cash minus discount when tax is zero', () => {
    process.env['TOPUP_DISCOUNT_JSON'] = JSON.stringify({ WELCOME: { amountOff: 2 } });
    const quote = quoteTopUp(100, 'welcome');
    expect(quote.cashCollected).toBe(100);
    expect(quote.discountAmount).toBe(2);
    expect(quote.taxAmount).toBe(0);
    expect(quote.walletCredit).toBe(98);
  });

  it('computes informational tax without changing wallet credit', () => {
    process.env['TOPUP_TAX_RATE_BPS'] = '1800';
    const quote = quoteTopUp(50);
    expect(quote.taxAmount).toBe(9);
    expect(quote.walletCredit).toBe(50);
  });

  it('rejects amounts below configured minimum', () => {
    process.env['TOPUP_MIN'] = '10';
    expect(() => quoteTopUp(9.99)).toThrow();
  });
});