/**
 * Changing the roadmap.
 *
 * Every function is pure and returns the roadmap it was given when the change
 * is a no-op, so computed stores can skip recalculating. Because the roadmap
 * is a document rather than a patch, there is no baseline to compare against
 * and nothing to prune.
 *
 * A feature belongs to at most one milestone, which `addFeature` enforces by
 * taking it out of any other milestone on the way in.
 */

import {
  isCustomMilestoneId,
  type MilestoneDetails,
  type Roadmap,
  type RoadmapMilestone,
} from '@/lib/roadmap/types';

// ---------------------------------------------------------------------------
// Milestones
// ---------------------------------------------------------------------------

/** Adds a catalog milestone, pre-filled with the features suggested for it. */
export function addMilestone(roadmap: Roadmap, id: string, featureIds: readonly string[]): Roadmap {
  if (containsMilestone(roadmap, id)) return roadmap;

  // Features can only be in one milestone, so take them off any others first.
  const cleared = withoutFeatures(roadmap, featureIds);
  return { ...cleared, milestones: [...cleared.milestones, { id, featureIds: [...featureIds] }] };
}

export function removeMilestone(roadmap: Roadmap, id: string): Roadmap {
  if (!containsMilestone(roadmap, id)) return roadmap;
  return { ...roadmap, milestones: roadmap.milestones.filter((m) => m.id !== id) };
}

/** Adds a milestone the client built themselves, with the details they gave it. */
export function createCustomMilestone(
  roadmap: Roadmap,
  id: string,
  details: MilestoneDetails,
): Roadmap {
  if (!isCustomMilestoneId(id) || containsMilestone(roadmap, id)) return roadmap;
  return { ...roadmap, milestones: [...roadmap.milestones, { id, featureIds: [], details }] };
}

/**
 * Changes a milestone's name, description, target date or status.
 *
 * Works the same for a milestone off the menu and one the client built: the
 * fields named here are the client's, and anything left out keeps whatever the
 * content file says. Passing `undefined` for a field means "leave it alone",
 * so clearing a target date is `{ deadline: null }`.
 */
export function setMilestoneDetails(
  roadmap: Roadmap,
  id: string,
  changes: MilestoneDetails,
): Roadmap {
  const existing = findMilestone(roadmap, id);
  if (!existing) return roadmap;

  const details = { ...existing.details, ...definedFields(changes) };
  if (sameDetails(existing.details, details)) return roadmap;

  return mapMilestone(roadmap, id, (milestone) => ({ ...milestone, details }));
}

/** Moves a milestone to a new position, clamped to the ends of the list. */
export function moveMilestone(roadmap: Roadmap, id: string, toIndex: number): Roadmap {
  const from = roadmap.milestones.findIndex((m) => m.id === id);
  if (from === -1) return roadmap;

  const to = Math.max(0, Math.min(roadmap.milestones.length - 1, toIndex));
  if (to === from) return roadmap;

  const milestones = [...roadmap.milestones];
  const [moved] = milestones.splice(from, 1);
  milestones.splice(to, 0, moved!);
  return { ...roadmap, milestones };
}

// ---------------------------------------------------------------------------
// Features
// ---------------------------------------------------------------------------

/** Puts a feature in a milestone, taking it out of any other it was in. */
export function addFeature(roadmap: Roadmap, milestoneId: string, featureId: string): Roadmap {
  const target = findMilestone(roadmap, milestoneId);
  if (!target || target.featureIds.includes(featureId)) return roadmap;

  const cleared = withoutFeatures(roadmap, [featureId]);
  return mapMilestone(cleared, milestoneId, (milestone) => ({
    ...milestone,
    featureIds: [...milestone.featureIds, featureId],
  }));
}

export function removeFeature(roadmap: Roadmap, milestoneId: string, featureId: string): Roadmap {
  const target = findMilestone(roadmap, milestoneId);
  if (!target?.featureIds.includes(featureId)) return roadmap;

  return mapMilestone(roadmap, milestoneId, (milestone) => ({
    ...milestone,
    featureIds: milestone.featureIds.filter((id) => id !== featureId),
  }));
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function containsMilestone(roadmap: Roadmap, id: string): boolean {
  return roadmap.milestones.some((milestone) => milestone.id === id);
}

export function findMilestone(roadmap: Roadmap, id: string): RoadmapMilestone | undefined {
  return roadmap.milestones.find((milestone) => milestone.id === id);
}

/** Which milestone holds a feature, or null when it isn't in the roadmap. */
export function milestoneHolding(roadmap: Roadmap, featureId: string): string | null {
  return roadmap.milestones.find((m) => m.featureIds.includes(featureId))?.id ?? null;
}

/** Every feature ID in the roadmap, across all milestones. */
export function allFeatureIds(roadmap: Roadmap): readonly string[] {
  return roadmap.milestones.flatMap((milestone) => milestone.featureIds);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function mapMilestone(
  roadmap: Roadmap,
  id: string,
  change: (milestone: RoadmapMilestone) => RoadmapMilestone,
): Roadmap {
  return {
    ...roadmap,
    milestones: roadmap.milestones.map((milestone) =>
      milestone.id === id ? change(milestone) : milestone,
    ),
  };
}

/** Takes the given features out of every milestone that currently holds them. */
function withoutFeatures(roadmap: Roadmap, featureIds: readonly string[]): Roadmap {
  const removing = new Set(featureIds);
  let changed = false;

  const milestones = roadmap.milestones.map((milestone) => {
    const kept = milestone.featureIds.filter((id) => !removing.has(id));
    if (kept.length === milestone.featureIds.length) return milestone;
    changed = true;
    return { ...milestone, featureIds: kept };
  });

  return changed ? { ...roadmap, milestones } : roadmap;
}

/** The fields actually being set, so an absent one can't erase a saved value. */
function definedFields(changes: MilestoneDetails): MilestoneDetails {
  return Object.fromEntries(
    Object.entries(changes).filter(([, value]) => value !== undefined),
  ) as MilestoneDetails;
}

const DETAIL_FIELDS = ['title', 'description', 'deadline', 'status'] as const;

function sameDetails(a: MilestoneDetails | undefined, b: MilestoneDetails): boolean {
  return a !== undefined && DETAIL_FIELDS.every((field) => a[field] === b[field]);
}
