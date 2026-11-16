/**
 * The statuses the client has changed during the demo.
 *
 * A status is a fact about the work, not a property of the roadmap, so it is
 * kept apart from the roadmap and keyed by feature ID. That separation is what
 * lets statuses move into plan data later without touching the roadmap format.
 *
 * This module owns the shape, the one operation on it, and how it is saved,
 * because all three change together.
 */

import { z } from 'zod';
import { FEATURE_STATUS_IDS, type FeatureStatusId } from '@/config/statuses';
import type { Feature } from '@/types/domain';

/** Statuses that differ from the catalog, keyed by feature ID. */
export type FeatureStatuses = Readonly<Record<string, FeatureStatusId>>;

export const EMPTY_FEATURE_STATUSES: FeatureStatuses = {};

/** The localStorage key. Includes a version so a future format can coexist. */
export const FEATURE_STATUS_STORAGE_KEY = 'roadmap-builder:statuses:v1';

// ---------------------------------------------------------------------------
// Changing and applying statuses
// ---------------------------------------------------------------------------

/**
 * Records a status change.
 *
 * Returns the record it was given when nothing changes, so computed stores can
 * skip recalculating. A status set back to what the catalog says drops out
 * entirely, so the overrides only ever hold real differences.
 */
export function withFeatureStatus(
  statuses: FeatureStatuses,
  featureId: string,
  status: FeatureStatusId,
  catalogStatus: FeatureStatusId,
): FeatureStatuses {
  const hasOverride = Object.hasOwn(statuses, featureId);

  if (status === catalogStatus) {
    if (!hasOverride) return statuses;
    const { [featureId]: _cleared, ...rest } = statuses;
    return rest;
  }

  if (hasOverride && statuses[featureId] === status) return statuses;
  return { ...statuses, [featureId]: status };
}

/** The features with their current statuses, for anything the UI renders. */
export function applyFeatureStatuses(
  features: readonly Feature[],
  statuses: FeatureStatuses,
): readonly Feature[] {
  if (Object.keys(statuses).length === 0) return features;

  return features.map((feature) => {
    const status = statuses[feature.id];
    return status === undefined || status === feature.status ? feature : { ...feature, status };
  });
}

// ---------------------------------------------------------------------------
// Saving
//
// Anything coming out of localStorage is untrusted, so parsing never throws:
// a value we can't read is treated as no overrides at all.
// ---------------------------------------------------------------------------

export function parseSavedStatuses(raw: string | null | undefined): FeatureStatuses {
  if (!raw) return EMPTY_FEATURE_STATUSES;

  try {
    const result = savedStatusesSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : EMPTY_FEATURE_STATUSES;
  } catch {
    return EMPTY_FEATURE_STATUSES;
  }
}

export function serializeStatuses(statuses: FeatureStatuses): string {
  return JSON.stringify(statuses);
}

// ---------------------------------------------------------------------------
// Schema
//
// Unknown statuses are rejected rather than coerced, so renaming a status in
// config discards saved overrides instead of leaving a value nothing renders.
// ---------------------------------------------------------------------------

const savedStatusesSchema = z.record(
  z.string(),
  z.enum(FEATURE_STATUS_IDS as unknown as [string, ...string[]]),
) as unknown as z.ZodType<FeatureStatuses>;
