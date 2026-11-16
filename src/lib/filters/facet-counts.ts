/**
 * How many features each filter option would match.
 *
 * Shown beside each checkbox so someone can see what a choice is worth before
 * making it, rather than selecting something and discovering it returns
 * nothing.
 *
 * The counts for a facet are computed with that facet's own selections
 * cleared. Otherwise, ticking "Backlog" would drop every other status to zero
 * and the numbers would stop being useful for deciding what to tick next.
 */

import { filterFeatures, type FeatureFilter } from '@/lib/filters/filter-features';
import { UNASSIGNED } from '@/lib/filters/filter-features';
import type { Feature, Milestone } from '@/types/domain';

/** The facets a feature list can be narrowed by. */
export type FacetKey =
  'categories' | 'statuses' | 'milestones' | 'tags' | 'milestoneTags' | 'sizes';

export interface FacetCount {
  /** The option's value, matching the IDs used in the filter. */
  value: string;
  /** Features that would match if this option were selected. */
  count: number;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Counts for every option of one facet, keyed by value.
 *
 * Options that would match nothing are still included with a count of zero, so
 * the filter panel keeps a stable shape instead of rows appearing and
 * disappearing as choices are made.
 */
export function countFacet(
  features: readonly Feature[],
  filter: FeatureFilter,
  facet: FacetKey,
  milestones: readonly Milestone[] = [],
): ReadonlyMap<string, number> {
  const withoutThisFacet = { ...filter, [facet]: [] } as FeatureFilter;
  const candidates = filterFeatures(features, withoutThisFacet, milestones);

  const counts = new Map<string, number>();
  const tagsByMilestone = new Map<string, readonly string[]>(
    milestones.map((m) => [m.id as string, m.tags as readonly string[]]),
  );

  for (const feature of candidates) {
    for (const value of valuesFor(feature, facet, tagsByMilestone)) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }

  return counts;
}

/** Counts for several facets at once, so a panel renders from one pass. */
export function countFacets(
  features: readonly Feature[],
  filter: FeatureFilter,
  facets: readonly FacetKey[],
  milestones: readonly Milestone[] = [],
): Readonly<Record<FacetKey, ReadonlyMap<string, number>>> {
  const result = {} as Record<FacetKey, ReadonlyMap<string, number>>;
  for (const facet of facets) {
    result[facet] = countFacet(features, filter, facet, milestones);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** The values a single feature contributes to a facet. Usually one; tags, many. */
function valuesFor(
  feature: Feature,
  facet: FacetKey,
  tagsByMilestone: ReadonlyMap<string, readonly string[]>,
): readonly string[] {
  switch (facet) {
    case 'categories':
      return [feature.category];
    case 'statuses':
      return [feature.status];
    case 'sizes':
      return [feature.size];
    case 'milestones':
      return [feature.milestoneId ?? UNASSIGNED];
    case 'tags':
      return feature.tags as readonly string[];
    case 'milestoneTags':
      return feature.milestoneId === null ? [] : (tagsByMilestone.get(feature.milestoneId) ?? []);
  }
}
