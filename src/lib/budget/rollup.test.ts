import { describe, expect, it } from 'vitest';

import { computeMilestoneRollups, computeRoadmapRollup } from '@/lib/budget/rollup';
import type { ResolvedMilestone } from '@/lib/roadmap/resolve-roadmap';
import { makeFeature, makeMilestone, mid } from '@/lib/test-support/plan-fixtures';
import type { Feature } from '@/types/domain';

// Features cost weight x $5,000: xs $2,500, s $5,000, m $10,000, l $15,000, xl $25,000.
const DOLLARS = 100;

function chosen(id: string, features: readonly Feature[]): ResolvedMilestone {
  return { milestone: makeMilestone(id), features, isCustom: false, isScopeLocked: false };
}

function built(id: string, features: readonly Feature[]): ResolvedMilestone {
  return { milestone: makeMilestone(id), features, isCustom: true, isScopeLocked: false };
}

describe('pricing a milestone', () => {
  it('prices a milestone as the sum of its features', () => {
    const features = [
      makeFeature('a', { size: 'm' }), // $10,000
      makeFeature('b', { size: 'l' }), // $15,000
    ];

    const rollup = computeMilestoneRollups([chosen('m1', features)]).m1!;

    expect(rollup.priceCents).toBe(25_000 * DOLLARS);
    expect(rollup.featureCount).toBe(2);
  });

  it('prices an empty milestone at zero', () => {
    const rollup = computeMilestoneRollups([chosen('m1', [])]).m1!;

    expect(rollup.priceCents).toBe(0);
    expect(rollup.completion).toBe(0);
  });

  it('keeps whole cents for half-weight features', () => {
    const rollup = computeMilestoneRollups([chosen('m1', [makeFeature('a', { size: 'xs' })])]).m1!;

    expect(rollup.priceCents).toBe(2_500 * DOLLARS);
    expect(Number.isInteger(rollup.priceCents)).toBe(true);
  });

  it('ignores features that are not in any milestone', () => {
    const onTheMenu = [makeFeature('loose', { size: 'xl' })];

    const rollup = computeMilestoneRollups([chosen('m1', [])], onTheMenu).m1!;

    expect(rollup.priceCents).toBe(0);
  });
});

describe('comparing against the suggestion', () => {
  // The catalog pairs a and b with m1. That pairing is the suggestion.
  const catalogFeatures = [
    makeFeature('a', { milestoneId: mid('m1'), size: 'm' }),
    makeFeature('b', { milestoneId: mid('m1'), size: 'm' }),
    makeFeature('c', { milestoneId: null, size: 'l' }),
  ];
  const suggested = catalogFeatures.slice(0, 2);

  it('reports no difference when the client took it as it comes', () => {
    const rollup = computeMilestoneRollups([chosen('m1', suggested)], catalogFeatures).m1!;

    expect(rollup.defaultPriceCents).toBe(20_000 * DOLLARS);
    expect(rollup.differenceCents).toBe(0);
    expect(rollup.isCustomized).toBe(false);
  });

  it('reports a positive difference when the client adds a feature', () => {
    const selection = [...suggested, catalogFeatures[2]!];

    const rollup = computeMilestoneRollups([chosen('m1', selection)], catalogFeatures).m1!;

    expect(rollup.priceCents).toBe(35_000 * DOLLARS);
    expect(rollup.differenceCents).toBe(15_000 * DOLLARS);
    expect(rollup.isCustomized).toBe(true);
  });

  it('reports a negative difference when the client takes one off', () => {
    const rollup = computeMilestoneRollups([chosen('m1', [suggested[0]!])], catalogFeatures).m1!;

    expect(rollup.differenceCents).toBe(-10_000 * DOLLARS);
    expect(rollup.isCustomized).toBe(true);
  });

  it('counts a swap of equally priced features as a change', () => {
    const swapped = [suggested[0]!, makeFeature('other', { size: 'm' })];

    const rollup = computeMilestoneRollups([chosen('m1', swapped)], catalogFeatures).m1!;

    expect(rollup.differenceCents).toBe(0);
    expect(rollup.isCustomized).toBe(true);
  });

  it('ignores the order the client put the features in', () => {
    const reordered = [suggested[1]!, suggested[0]!];

    expect(
      computeMilestoneRollups([chosen('m1', reordered)], catalogFeatures).m1!.isCustomized,
    ).toBe(false);
  });

  it('never calls a client-built milestone customized, because nothing was suggested', () => {
    const rollup = computeMilestoneRollups([built('custom-1', suggested)], catalogFeatures)[
      'custom-1'
    ]!;

    expect(rollup.isCustomized).toBe(false);
    expect(rollup.defaultPriceCents).toBe(rollup.priceCents);
    expect(rollup.differenceCents).toBe(0);
  });
});

describe('delivered work', () => {
  it('counts only features with a done status', () => {
    const features = [
      makeFeature('a', { size: 'm', status: 'done' }),
      makeFeature('b', { size: 'm', status: 'in_review' }),
      makeFeature('c', { size: 'm', status: 'cancelled' }),
    ];

    const rollup = computeMilestoneRollups([chosen('m1', features)]).m1!;

    expect(rollup.deliveredCents).toBe(10_000 * DOLLARS);
    expect(rollup.completion).toBeCloseTo(1 / 3);
  });
});

describe('the running total', () => {
  const milestones = [
    chosen('first', [makeFeature('a', { size: 'm' })]), // $10,000
    chosen('second', [makeFeature('b', { size: 'l' }), makeFeature('c', { size: 'xl' })]),
  ];

  it('adds up everything in the roadmap', () => {
    const total = computeRoadmapRollup(computeMilestoneRollups(milestones));

    expect(total.totalCents).toBe(50_000 * DOLLARS);
    expect(total.milestoneCount).toBe(2);
    expect(total.featureCount).toBe(3);
  });

  it('grows when a milestone is added and shrinks when it is taken out', () => {
    const withOne = computeRoadmapRollup(computeMilestoneRollups(milestones.slice(0, 1)));
    const withBoth = computeRoadmapRollup(computeMilestoneRollups(milestones));

    expect(withOne.totalCents).toBe(10_000 * DOLLARS);
    expect(withBoth.totalCents).toBeGreaterThan(withOne.totalCents);
  });

  it('counts a client-built milestone like any other', () => {
    const total = computeRoadmapRollup(
      computeMilestoneRollups([
        ...milestones,
        built('custom-1', [makeFeature('d', { size: 's' })]),
      ]),
    );

    expect(total.totalCents).toBe(55_000 * DOLLARS);
    expect(total.milestoneCount).toBe(3);
  });

  it('totals the delivered work across the roadmap', () => {
    const delivered = [chosen('m1', [makeFeature('a', { size: 'm', status: 'done' })])];

    expect(computeRoadmapRollup(computeMilestoneRollups(delivered)).deliveredCents).toBe(
      10_000 * DOLLARS,
    );
  });

  it('is zero for an empty roadmap', () => {
    const total = computeRoadmapRollup({});

    expect(total.totalCents).toBe(0);
    expect(total.milestoneCount).toBe(0);
    expect(total.featureCount).toBe(0);
  });
});
