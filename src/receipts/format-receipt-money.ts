export function formatReceiptMoney(amount: number, currency: string, locale: string): string {
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${formatted} ${currency}`;
}

export function formatReceiptDateTime(date: Date, locale: string, timeZone: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone,
  }).format(date);
}

const RECEIPT_COLUMNS = 32;

export function receiptPadLine(left: string, right: string, columns = RECEIPT_COLUMNS): string {
  const maxLeft = Math.max(0, columns - right.length - 1);
  const clippedLeft = left.length > maxLeft ? left.slice(0, maxLeft) : left;
  const spaces = Math.max(1, columns - clippedLeft.length - right.length);
  return clippedLeft + ' '.repeat(spaces) + right;
}

export function receiptCenter(text: string, columns = RECEIPT_COLUMNS): string {
  if (text.length >= columns) {
    return text.slice(0, columns);
  }
  const pad = Math.floor((columns - text.length) / 2);
  return ' '.repeat(pad) + text;
}

export function receiptSeparator(char = '-', columns = RECEIPT_COLUMNS): string {
  return char.repeat(columns);
}