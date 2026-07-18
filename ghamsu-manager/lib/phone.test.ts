import { describe, it, expect } from 'vitest';
import { normalizeGhPhone } from './phone';

describe('normalizeGhPhone', () => {
  it('normalises a local 0-prefixed number', () => {
    expect(normalizeGhPhone('0244123456')).toBe('+233244123456');
  });

  it('normalises a number with spaces and dashes', () => {
    expect(normalizeGhPhone('024-412 3456')).toBe('+233244123456');
  });

  it('normalises a number already in 233 form', () => {
    expect(normalizeGhPhone('233244123456')).toBe('+233244123456');
  });

  it('normalises a bare 9-digit number', () => {
    expect(normalizeGhPhone('244123456')).toBe('+233244123456');
  });

  it('normalises a number with a leading +', () => {
    expect(normalizeGhPhone('+233244123456')).toBe('+233244123456');
  });

  it('rejects a too-short number', () => {
    expect(normalizeGhPhone('12345')).toBeNull();
  });

  it('rejects a too-long number', () => {
    expect(normalizeGhPhone('02441234567890')).toBeNull();
  });

  it('rejects non-numeric input', () => {
    expect(normalizeGhPhone('not a phone')).toBeNull();
  });
});
