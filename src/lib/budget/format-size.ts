/**
 * Turning sizes and money into display strings.
 *
 * The site's configured display unit decides whether a size reads as a t-shirt
 * label, a point value, or a dollar amount. Components format through these
 * functions so switching the unit changes the whole site at once.
 */

import { SIZE_CONFIG, findSize, sizeWeight, type DisplayUnit, type SizeId } from '@/config/sizes';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** The cost of one size tier, in integer cents. */
export function sizeToCents(size: SizeId): number {
  return Math.round(sizeWeight(size) * SIZE_CONFIG.currency.centsPerWeight);
}

/** The combined cost of several features' sizes, in integer cents. */
export function sumSizesToCents(sizes: readonly SizeId[]): number {
  return sizes.reduce((total, size) => total + sizeToCents(size), 0);
}

/**
 * Formats a size in the site's configured display unit.
 *
 * @example formatSize('m') // "$10,000" when displayUnit is 'currency'
 */
export function formatSize(size: SizeId, unit: DisplayUnit = SIZE_CONFIG.displayUnit): string {
  switch (unit) {
    case 'tshirt':
      return findSize(size)?.label ?? size;
    case 'points':
      return formatPoints(sizeWeight(size));
    case 'currency':
      return formatCents(sizeToCents(size));
  }
}

/**
 * Formats an amount of money held in integer cents.
 *
 * Whole-dollar amounts drop the decimals, because every amount on the plan
 * board is a round number and the trailing `.00` is noise at a glance.
 */
export function formatCents(cents: number): string {
  const { code, locale } = SIZE_CONFIG.currency;
  const hasCents = cents % 100 !== 0;

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: code,
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  }).format(cents / 100);
}

/**
 * Formats a signed amount, for showing how far a milestone is from its cap.
 *
 * @example formatCentsSigned(-250000) // "-$2,500"
 */
export function formatCentsSigned(cents: number): string {
  const sign = cents > 0 ? '+' : cents < 0 ? '-' : '';
  return `${sign}${formatCents(Math.abs(cents))}`;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Drops the trailing zero from half-point weights: 0.5 stays, 1.0 becomes 1. */
function formatPoints(weight: number): string {
  return Number.isInteger(weight) ? String(weight) : weight.toFixed(1);
}
