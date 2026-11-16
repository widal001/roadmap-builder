import { describe, expect, it } from 'vitest';

import { countFacet, countFacets } from '@/lib/filters/facet-counts';
import { EMPTY_FILTER, UNASSIGNED } from '@/lib/filters/filter-features';
import { makeFeature, makeMilestone, mid } from '@/lib/test-support/plan-fixtures';
import { toTagId } from '@/types/brand';

const v2 = toTagId('v2');
const postLaunch = toTagId('post-launch');

const milestones = [
  makeMilestone('foundation', { tags: [postLaunch] }),
  makeMilestone('admin', { tags: [v2] }),
];

const features = [
  makeFeature('a', { milestoneId: mid('admin'), category: 'interface', status: 'backlog' }),
  makeFeature('b', { milestoneId: mid('admin'), category: 'interface', status: 'done' }),
  makeFeature('c', { milestoneId: mid('foundation'), category: 'reporting', status: 'backlog' }),
  makeFeature('d', { milestoneId: null, category: 'platform', status: 'backlog' }),
];

describe('countFacet', () => {
  it('counts every option when nothing is filtered', () => {
    const counts = countFacet(features, EMPTY_FILTER, 'statuses', milestones);

    expect(counts.get('backlog')).toBe(3);
    expect(counts.get('done')).toBe(1);
  });

  it('leaves out options nothing matches rather than reporting zero', () => {
    const counts = countFacet(features, EMPTY_FILTER, 'statuses', milestones);

    expect(counts.has('cancelled')).toBe(false);
  });

  it('narrows counts by the other active criteria', () => {
    const counts = countFacet(
      features,
      { ...EMPTY_FILTER, categories: ['interface'] },
      'statuses',
      milestones,
    );

    expect(counts.get('backlog')).toBe(1);
    expect(counts.get('done')).toBe(1);
  });

  it('ignores the facet own selections, so sibling options stay comparable', () => {
    // With "backlog" ticked, "done" must still report what it would add.
    const counts = countFacet(
      features,
      { ...EMPTY_FILTER, statuses: ['backlog'] },
      'statuses',
      milestones,
    );

    expect(counts.get('backlog')).toBe(3);
    expect(counts.get('done')).toBe(1);
  });

  it('counts unassigned features under the sentinel', () => {
    const counts = countFacet(features, EMPTY_FILTER, 'milestones', milestones);

    expect(counts.get(UNASSIGNED)).toBe(1);
    expect(counts.get('admin')).toBe(2);
  });

  it('counts milestone tags through the feature milestone', () => {
    const counts = countFacet(features, EMPTY_FILTER, 'milestoneTags', milestones);

    expect(counts.get('v2')).toBe(2);
    expect(counts.get('post-launch')).toBe(1);
  });

  it('counts a feature once per tag it carries', () => {
    const tagged = [makeFeature('t', { tags: [toTagId('privacy'), toTagId('quality')] })];

    const counts = countFacet(tagged, EMPTY_FILTER, 'tags');

    expect(counts.get('privacy')).toBe(1);
    expect(counts.get('quality')).toBe(1);
  });

  it('respects a search term', () => {
    const counts = countFacet(
      features,
      { ...EMPTY_FILTER, search: 'Feature a' },
      'statuses',
      milestones,
    );

    expect(counts.get('backlog')).toBe(1);
    expect(counts.has('done')).toBe(false);
  });
});

describe('countFacets', () => {
  it('returns a map per requested facet', () => {
    const counts = countFacets(features, EMPTY_FILTER, ['statuses', 'categories'], milestones);

    expect(counts.statuses.get('backlog')).toBe(3);
    expect(counts.categories.get('interface')).toBe(2);
  });
});
