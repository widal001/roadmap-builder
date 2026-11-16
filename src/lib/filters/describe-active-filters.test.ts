import { describe, expect, it } from 'vitest';

import { describeActiveFilters } from '@/lib/filters/describe-active-filters';
import { EMPTY_FILTER, UNASSIGNED } from '@/lib/filters/filter-features';
import { makeMilestone } from '@/lib/test-support/plan-fixtures';
import { toTagId } from '@/types/brand';

const context = {
  milestones: [makeMilestone('admin', { title: 'Admin Tools' })],
  tags: [{ id: toTagId('v2'), label: 'V2', description: '' }],
};

describe('describeActiveFilters', () => {
  it('returns nothing when no criteria are active', () => {
    expect(describeActiveFilters(EMPTY_FILTER, context)).toEqual([]);
  });

  it('describes a search term, trimmed and quoted', () => {
    const [chip] = describeActiveFilters({ ...EMPTY_FILTER, search: '  metrics ' }, context);

    expect(chip).toMatchObject({ facet: 'search', value: 'metrics', group: 'Search' });
    expect(chip!.label).toContain('metrics');
  });

  it('ignores a search of only whitespace', () => {
    expect(describeActiveFilters({ ...EMPTY_FILTER, search: '   ' }, context)).toEqual([]);
  });

  it('looks milestone titles up rather than showing the ID', () => {
    const [chip] = describeActiveFilters({ ...EMPTY_FILTER, milestones: ['admin'] }, context);

    expect(chip).toMatchObject({ facet: 'milestones', value: 'admin', label: 'Admin Tools' });
  });

  it('names the unassigned sentinel in words', () => {
    const [chip] = describeActiveFilters({ ...EMPTY_FILTER, milestones: [UNASSIGNED] }, context);

    expect(chip!.label).toBe('No milestone');
  });

  it('reads category and status labels from config', () => {
    const chips = describeActiveFilters(
      { ...EMPTY_FILTER, categories: ['interface'], statuses: ['in_progress'] },
      context,
    );

    expect(chips.map((c) => c.label)).toEqual(['Interface', 'In progress']);
  });

  it('falls back to the raw value when nothing matches', () => {
    const [chip] = describeActiveFilters({ ...EMPTY_FILTER, milestones: ['ghost'] }, context);

    expect(chip!.label).toBe('ghost');
  });

  it('orders chips to match the filter panel', () => {
    const chips = describeActiveFilters(
      {
        ...EMPTY_FILTER,
        search: 'x',
        statuses: ['done'],
        categories: ['reporting'],
        milestoneTags: [toTagId('v2')],
      },
      context,
    );

    expect(chips.map((c) => c.group)).toEqual(['Search', 'Phase', 'Category', 'Status']);
  });

  it('returns one chip per selected value', () => {
    const chips = describeActiveFilters(
      { ...EMPTY_FILTER, categories: ['reporting', 'platform'] },
      context,
    );

    expect(chips).toHaveLength(2);
  });
});
