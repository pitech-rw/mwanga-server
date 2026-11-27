import { apiBadRequest } from '../errors/api-error.js';
import { ReceiptCodes } from '../errors/codes.js';
import {
  readDiscountRules,
  readTopUpPricingConfig,
  TOP_UP_PRICING_VERSION,
  type DiscountRule,
} from './receipt-config.js';

export type TopUpQuote = {
  cashCollected: number;
  discountAmount: number;
  discountCode?: string;
  taxableBase: number;
  taxAmount: number;
  taxRateBps: number;
  walletCredit: number;
  pricingVersion: string;
};

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function assertPositiveStep(amount: number, step: number | undefined) {
  if (step == null || !Number.isFinite(step) || step <= 0) {
    return;
  }
  const remainder = roundMoney(amount % step);
  const tolerance = 0.001;
  if (remainder > tolerance && roundMoney(step - remainder) > tolerance) {
    apiBadRequest(ReceiptCodes.amountStepInvalid, { params: { step } });
  }
}

function resolveDiscount(code: string | undefined, rules: Record<string, DiscountRule>) {
  if (!code?.trim()) {
    return { discountAmount: 0, discountCode: undefined as string | undefined };
  }
  const normalized = code.trim().toUpperCase();
  const rule = rules[normalized];
  if (!rule) {
    apiBadRequest(ReceiptCodes.discountInvalid, { params: { code: normalized } });
  }
  return { discountAmount: roundMoney(rule.amountOff), discountCode: normalized };
}

export function quoteTopUp(amount: number, discountCode?: string): TopUpQuote {
  const { min, max, step, taxRateBps } = readTopUpPricingConfig();
  const rules = readDiscountRules();

  if (!Number.isFinite(amount) || !(amount > 0)) {
    apiBadRequest(ReceiptCodes.amountPositive);
  }
  if (amount < min) {
    apiBadRequest(ReceiptCodes.amountBelowMin, { params: { min } });
  }
  if (amount > max) {
    apiBadRequest(ReceiptCodes.amountAboveMax, { params: { max } });
  }

  assertPositiveStep(amount, step);

  const cashCollected = roundMoney(amount);
  const { discountAmount, discountCode: appliedCode } = resolveDiscount(discountCode, rules);
  const taxableBase = roundMoney(Math.max(0, cashCollected - discountAmount));
  const taxAmount = roundMoney((taxableBase * taxRateBps) / 10_000);
  const walletCredit = taxableBase;

  if (!(walletCredit > 0)) {
    apiBadRequest(ReceiptCodes.walletCreditZero);
  }

  return {
    cashCollected,
    discountAmount,
    discountCode: appliedCode,
    taxableBase,
    taxAmount,
    taxRateBps,
    walletCredit,
    pricingVersion: TOP_UP_PRICING_VERSION,
  };
}