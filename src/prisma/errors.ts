export function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const record = error as {
    sqlState?: unknown;
    code?: unknown;
    cause?: unknown;
    details?: unknown;
  };

  if (record.sqlState === '23505') {
    return true;
  }

  if (typeof record.code === 'string' && (record.code === '23505' || record.code.includes('UNIQUE'))) {
    return true;
  }

  return isUniqueViolation(record.cause) || isUniqueViolation(record.details);
}

export function withoutUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as {
    [K in keyof T]?: Exclude<T[K], undefined>;
  };
}

export function asNumeric(value: number | string): string {
  return typeof value === 'number' ? value.toFixed(2) : value;
}
