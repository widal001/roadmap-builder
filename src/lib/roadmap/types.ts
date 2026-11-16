/**
 * The roadmap the client has assembled.
 *
 * This is the saved artifact, not a patch against anything. It lists the
 * milestones chosen and the features in each, by ID. A milestone is either in
 * the roadmap or still on the menu; there is no third state.
 *
 * A milestone entry also carries the details the client has changed about it.
 * Those details work the same way whether the milestone came off the menu or
 * the client built it themselves: a client-built one simply has no content
 * file behind it, so its details are all there is.
 *
 * Feature statuses are deliberately not here. A status is a fact about the
 * work, not a property of the roadmap, so it lives in its own small store and
 * moves into plan data once there is real storage to write to.
 */

import type { MilestoneStatusId } from '@/config/statuses';

/**
 * Version 2 replaced the `custom` block, which only a client-built milestone
 * could have, with `details`, which any milestone can have.
 */
export const ROADMAP_VERSION = 2;

/**
 * The milestone fields the client has changed.
 *
 * Every field is optional, and an absent field means "whatever the content
 * file says". For a client-built milestone there is no content file, so these
 * are the only details it has.
 */
export interface MilestoneDetails {
  readonly title?: string;
  readonly description?: string;
  /** ISO date string, because the roadmap is serialized to localStorage. */
  readonly deadline?: string | null;
  readonly status?: MilestoneStatusId;
}

export interface RoadmapMilestone {
  /** A catalog milestone ID, or a generated one for a client-built milestone. */
  readonly id: string;
  /** The features in this milestone, in order. */
  readonly featureIds: readonly string[];
  /** Set only for fields the client has changed. */
  readonly details?: MilestoneDetails;
}

export interface Roadmap {
  readonly version: typeof ROADMAP_VERSION;
  /** Hash of the catalog this was built from, to detect a catalog that changed. */
  readonly catalogHash: string;
  /** The chosen milestones, in the order they should be delivered. */
  readonly milestones: readonly RoadmapMilestone[];
}

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

export function createEmptyRoadmap(catalogHash: string): Roadmap {
  return { version: ROADMAP_VERSION, catalogHash, milestones: [] };
}

export function isEmptyRoadmap(roadmap: Roadmap): boolean {
  return roadmap.milestones.length === 0;
}

// ---------------------------------------------------------------------------
// Client-built milestone IDs
//
// The ID prefix is the single fact that says a milestone was built rather than
// chosen, so nothing has to keep a separate flag in step with it.
// ---------------------------------------------------------------------------

/** Prefix for generated IDs, so they can never collide with a catalog entry. */
export const CUSTOM_MILESTONE_PREFIX = 'custom-';

export function isCustomMilestoneId(id: string): boolean {
  return id.startsWith(CUSTOM_MILESTONE_PREFIX);
}

/** Time-based, so generated IDs sort in the order they were created. */
export function newCustomMilestoneId(now: number = Date.now()): string {
  return `${CUSTOM_MILESTONE_PREFIX}${now.toString(36)}`;
}
