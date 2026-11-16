import { describe, expect, it } from 'vitest';

import {
  formatCents,
  formatCentsSigned,
  formatSize,
  sizeToCents,
  sumSizesToCents,
} from '@/lib/budget/format-size';

describe('sizeToCents', () => {
  it('multiplies the tier weight by the configured rate', () => {
    expect(sizeToCents('s')).toBe(500_000); // weight 1 x $5,000
    expect(sizeToCents('m')).toBe(1_000_000); // weight 2
    expect(sizeToCents('xl')).toBe(2_500_000); // weight 5
  });

  it('returns whole cents for a half-weight tier', () => {
    expect(sizeToCents('xs')).toBe(250_000);
    expect(Number.isInteger(sizeToCents('xs'))).toBe(true);
  });
});

describe('sumSizesToCents', () => {
  it('adds several sizes together', () => {
    expect(sumSizesToCents(['xs', 's', 'm'])).toBe(250_000 + 500_000 + 1_000_000);
  });

  it('is zero for an empty list', () => {
    expect(sumSizesToCents([])).toBe(0);
  });
});

describe('formatSize', () => {
  it('shows the tier label in tshirt mode', () => {
    expect(formatSize('m', 'tshirt')).toBe('M');
  });

  it('shows the weight in points mode, trimming whole numbers', () => {
    expect(formatSize('m', 'points')).toBe('2');
    expect(formatSize('xs', 'points')).toBe('0.5');
  });

  it('shows money in currency mode', () => {
    expect(formatSize('m', 'currency')).toBe('$10,000');
    expect(formatSize('xs', 'currency')).toBe('$2,500');
  });
});

describe('formatCents', () => {
  it('drops the decimals for whole-dollar amounts', () => {
    expect(formatCents(1_000_000)).toBe('$10,000');
  });

  it('keeps the decimals when there are stray cents', () => {
    expect(formatCents(1_000_050)).toBe('$10,000.50');
  });

  it('formats zero', () => {
    expect(formatCents(0)).toBe('$0');
  });
});

describe('formatCentsSigned', () => {
  it('marks an amount under budget with a plus', () => {
    expect(formatCentsSigned(1_500_000)).toBe('+$15,000');
  });

  it('marks an amount over budget with a minus', () => {
    expect(formatCentsSigned(-3_000_000)).toBe('-$30,000');
  });

  it('leaves zero unsigned', () => {
    expect(formatCentsSigned(0)).toBe('$0');
  });
});
