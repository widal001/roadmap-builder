import { describe, expect, it } from 'vitest';

import {
  resolveRoadmap,
  resolveSuggestions,
  suggestedFeatureIds,
} from '@/lib/roadmap/resolve-roadmap';
import { newCustomMilestoneId } from '@/lib/roadmap/types';
import { EMPTY_FEATURE_STATUSES } from '@/lib/roadmap/feature-statuses';
import {
  makeCatalog,
  makeFeature,
  makeMilestone,
  makeRoadmap,
  mid,
} from '@/lib/test-support/plan-fixtures';

const catalog = makeCatalog({
  milestones: [makeMilestone('first'), makeMilestone('second', { position: 2 })],
  features: [
    makeFeature('a', { milestoneId: mid('first') }),
    makeFeature('b', { milestoneId: mid('first') }),
    makeFeature('c', { milestoneId: mid('second') }),
    makeFeature('loose'),
  ],
});

const resolve = (
  roadmap: Parameters<typeof resolveRoadmap>[1],
  statuses = EMPTY_FEATURE_STATUSES,
) => resolveRoadmap(catalog, roadmap, statuses);

describe('before anything has loaded', () => {
  it('resolves to nothing at all without a catalog', () => {
    const resolved = resolveRoadmap(null, makeRoadmap(), EMPTY_FEATURE_STATUSES);

    expect(resolved.milestones).toEqual([]);
    expect(resolved.availableFeatures).toEqual([]);
  });

  it('offers every feature when the roadmap has not been read yet', () => {
    const resolved = resolveRoadmap(catalog, null, EMPTY_FEATURE_STATUSES);

    expect(resolved.milestones).toEqual([]);
    expect(resolved.availableFeatures.map((f) => f.id)).toEqual(['a', 'b', 'c', 'loose']);
  });
});

describe('an empty roadmap', () => {
  it('has no milestones and leaves everything on the menu', () => {
    const resolved = resolve(makeRoadmap());

    expect(resolved.milestones).toEqual([]);
    expect(resolved.availableFeatures.map((f) => f.id)).toEqual(['a', 'b', 'c', 'loose']);
  });
});

describe('milestones taken off the menu', () => {
  it('resolves each ID to the milestone and the features it holds', () => {
    const resolved = resolve(makeRoadmap([{ id: 'first', featureIds: ['a', 'b'] }]));

    expect(resolved.milestones).toHaveLength(1);
    expect(resolved.milestones[0]!.milestone.title).toBe('Milestone first');
    expect(resolved.milestones[0]!.features.map((f) => f.id)).toEqual(['a', 'b']);
    expect(resolved.milestones[0]!.isCustom).toBe(false);
  });

  it('keeps the roadmap order rather than the catalog order', () => {
    const resolved = resolve(
      makeRoadmap([
        { id: 'second', featureIds: [] },
        { id: 'first', featureIds: [] },
      ]),
    );

    expect(resolved.milestones.map((m) => m.milestone.id)).toEqual(['second', 'first']);
  });

  it('keeps the features in the order the roadmap lists them', () => {
    const resolved = resolve(makeRoadmap([{ id: 'first', featureIds: ['b', 'a'] }]));

    expect(resolved.milestones[0]!.features.map((f) => f.id)).toEqual(['b', 'a']);
  });

  it('takes the roadmap at its word when a feature was moved across', () => {
    const resolved = resolve(makeRoadmap([{ id: 'first', featureIds: ['a', 'c'] }]));

    expect(resolved.milestones[0]!.features.map((f) => f.id)).toEqual(['a', 'c']);
  });

  it('drops a milestone the catalog no longer has', () => {
    const resolved = resolve(makeRoadmap([{ id: 'retired', featureIds: [] }]));

    expect(resolved.milestones).toEqual([]);
  });

  it('drops a feature the catalog no longer has', () => {
    const resolved = resolve(makeRoadmap([{ id: 'first', featureIds: ['a', 'retired'] }]));

    expect(resolved.milestones[0]!.features.map((f) => f.id)).toEqual(['a']);
  });
});

describe('milestones the client built themselves', () => {
  const id = newCustomMilestoneId(0);
  const details = {
    title: 'Our own milestone',
    description: 'Work we care about.',
    deadline: '2027-06-30',
  };

  it('synthesizes a milestone from the details the roadmap carries', () => {
    const resolved = resolve(makeRoadmap([{ id, featureIds: ['loose'], details }]));
    const built = resolved.milestones[0]!;

    expect(built.isCustom).toBe(true);
    expect(built.milestone.id).toBe(id);
    expect(built.milestone.title).toBe('Our own milestone');
    expect(built.milestone.description).toBe('Work we care about.');
    expect(built.milestone.deadline).toEqual(new Date('2027-06-30T00:00:00'));
    expect(built.features.map((f) => f.id)).toEqual(['loose']);
  });

  it('leaves the deadline unset when the client did not give one', () => {
    const resolved = resolve(
      makeRoadmap([{ id, featureIds: [], details: { ...details, deadline: null } }]),
    );

    expect(resolved.milestones[0]!.milestone.deadline).toBeNull();
  });

  it('names an unnamed one rather than rendering a gap', () => {
    const resolved = resolve(makeRoadmap([{ id, featureIds: [] }]));

    expect(resolved.milestones[0]!.milestone.title).toBe('Untitled milestone');
  });

  it('positions it by where it sits in the roadmap', () => {
    const resolved = resolve(
      makeRoadmap([
        { id: 'first', featureIds: [] },
        { id, featureIds: [], details },
      ]),
    );

    expect(resolved.milestones[1]!.milestone.position).toBe(2);
  });
});

describe('details the client changed', () => {
  it('applies them over what the content file says', () => {
    const resolved = resolve(
      makeRoadmap([
        {
          id: 'first',
          featureIds: [],
          details: { title: 'Phase one', description: 'Renamed.', status: 'active' },
        },
      ]),
    );
    const milestone = resolved.milestones[0]!.milestone;

    expect(milestone.title).toBe('Phase one');
    expect(milestone.description).toBe('Renamed.');
    expect(milestone.status).toBe('active');
  });

  it('leaves the fields the client did not change alone', () => {
    const resolved = resolve(
      makeRoadmap([{ id: 'first', featureIds: [], details: { title: 'Phase one' } }]),
    );
    const milestone = resolved.milestones[0]!.milestone;

    expect(milestone.description).toBe(catalog.milestones[0]!.description);
    expect(milestone.status).toBe('planned');
  });

  it('clears a target date when the client cleared it', () => {
    const dated = makeCatalog({
      milestones: [makeMilestone('first', { deadline: new Date('2027-01-31T00:00:00') })],
      features: [],
    });

    const resolved = resolveRoadmap(
      dated,
      makeRoadmap([{ id: 'first', featureIds: [], details: { deadline: null } }]),
      EMPTY_FEATURE_STATUSES,
    );

    expect(resolved.milestones[0]!.milestone.deadline).toBeNull();
  });
});

describe('milestones whose delivery has started', () => {
  const started = makeCatalog({
    milestones: [makeMilestone('first', { status: 'active' })],
    features: [],
  });

  it('settles the scope of one the proposal says is under way', () => {
    const resolved = resolveRoadmap(
      started,
      makeRoadmap([{ id: 'first', featureIds: [] }]),
      EMPTY_FEATURE_STATUSES,
    );

    expect(resolved.milestones[0]!.isScopeLocked).toBe(true);
  });

  it('leaves the scope open when the client set the status themselves', () => {
    const resolved = resolve(
      makeRoadmap([{ id: 'first', featureIds: [], details: { status: 'active' } }]),
    );

    expect(resolved.milestones[0]!.milestone.status).toBe('active');
    expect(resolved.milestones[0]!.isScopeLocked).toBe(false);
  });
});

describe('the pool of available features', () => {
  it('leaves out everything the roadmap has claimed', () => {
    const resolved = resolve(
      makeRoadmap([
        { id: 'first', featureIds: ['a'] },
        { id: 'second', featureIds: ['c'] },
      ]),
    );

    expect(resolved.availableFeatures.map((f) => f.id)).toEqual(['b', 'loose']);
  });

  it('offers back the features of a milestone that was never chosen', () => {
    const resolved = resolve(makeRoadmap([{ id: 'first', featureIds: ['a', 'b'] }]));

    expect(resolved.availableFeatures.map((f) => f.id)).toContain('c');
  });
});

describe('status overrides', () => {
  it('applies a changed status to the feature in the roadmap', () => {
    const resolved = resolve(makeRoadmap([{ id: 'first', featureIds: ['a'] }]), { a: 'done' });

    expect(resolved.milestones[0]!.features[0]!.status).toBe('done');
  });

  it('applies a changed status to a feature still on the menu', () => {
    const resolved = resolve(makeRoadmap(), { loose: 'in_progress' });

    expect(resolved.availableFeatures.find((f) => f.id === 'loose')!.status).toBe('in_progress');
  });

  it('leaves the catalog untouched', () => {
    resolve(makeRoadmap([{ id: 'first', featureIds: ['a'] }]), { a: 'done' });

    expect(catalog.features[0]!.status).toBe('backlog');
  });
});

describe('suggestedFeatureIds', () => {
  it('lists the features the content pairs with a milestone', () => {
    expect(suggestedFeatureIds(catalog, 'first')).toEqual(['a', 'b']);
  });

  it('is empty for a milestone nothing is paired with', () => {
    expect(suggestedFeatureIds(catalog, 'ghost')).toEqual([]);
  });
});

describe('resolveSuggestions', () => {
  it('pairs every catalog milestone with the features written for it', () => {
    const menu = resolveSuggestions(catalog);

    expect(menu.map((m) => m.milestone.id)).toEqual(['first', 'second']);
    expect(menu[0]!.features.map((f) => f.id)).toEqual(['a', 'b']);
    expect(menu[1]!.features.map((f) => f.id)).toEqual(['c']);
  });

  it('is empty before the catalog has loaded', () => {
    expect(resolveSuggestions(null)).toEqual([]);
  });
});
