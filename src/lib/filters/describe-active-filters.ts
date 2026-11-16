/**
 * Describing the filter in words.
 *
 * The filter stores IDs, but someone reviewing what they've narrowed to needs
 * labels. This turns the active criteria into a flat list of chips, each of
 * which knows how to remove itself, so a summary can be rendered anywhere
 * without the component re-deriving labels from four different config files.
 */

import { CATEGORIES } from '@/config/categories';
import { FEATURE_STATUSES } from '@/config/statuses';
import { SIZE_LEVELS } from '@/config/sizes';
import { UNASSIGNED, type FeatureFilter } from '@/lib/filters/filter-features';
import type { FacetKey } from '@/lib/filters/facet-counts';
import type { Milestone, Tag } from '@/types/domain';

/** One active criterion, ready to render and to remove. */
export interface ActiveFilterChip {
  /** Which facet it belongs to, or `search` for the free-text box. */
  facet: FacetKey | 'search';
  /** The value to pass back to the matching toggle. */
  value: string;
  /** What the facet is, for context: "Status". */
  group: string;
  /** What was chosen: "In progress". */
  label: string;
}

export interface FilterLabelContext {
  milestones: readonly Milestone[];
  tags: readonly Tag[];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Every active criterion, in a stable order.
 *
 * Search comes first because it's the broadest stroke, then the facets in the
 * order the filter panel shows them, so the chips and the panel agree.
 */
export function describeActiveFilters(
  filter: FeatureFilter,
  context: FilterLabelContext,
): readonly ActiveFilterChip[] {
  const milestoneTitle = (id: string) =>
    id === UNASSIGNED ? 'No milestone' : (context.milestones.find((m) => m.id === id)?.title ?? id);
  const tagLabel = (id: string) => context.tags.find((t) => t.id === id)?.label ?? id;

  return [
    ...searchChip(filter.search),
    ...chips('milestoneTags', 'Phase', filter.milestoneTags, tagLabel),
    ...chips('milestones', 'Milestone', filter.milestones, milestoneTitle),
    ...chips('categories', 'Category', filter.categories, labelFrom(CATEGORIES)),
    ...chips('statuses', 'Status', filter.statuses, labelFrom(FEATURE_STATUSES)),
    ...chips('sizes', 'Size', filter.sizes, labelFrom(SIZE_LEVELS)),
    ...chips('tags', 'Tag', filter.tags, tagLabel),
  ];
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function searchChip(search: string): ActiveFilterChip[] {
  const trimmed = search.trim();
  if (trimmed === '') return [];
  return [{ facet: 'search', value: trimmed, group: 'Search', label: `“${trimmed}”` }];
}

function chips(
  facet: FacetKey,
  group: string,
  values: readonly string[],
  toLabel: (value: string) => string,
): ActiveFilterChip[] {
  return values.map((value) => ({ facet, value, group, label: toLabel(value) }));
}

/** Looks a label up in one of the config lists, falling back to the raw ID. */
function labelFrom(entries: readonly { id: string; label: string }[]) {
  return (value: string) => entries.find((entry) => entry.id === value)?.label ?? value;
}
