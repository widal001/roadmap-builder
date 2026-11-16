/**
 * Prices for milestones and for the roadmap as a whole.
 *
 * A milestone is a pre-configured dish and its features are what's on it, so a
 * milestone's price is simply the sum of its features. There is no budget
 * ceiling and therefore no such thing as being over budget: changing the price
 * means changing what's included.
 *
 * The one comparison worth making is against the milestone as suggested, so
 * the client can see how far their version has drifted. That difference is
 * reported neutrally — a larger number is not a problem, just a larger number.
 */

import { sizeToCents } from '@/lib/budget/format-size';
import { isDelivered } from '@/config/statuses';
import type { ResolvedMilestone } from '@/lib/roadmap/resolve-roadmap';
import type { Feature } from '@/types/domain';

export interface MilestoneRollup {
  /** The price of the milestone as suggested, before any of the client's changes. */
  defaultPriceCents: number;
  /** The price of the milestone as it currently stands. */
  priceCents: number;
  /** priceCents minus defaultPriceCents. Positive means the client added to it. */
  differenceCents: number;
  /** True when the client's selection differs from the suggested one. */
  isCustomized: boolean;
  /** Total size of the features that have reached a delivered status. */
  deliveredCents: number;
  /** How much of the current selection is delivered, from 0 to 1. */
  completion: number;
  featureCount: number;
}

export interface RoadmapRollup {
  /** The running total: every milestone in the roadmap, added up. */
  totalCents: number;
  milestoneCount: number;
  /** Features across the whole roadmap. */
  featureCount: number;
  /** Total size of the roadmap's features that have been delivered. */
  deliveredCents: number;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Prices each milestone in the roadmap, keyed by milestone ID.
 *
 * `catalogFeatures` is the menu as written in content. It's used only to work
 * out what each milestone was suggested to contain, by way of the milestone
 * each feature is paired with there.
 */
export function computeMilestoneRollups(
  milestones: readonly ResolvedMilestone[],
  catalogFeatures: readonly Feature[] = [],
): Readonly<Record<string, MilestoneRollup>> {
  const suggested = groupByMilestone(catalogFeatures);
  const rollups: Record<string, MilestoneRollup> = {};

  for (const { milestone, features, isCustom } of milestones) {
    const priceCents = totalPrice(features);
    const deliveredCents = totalPrice(features.filter((f) => isDelivered(f.status)));

    // A client-built milestone was never suggested, so there's nothing for it
    // to have drifted from. Its suggestion is whatever the client chose.
    const recommended = isCustom ? features : (suggested.get(milestone.id) ?? []);
    const defaultPriceCents = isCustom ? priceCents : totalPrice(recommended);

    rollups[milestone.id] = {
      defaultPriceCents,
      priceCents,
      differenceCents: priceCents - defaultPriceCents,
      isCustomized: !isCustom && !sameFeatures(features, recommended),
      deliveredCents,
      completion: priceCents > 0 ? deliveredCents / priceCents : 0,
      featureCount: features.length,
    };
  }

  return rollups;
}

/**
 * The running total across the roadmap.
 *
 * Everything in the roadmap counts, because being in the roadmap is the only
 * decision there is. What's still on the menu costs nothing until it's added.
 */
export function computeRoadmapRollup(
  rollups: Readonly<Record<string, MilestoneRollup>>,
): RoadmapRollup {
  const entries = Object.values(rollups);

  return {
    totalCents: sum(entries, (rollup) => rollup.priceCents),
    milestoneCount: entries.length,
    featureCount: sum(entries, (rollup) => rollup.featureCount),
    deliveredCents: sum(entries, (rollup) => rollup.deliveredCents),
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function totalPrice(features: readonly Feature[]): number {
  return features.reduce((total, feature) => total + sizeToCents(feature.size), 0);
}

function sum<T>(items: readonly T[], value: (item: T) => number): number {
  return items.reduce((total, item) => total + value(item), 0);
}

/** The features the content pairs with each milestone, keyed by milestone ID. */
function groupByMilestone(features: readonly Feature[]): Map<string, Feature[]> {
  const grouped = new Map<string, Feature[]>();

  for (const feature of features) {
    if (feature.milestoneId === null) continue;
    const existing = grouped.get(feature.milestoneId);
    if (existing) existing.push(feature);
    else grouped.set(feature.milestoneId, [feature]);
  }

  return grouped;
}

/** Whether two selections contain the same features, regardless of order. */
function sameFeatures(a: readonly Feature[], b: readonly Feature[]): boolean {
  if (a.length !== b.length) return false;
  const ids = new Set(b.map((f) => f.id));
  return a.every((f) => ids.has(f.id));
}
