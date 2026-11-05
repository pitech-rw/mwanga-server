export const STATION_CODE_PREFIX = 'CO-SS';

/** Matches assigned swap-station codes, e.g. CO-SS-0001 */
export const STATION_CODE_PATTERN = /^CO-SS-\d{4}$/;

const MAX_SEQUENCE = 9999;

export function formatStationCode(sequence: number): string {
  if (!Number.isInteger(sequence) || sequence < 1 || sequence > MAX_SEQUENCE) {
    throw new RangeError(`Station sequence must be an integer from 1 to ${MAX_SEQUENCE}`);
  }

  return `${STATION_CODE_PREFIX}-${String(sequence).padStart(4, '0')}`;
}

export function parseStationCodeSuffix(code: string): number | null {
  if (!STATION_CODE_PATTERN.test(code)) {
    return null;
  }

  return Number.parseInt(code.slice(-4), 10);
}

export function nextStationSequenceFromCodes(codes: readonly string[]): number {
  let max = 0;

  for (const code of codes) {
    const suffix = parseStationCodeSuffix(code);
    if (suffix !== null && suffix > max) {
      max = suffix;
    }
  }

  const next = max + 1;
  if (next > MAX_SEQUENCE) {
    throw new RangeError(`Station code sequence exhausted (max ${MAX_SEQUENCE})`);
  }

  return next;
}
