import { describe, expect, it } from 'vitest';
import { csvEscape, formatDate, uid } from './utils';

describe('csvEscape', () => {
  it('quotes values containing commas, quotes or newlines', () => {
    expect(csvEscape('plain')).toBe('plain');
    expect(csvEscape('a,b')).toBe('"a,b"');
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
    expect(csvEscape('line\nbreak')).toBe('"line\nbreak"');
    expect(csvEscape(42)).toBe('42');
  });
});

describe('uid', () => {
  it('returns unique values', () => {
    const ids = new Set(Array.from({ length: 100 }, () => uid()));
    expect(ids.size).toBe(100);
  });
});

describe('formatDate', () => {
  it('formats ISO dates and handles missing values', () => {
    expect(formatDate(undefined)).toBe('—');
    expect(formatDate('2026-10-25T19:00:00.000Z')).toMatch(/2026/);
  });
});
