/**
 * Narrowing a list of features.
 *
 * Pure, so the filter rules can be tested without a browser, and so the same
 * rules can be reused anywhere a feature list appears.
 *
 * Every criterion is an OR within itself and an AND across criteria: choosing
 * two categories widens the result, but adding a status then narrows it. An
 * empty criterion means "don't filter on this".
 */

import type { Feature, Milestone } from '@/types/domain';
import type { MilestoneId, TagId } from '@/types/brand';
import type { CategoryId } from '@/config/categories';
import type { FeatureStatusId } from '@/config/statuses';
import type { SizeId } from '@/config/sizes';

/** The sentinel for features that aren't in any milestone. */
export const UNASSIGNED = '__unassigned__';

export interface FeatureFilter {
  search: string;
  categories: readonly CategoryId[];
  statuses: readonly FeatureStatusId[];
  /** Milestone IDs, or UNASSIGNED for features not in a milestone. */
  milestones: readonly string[];
  /** Tags on the feature itself. */
  tags: readonly TagId[];
  /** Tags on the feature's milestone. Phase tags such as `v2` live here. */
  milestoneTags: readonly TagId[];
  sizes: readonly SizeId[];
}

export const EMPTY_FILTER: FeatureFilter = {
  search: '',
  categories: [],
  statuses: [],
  milestones: [],
  tags: [],
  milestoneTags: [],
  sizes: [],
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** The features matching every active criterion, in their original order. */
export function filterFeatures(
  features: readonly Feature[],
  filter: FeatureFilter,
  milestones: readonly Milestone[] = [],
): readonly Feature[] {
  const tagsByMilestone = new Map<string, readonly TagId[]>(
    milestones.map((m) => [m.id as string, m.tags]),
  );
  const needle = filter.search.trim().toLowerCase();

  return features.filter(
    (feature) =>
      matchesSearch(feature, needle) &&
      matchesAny(filter.categories, feature.category) &&
      matchesAny(filter.statuses, feature.status) &&
      matchesAny(filter.milestones, feature.milestoneId ?? UNASSIGNED) &&
      matchesAnyOf(filter.tags, feature.tags) &&
      matchesAnyOf(filter.milestoneTags, milestoneTagsFor(feature, tagsByMilestone)) &&
      matchesAny(filter.sizes, feature.size),
  );
}

/** Whether any criterion is active, for showing a "clear filters" control. */
export function isFiltering(filter: FeatureFilter): boolean {
  return (
    filter.search.trim() !== '' ||
    filter.categories.length > 0 ||
    filter.statuses.length > 0 ||
    filter.milestones.length > 0 ||
    filter.tags.length > 0 ||
    filter.milestoneTags.length > 0 ||
    filter.sizes.length > 0
  );
}

/** Adds a value to a criterion, or removes it when it's already there. */
export function toggleValue<T>(values: readonly T[], value: T): readonly T[] {
  return values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function matchesSearch(feature: Feature, needle: string): boolean {
  return needle === '' || feature.title.toLowerCase().includes(needle);
}

/** True when the criterion is unset, or the value is one of the chosen ones. */
function matchesAny<T>(chosen: readonly T[], value: T): boolean {
  return chosen.length === 0 || chosen.includes(value);
}

/** True when the criterion is unset, or the two sets overlap. */
function matchesAnyOf<T>(chosen: readonly T[], values: readonly T[]): boolean {
  return chosen.length === 0 || values.some((value) => chosen.includes(value));
}

function milestoneTagsFor(
  feature: Feature,
  tagsByMilestone: ReadonlyMap<string, readonly TagId[]>,
): readonly TagId[] {
  if (feature.milestoneId === null) return [];
  return tagsByMilestone.get(feature.milestoneId as MilestoneId) ?? [];
}
