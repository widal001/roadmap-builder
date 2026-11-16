/**
 * Which features a surface is currently showing.
 *
 * Connects the pure filter module to Svelte. The rules themselves live in
 * src/lib/filters, so they can be tested without a browser.
 *
 * Filters belong to a surface, not to the app: the catalogue page and the
 * milestone editor each ask a different question of a different pool, and a
 * search typed into one should never narrow the other. So this file exports a
 * factory and one ready-made surface for the catalogue page, rather than a
 * single global filter.
 */

import { atom, computed, type ReadableAtom, type WritableAtom } from 'nanostores';

import { countFacets, type FacetKey } from '@/lib/filters/facet-counts';
import {
  EMPTY_FILTER,
  filterFeatures,
  isFiltering,
  toggleValue,
  type FeatureFilter,
} from '@/lib/filters/filter-features';
import { allFeatures, menuMilestones } from '@/stores/roadmap';
import type { Feature } from '@/types/domain';
import type { TagId } from '@/types/brand';
import type { CategoryId } from '@/config/categories';
import type { FeatureStatusId } from '@/config/statuses';

/**
 * One surface's filter, the features it leaves showing, and the actions that
 * change it. Components take this as a prop, so the same controls can drive
 * any surface.
 */
export interface FeatureFilterSurface {
  /** The active filter. Deliberately not persisted: it's a view, not a decision. */
  filter: WritableAtom<FeatureFilter>;
  /** The features from this surface's pool that match the filter. */
  filteredFeatures: ReadableAtom<readonly Feature[]>;
  /** Whether anything is being filtered, for showing a clear control. */
  hasActiveFilter: ReadableAtom<boolean>;
  /** How many features each option would match, given the rest of the filter. */
  counts: ReadableAtom<Readonly<Record<FacetKey, ReadonlyMap<string, number>>>>;
  setSearch: (search: string) => void;
  toggleCategory: (category: CategoryId) => void;
  toggleStatus: (status: FeatureStatusId) => void;
  toggleMilestone: (milestoneId: string) => void;
  /** Phase tags such as `v2` sit on the milestone, which is how a phase is scoped. */
  toggleMilestoneTag: (tag: TagId) => void;
  clear: () => void;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Builds a filter surface over a pool of features.
 *
 * `pool` is whatever that surface is filtering: every feature on the catalogue
 * page, or the unchosen ones in the milestone editor.
 */
/** The facets the panel shows counts for. Tags and sizes aren't surfaced yet. */
const COUNTED_FACETS = ['milestoneTags', 'milestones', 'categories', 'statuses'] as const;

export function createFeatureFilters(pool: ReadableAtom<readonly Feature[]>): FeatureFilterSurface {
  const filter = atom<FeatureFilter>(EMPTY_FILTER);

  const change = (changes: Partial<FeatureFilter>) => filter.set({ ...filter.get(), ...changes });

  return {
    filter,

    filteredFeatures: computed([pool, filter, menuMilestones], (features, active, menu) =>
      filterFeatures(
        features,
        active,
        menu.map((suggestion) => suggestion.milestone),
      ),
    ),

    hasActiveFilter: computed(filter, isFiltering),

    counts: computed([pool, filter, menuMilestones], (features, active, menu) =>
      countFacets(
        features,
        active,
        COUNTED_FACETS,
        menu.map((suggestion) => suggestion.milestone),
      ),
    ),

    setSearch: (search) => change({ search }),
    toggleCategory: (category) =>
      change({ categories: toggleValue(filter.get().categories, category) }),
    toggleStatus: (status) => change({ statuses: toggleValue(filter.get().statuses, status) }),
    toggleMilestone: (milestoneId) =>
      change({ milestones: toggleValue(filter.get().milestones, milestoneId) }),
    toggleMilestoneTag: (tag) =>
      change({ milestoneTags: toggleValue(filter.get().milestoneTags, tag) }),
    clear: () => filter.set(EMPTY_FILTER),
  };
}

/** The filters on the feature catalogue page, which searches everything. */
export const catalogFilters = createFeatureFilters(allFeatures);
