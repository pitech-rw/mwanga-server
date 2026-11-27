export const TOP_UP_PRICING_VERSION = '2026-11-27';

export type ReceiptLocale = 'fr' | 'en';

export function parseReceiptLocale(raw: string | undefined, fallback: ReceiptLocale): ReceiptLocale {
  if (raw === 'en') {
    return 'en';
  }
  if (raw === 'fr') {
    return 'fr';
  }
  return fallback;
}

export function readTopUpPricingConfig() {
  const min = Number(process.env['TOPUP_MIN'] ?? '0.01');
  const max = Number(process.env['TOPUP_MAX'] ?? '1_000_000'.replaceAll('_', ''));
  const step = process.env['TOPUP_STEP'] ? Number(process.env['TOPUP_STEP']) : undefined;
  const taxRateBps = Number(process.env['TOPUP_TAX_RATE_BPS'] ?? '0');
  return { min, max, step, taxRateBps };
}

export function readReceiptMerchantConfig() {
  return {
    name: process.env['RECEIPT_MERCHANT_NAME'] ?? 'Mwanga',
    tin: process.env['RECEIPT_MERCHANT_TIN'] ?? '',
    address: process.env['RECEIPT_MERCHANT_ADDRESS'] ?? '',
  };
}

export function readReceiptSequencePrefix(): string {
  return process.env['RECEIPT_PREFIX'] ?? 'TU';
}

export function readReceiptDefaultLocale(): ReceiptLocale {
  return parseReceiptLocale(process.env['RECEIPT_DEFAULT_LOCALE'], 'fr');
}

export function readReceiptTimezone(): string {
  return process.env['RECEIPT_TIMEZONE'] ?? 'Africa/Kigali';
}

export type DiscountRule = { amountOff: number };

export function readDiscountRules(): Record<string, DiscountRule> {
  const raw = process.env['TOPUP_DISCOUNT_JSON'];
  if (!raw?.trim()) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, { amountOff?: number }>;
    const rules: Record<string, DiscountRule> = {};
    for (const [code, rule] of Object.entries(parsed)) {
      const amountOff = Number(rule?.amountOff);
      if (code && Number.isFinite(amountOff) && amountOff > 0) {
        rules[code.toUpperCase()] = { amountOff };
      }
    }
    return rules;
  } catch {
    return {};
  }
}