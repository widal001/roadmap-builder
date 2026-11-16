/**
 * Working out what else a feature needs.
 *
 * Adding a feature to the roadmap is only meaningful if the work it depends on
 * is either already delivered or also in the roadmap. This walks the
 * `blockedBy` chain and reports what's missing, so the UI can offer to add it
 * all at once rather than letting someone commit to something unbuildable.
 */

import { isDelivered } from '@/config/statuses';
import { sizeToCents } from '@/lib/budget/format-size';
import { allFeatureIds } from '@/lib/roadmap/operations';
import type { Roadmap } from '@/lib/roadmap/types';
import type { Feature } from '@/types/domain';
import type { FeatureId } from '@/types/brand';

export interface Prerequisites {
  /** Everything upstream that is neither delivered nor already in the roadmap. */
  missing: readonly Feature[];
  /** What adding all of them would cost. */
  additionalCents: number;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * The upstream features that would also need to be added.
 *
 * Walks the whole `blockedBy` chain, not just the immediate blockers, because
 * adding a blocker can itself pull in another one. A prerequisite counts as
 * satisfied when it has been delivered, or when it already sits in one of the
 * roadmap's milestones — which milestone doesn't matter, only that it's in.
 */
export function missingPrerequisites(
  feature: Feature,
  features: readonly Feature[],
  roadmap: Roadmap,
): Prerequisites {
  const byId = new Map<FeatureId, Feature>(features.map((f) => [f.id, f]));
  const inRoadmap = new Set<string>(allFeatureIds(roadmap));

  const missing: Feature[] = [];
  const seen = new Set<FeatureId>([feature.id]);
  const queue = [...feature.blockedBy];

  while (queue.length > 0) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);

    const upstream = byId.get(id);
    if (!upstream) continue;
    if (isSatisfied(upstream, inRoadmap)) continue;

    missing.push(upstream);
    queue.push(...upstream.blockedBy);
  }

  return {
    missing,
    additionalCents: missing.reduce((total, f) => total + sizeToCents(f.size), 0),
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Delivered work, or work the client has already chosen. */
function isSatisfied(feature: Feature, inRoadmap: ReadonlySet<string>): boolean {
  return isDelivered(feature.status) || inRoadmap.has(feature.id);
}
