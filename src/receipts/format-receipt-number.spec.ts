import { describe, expect, it } from 'vitest';
import { formatReceiptNumber } from './receipt-sequence.js';

describe('formatReceiptNumber', () => {
  it('pads sequence to six digits', () => {
    expect(formatReceiptNumber('TU', 2026, 42)).toBe('TU-2026-000042');
  });
});