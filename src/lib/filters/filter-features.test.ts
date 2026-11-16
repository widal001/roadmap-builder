import { describe, expect, it } from 'vitest';

import {
  EMPTY_FILTER,
  UNASSIGNED,
  filterFeatures,
  isFiltering,
  toggleValue,
} from '@/lib/filters/filter-features';
import { makeFeature, makeMilestone, mid } from '@/lib/test-support/plan-fixtures';
import { toTagId } from '@/types/brand';

const v2 = toTagId('v2');
const postLaunch = toTagId('post-launch');

const milestones = [
  makeMilestone('foundation', { tags: [postLaunch] }),
  makeMilestone('admin', { tags: [v2] }),
];

const features = [
  makeFeature('a', {
    title: 'Locale configuration preview',
    milestoneId: mid('admin'),
    category: 'interface',
    status: 'backlog',
    size: 'm',
  }),
  makeFeature('b', {
    title: 'Privacy-safe metrics export',
    milestoneId: mid('foundation'),
    category: 'reporting',
    status: 'done',
    size: 'l',
  }),
  makeFeature('c', {
    title: 'Spare capacity',
    milestoneId: null,
    category: 'platform',
    status: 'backlog',
    size: 's',
  }),
];

const ids = (result: readonly { id: string }[]) => result.map((f) => f.id);

describe('an empty filter', () => {
  it('returns everything, in the original order', () => {
    expect(ids(filterFeatures(features, EMPTY_FILTER, milestones))).toEqual(['a', 'b', 'c']);
  });

  it('is not considered filtering', () => {
    expect(isFiltering(EMPTY_FILTER)).toBe(false);
  });
});

describe('searching', () => {
  it('matches part of a title, ignoring case', () => {
    const result = filterFeatures(features, { ...EMPTY_FILTER, search: 'METRICS' }, milestones);

    expect(ids(result)).toEqual(['b']);
  });

  it('ignores surrounding whitespace', () => {
    expect(ids(filterFeatures(features, { ...EMPTY_FILTER, search: '  locale ' }))).toEqual(['a']);
  });
});

describe('filtering by a milestone tag', () => {
  it('finds the features whose milestone carries the tag', () => {
    const result = filterFeatures(features, { ...EMPTY_FILTER, milestoneTags: [v2] }, milestones);

    expect(ids(result)).toEqual(['a']);
  });

  it('excludes features that are not in any milestone', () => {
    const result = filterFeatures(
      features,
      { ...EMPTY_FILTER, milestoneTags: [postLaunch] },
      milestones,
    );

    expect(ids(result)).toEqual(['b']);
  });
});

describe('filtering by milestone', () => {
  it('finds features in the chosen milestone', () => {
    const result = filterFeatures(features, { ...EMPTY_FILTER, milestones: ['admin'] }, milestones);

    expect(ids(result)).toEqual(['a']);
  });

  it('finds unassigned features through the sentinel', () => {
    const result = filterFeatures(
      features,
      { ...EMPTY_FILTER, milestones: [UNASSIGNED] },
      milestones,
    );

    expect(ids(result)).toEqual(['c']);
  });
});

describe('combining criteria', () => {
  it('widens within one criterion', () => {
    const result = filterFeatures(
      features,
      { ...EMPTY_FILTER, categories: ['interface', 'reporting'] },
      milestones,
    );

    expect(ids(result)).toEqual(['a', 'b']);
  });

  it('narrows across criteria', () => {
    const result = filterFeatures(
      features,
      { ...EMPTY_FILTER, categories: ['interface', 'reporting'], statuses: ['done'] },
      milestones,
    );

    expect(ids(result)).toEqual(['b']);
  });

  it('returns nothing when the criteria cannot both be satisfied', () => {
    const result = filterFeatures(
      features,
      { ...EMPTY_FILTER, categories: ['platform'], statuses: ['done'] },
      milestones,
    );

    expect(result).toEqual([]);
  });
});

describe('toggleValue', () => {
  it('adds a value that is absent', () => {
    expect(toggleValue(['a'], 'b')).toEqual(['a', 'b']);
  });

  it('removes a value that is present', () => {
    expect(toggleValue(['a', 'b'], 'a')).toEqual(['b']);
  });
});
