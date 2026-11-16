import { atom } from 'nanostores';
import { describe, expect, it } from 'vitest';

import { createFeatureFilters } from '@/stores/filters';
import { makeFeature } from '@/lib/test-support/plan-fixtures';
import type { Feature } from '@/types/domain';

const pool = atom<readonly Feature[]>([
  makeFeature('save-and-resume', { title: 'Save and resume screening' }),
  makeFeature('printable-summary', { title: 'Printable results summary' }),
]);

describe('createFeatureFilters', () => {
  it('shows the whole pool until something is filtered', () => {
    const surface = createFeatureFilters(pool);

    expect(surface.filteredFeatures.get()).toHaveLength(2);
    expect(surface.hasActiveFilter.get()).toBe(false);
  });

  it('narrows its own pool', () => {
    const surface = createFeatureFilters(pool);

    surface.setSearch('printable');

    expect(surface.filteredFeatures.get().map((f) => f.id)).toEqual(['printable-summary']);
    expect(surface.hasActiveFilter.get()).toBe(true);
  });

  it('keeps two surfaces out of one another’s way', () => {
    const catalogue = createFeatureFilters(pool);
    const picker = createFeatureFilters(pool);

    catalogue.setSearch('printable');

    expect(picker.filter.get().search).toBe('');
    expect(picker.filteredFeatures.get()).toHaveLength(2);
  });

  it('clears back to showing everything', () => {
    const surface = createFeatureFilters(pool);

    surface.setSearch('printable');
    surface.toggleStatus('done');
    surface.clear();

    expect(surface.hasActiveFilter.get()).toBe(false);
    expect(surface.filteredFeatures.get()).toHaveLength(2);
  });
});
