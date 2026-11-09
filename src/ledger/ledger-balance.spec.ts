import { describe, expect, it } from 'vitest';
import { signedDeltaForLine } from './ledger-balance.js';

describe('signedDeltaForLine', () => {
  it('increases company asset on debit', () => {
    expect(signedDeltaForLine('company', 'debit', 100)).toBe(100);
    expect(signedDeltaForLine('company', 'credit', 100)).toBe(-100);
  });

  it('increases wallet liability on credit', () => {
    expect(signedDeltaForLine('wallet', 'credit', 50)).toBe(50);
    expect(signedDeltaForLine('wallet', 'debit', 50)).toBe(-50);
  });

  it('increases revenue on credit', () => {
    expect(signedDeltaForLine('revenue', 'credit', 25)).toBe(25);
    expect(signedDeltaForLine('revenue', 'debit', 25)).toBe(-25);
  });
});
