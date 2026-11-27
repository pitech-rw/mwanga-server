import type { TopUpQuote } from './top-up-pricing.js';
import {
  readReceiptDefaultLocale,
  readReceiptMerchantConfig,
  readReceiptTimezone,
  type ReceiptLocale,
} from './receipt-config.js';
import {
  formatReceiptDateTime,
  formatReceiptMoney,
  receiptCenter,
  receiptPadLine,
  receiptSeparator,
} from './format-receipt-money.js';
import { receiptMessages } from './messages/index.js';
import type { AgentTopUpReceiptDocument } from './top-up-receipt.types.js';

export type BuildTopUpReceiptInput = {
  receiptNumber: string;
  issuedAt: Date;
  locale: ReceiptLocale;
  reprint?: boolean;
  agent: { id: number; name: string };
  rider: { userId: number; name: string; phone?: string | null };
  wallet: { id: number; currency: string; balanceBefore: number; balanceAfter: number };
  quote: TopUpQuote;
  ledgerTransactionId: number;
};

export function buildTopUpReceiptDocument(input: BuildTopUpReceiptInput): AgentTopUpReceiptDocument {
  const locale = input.locale ?? readReceiptDefaultLocale();
  const intlLocale = locale === 'fr' ? 'fr-FR' : 'en-US';
  const messages = receiptMessages(locale);
  const merchant = readReceiptMerchantConfig();
  const timeZone = readReceiptTimezone();
  const currency = input.wallet.currency;

  const lines: string[] = [];
  lines.push(receiptCenter(messages.title));
  lines.push(receiptCenter(merchant.name));
  if (merchant.tin) {
    lines.push(receiptCenter(`TIN ${merchant.tin}`));
  }
  if (merchant.address) {
    for (const part of merchant.address.split('\n')) {
      lines.push(receiptCenter(part.trim()));
    }
  }
  lines.push(receiptSeparator());
  if (input.reprint) {
    lines.push(receiptCenter(messages.duplicate));
    lines.push(receiptSeparator());
  }
  lines.push(`${messages.receiptNo}: ${input.receiptNumber}`);
  lines.push(
    `${messages.date}: ${formatReceiptDateTime(input.issuedAt, intlLocale, timeZone)}`,
  );
  lines.push(messages.currencyLine(currency));
  lines.push(receiptSeparator());
  lines.push(`${messages.agent}: ${input.agent.name}`);
  lines.push(`${messages.rider}: ${input.rider.name}`);
  if (input.rider.phone) {
    lines.push(`${messages.phone}: ${input.rider.phone}`);
  }
  lines.push(receiptSeparator());
  lines.push(
    receiptPadLine(
      messages.cashCollected,
      formatReceiptMoney(input.quote.cashCollected, currency, intlLocale),
    ),
  );
  if (input.quote.discountAmount > 0) {
    lines.push(
      receiptPadLine(
        messages.discount,
        formatReceiptMoney(input.quote.discountAmount, currency, intlLocale),
      ),
    );
  }
  if (input.quote.taxAmount > 0) {
    lines.push(
      receiptPadLine(messages.tax, formatReceiptMoney(input.quote.taxAmount, currency, intlLocale)),
    );
  }
  lines.push(
    receiptPadLine(
      messages.walletCredit,
      formatReceiptMoney(input.quote.walletCredit, currency, intlLocale),
    ),
  );
  lines.push(
    receiptPadLine(
      messages.balanceBefore,
      formatReceiptMoney(input.wallet.balanceBefore, currency, intlLocale),
    ),
  );
  lines.push(
    receiptPadLine(
      messages.balanceAfter,
      formatReceiptMoney(input.wallet.balanceAfter, currency, intlLocale),
    ),
  );
  lines.push(receiptSeparator());
  lines.push(`${messages.ledgerRef}: ${input.ledgerTransactionId}`);
  lines.push(receiptCenter(messages.thankYou));
  lines.push(input.receiptNumber);

  return {
    kind: 'agent_rider_topup',
    locale,
    receiptNumber: input.receiptNumber,
    issuedAt: input.issuedAt.toISOString(),
    reprint: input.reprint === true,
    merchant,
    agent: input.agent,
    rider: {
      userId: input.rider.userId,
      name: input.rider.name,
      phone: input.rider.phone ?? undefined,
    },
    wallet: {
      id: input.wallet.id,
      currency,
      balanceBefore: input.wallet.balanceBefore,
      balanceAfter: input.wallet.balanceAfter,
    },
    amounts: {
      currency,
      cashCollected: input.quote.cashCollected,
      discountAmount: input.quote.discountAmount,
      taxAmount: input.quote.taxAmount,
      walletCredit: input.quote.walletCredit,
      taxRateBps: input.quote.taxRateBps,
      discountCode: input.quote.discountCode,
    },
    ledgerTransactionId: input.ledgerTransactionId,
    layout: { paperWidthMm: 58, columns: 32 },
    textLines: lines,
  };
}