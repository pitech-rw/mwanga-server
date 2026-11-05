import { describe, expect, it } from 'vitest';
import {
  formatStationCode,
  nextStationSequenceFromCodes,
  parseStationCodeSuffix,
  STATION_CODE_PATTERN,
} from './station-code.js';

describe('station-code', () => {
  it('formats a four-digit suffix', () => {
    expect(formatStationCode(1)).toBe('CO-SS-0001');
    expect(formatStationCode(42)).toBe('CO-SS-0042');
    expect(formatStationCode(9999)).toBe('CO-SS-9999');
  });

  it('parses valid codes', () => {
    expect(parseStationCodeSuffix('CO-SS-0001')).toBe(1);
    expect(parseStationCodeSuffix('CO-SS-0042')).toBe(42);
    expect(STATION_CODE_PATTERN.test('CO-SS-0001')).toBe(true);
  });

  it('rejects non-conforming codes', () => {
    expect(parseStationCodeSuffix('CO-SS-1')).toBeNull();
    expect(parseStationCodeSuffix('XX-SS-0001')).toBeNull();
    expect(parseStationCodeSuffix('manual-code')).toBeNull();
  });

  it('picks the next sequence from existing codes', () => {
    expect(nextStationSequenceFromCodes([])).toBe(1);
    expect(nextStationSequenceFromCodes(['CO-SS-0003', 'CO-SS-0001'])).toBe(4);
    expect(nextStationSequenceFromCodes(['legacy', 'CO-SS-0002'])).toBe(3);
  });
});
