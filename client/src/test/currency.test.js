import { describe, it, expect } from 'vitest';
import { formatINR, parseINR } from '../lib/currency';

describe('formatINR', () => {
  it('formats thousands with Indian grouping', () => {
    expect(formatINR(5000)).toBe('₹5,000');
  });

  it('formats lakhs with Indian grouping (e.g. ₹3,00,000)', () => {
    expect(formatINR(300000)).toBe('₹3,00,000');
  });

  it('formats crores with Indian grouping (e.g. ₹1,50,00,000)', () => {
    expect(formatINR(15000000)).toBe('₹1,50,00,000');
  });

  it('handles zero and missing symbol option', () => {
    expect(formatINR(0)).toBe('₹0');
    expect(formatINR(300000, false)).toBe('3,00,000');
  });

  it('handles negative numbers', () => {
    expect(formatINR(-50000)).toBe('-₹50,000');
  });

  it('handles invalid inputs safely', () => {
    expect(formatINR('invalid')).toBe('₹0');
    expect(formatINR(null)).toBe('₹0');
  });
});

describe('parseINR', () => {
  it('parses formatted strings with currency symbols and commas', () => {
    expect(parseINR('₹3,00,000')).toBe(300000);
    expect(parseINR('3,00,000')).toBe(300000);
    expect(parseINR(' ₹ 1,50,000 ')).toBe(150000);
  });

  it('parses raw numbers and plain digit strings', () => {
    expect(parseINR(50000)).toBe(50000);
    expect(parseINR('25000')).toBe(25000);
  });

  it('handles empty and invalid values gracefully', () => {
    expect(parseINR('')).toBe(0);
    expect(parseINR(null)).toBe(0);
    expect(parseINR('abc')).toBe(0);
  });
});
