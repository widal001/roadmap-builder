/**
 * The sizing scale.
 *
 * One ordered scale backs three display units:
 *   - tshirt:   the tier's label (XS, S, M, ...)
 *   - points:   the tier's weight
 *   - currency: weight x centsPerWeight, formatted as money
 *
 * All budget arithmetic uses `weight`. Nothing else in the codebase should
 * treat a size as money directly.
 */

export interface Size {
  readonly id: string;
  /** Display name for the tier. */
  readonly label: string;
  /** Relative effort. All budget math uses this value. */
  readonly weight: number;
}

// The gaps between tiers widen as the estimates become less certain.
export const SIZE_LEVELS = [
  { id: 'xs', label: 'XS', weight: 0.5 },
  { id: 's', label: 'S', weight: 1 },
  { id: 'm', label: 'M', weight: 2 },
  { id: 'l', label: 'L', weight: 3 },
  { id: 'xl', label: 'XL', weight: 5 },
] as const satisfies readonly Size[];

export type SizeId = (typeof SIZE_LEVELS)[number]['id'];

export const DISPLAY_UNITS = ['tshirt', 'points', 'currency'] as const;
export type DisplayUnit = (typeof DISPLAY_UNITS)[number];

export const SIZE_CONFIG = {
  levels: SIZE_LEVELS,
  /** Which unit the UI shows. Change this to re-denominate the whole site. */
  displayUnit: 'currency' satisfies DisplayUnit,
  currency: { code: 'USD', centsPerWeight: 500_000, locale: 'en-US' },
} as const;

// ---------------------------------------------------------------------------
// Lookup
// ---------------------------------------------------------------------------

const SIZE_BY_ID: ReadonlyMap<string, Size> = new Map(SIZE_LEVELS.map((s) => [s.id, s]));

/** Returns the size tier, or undefined when the ID isn't in the scale. */
export function findSize(id: string): Size | undefined {
  return SIZE_BY_ID.get(id);
}

/** The tier's weight, or 0 when the ID isn't in the scale. */
export function sizeWeight(id: SizeId): number {
  return SIZE_BY_ID.get(id)?.weight ?? 0;
}

export const SIZE_IDS = SIZE_LEVELS.map((s) => s.id) as readonly SizeId[];
