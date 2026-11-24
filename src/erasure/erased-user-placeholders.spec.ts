import { describe, expect, it } from 'vitest';
import { erasedUserLabel, erasedUserPlaceholders } from './erased-user-placeholders.js';

describe('erased-user-placeholders', () => {
  it('builds unique placeholders per user id', () => {
    const a = erasedUserPlaceholders(7);
    const b = erasedUserPlaceholders(8);

    expect(a.email).toBe('erased-7@invalid.local');
    expect(b.email).toBe('erased-8@invalid.local');
    expect(a.username).not.toBe(b.username);
    expect(erasedUserLabel(7)).toBe('Erased user #7');
  });
});