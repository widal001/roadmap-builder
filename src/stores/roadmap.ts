/**
 * Connects the pure roadmap modules to Svelte.
 *
 * There is no business logic in this file. It holds the source stores, a set
 * of thin actions that write to them, and derived stores that components read.
 * The work happens in src/lib/roadmap and src/lib/budget.
 *
 * Store names have no `$` prefix: Svelte reserves `$`-prefixed identifiers for
 * its own auto-subscription, so components write `$roadmapMilestones` to read
 * the value of the store exported here as `roadmapMilestones`.
 */

import { atom, computed } from 'nanostores';
import { persistentAtom } from '@nanostores/persistent';

import * as roadmapOps from '@/lib/roadmap/operations';
import {
  createEmptyRoadmap,
  newCustomMilestoneId,
  type MilestoneDetails,
  type Roadmap,
} from '@/lib/roadmap/types';
import {
  EMPTY_FEATURE_STATUSES,
  FEATURE_STATUS_STORAGE_KEY,
  applyFeatureStatuses,
  parseSavedStatuses,
  serializeStatuses,
  withFeatureStatus,
  type FeatureStatuses,
} from '@/lib/roadmap/feature-statuses';
import {
  ROADMAP_STORAGE_KEY,
  parseSavedRoadmap,
  serializeRoadmap,
  startingRoadmap,
} from '@/lib/roadmap/saved-roadmap';
import {
  resolveRoadmap,
  resolveSuggestions,
  suggestedFeatureIds,
} from '@/lib/roadmap/resolve-roadmap';
import { computeMilestoneRollups, computeRoadmapRollup } from '@/lib/budget/rollup';

import type { Catalog } from '@/types/domain';
import type { FeatureStatusId } from '@/config/statuses';

// ---------------------------------------------------------------------------
// Source stores
//
// The menu, the roadmap assembled from it, and the statuses changed along the
// way. Every other store here is computed from these three. catalog is
// deliberately not exported, so no component can read unresolved plan data.
// ---------------------------------------------------------------------------

const catalog = atom<Catalog | null>(null);

/** The roadmap the client has assembled. Saved so it survives a reload. */
export const roadmap = persistentAtom<Roadmap | null>(ROADMAP_STORAGE_KEY, null, {
  encode: serializeRoadmap,
  decode: parseSavedRoadmap,
});

/** Statuses the client has changed, keyed by feature ID. */
export const featureStatuses = persistentAtom<FeatureStatuses>(
  FEATURE_STATUS_STORAGE_KEY,
  EMPTY_FEATURE_STATUSES,
  { encode: serializeStatuses, decode: parseSavedStatuses },
);

// ---------------------------------------------------------------------------
// Actions
//
// The only functions that write to the source stores. Each one hands off to a
// pure operation and stores the result.
// ---------------------------------------------------------------------------

/**
 * Sets the menu and discards a roadmap assembled from a different one.
 *
 * Called once by the header island when it mounts, on every page.
 */
export function initRoadmap(loaded: Catalog): void {
  catalog.set(loaded);
  roadmap.set(startingRoadmap(roadmap.get(), loaded.hash));
}

/** Empties the roadmap and clears every status change. */
export function resetRoadmap(): void {
  const loaded = catalog.get();
  if (loaded) roadmap.set(createEmptyRoadmap(loaded.hash));
  featureStatuses.set(EMPTY_FEATURE_STATUSES);
}

/** Adds a milestone off the menu, bringing its suggested features with it. */
export function addMilestone(milestoneId: string): void {
  const loaded = catalog.get();
  const current = roadmap.get();
  if (!loaded || !current) return;

  const suggested = suggestedFeatureIds(loaded, milestoneId);
  roadmap.set(roadmapOps.addMilestone(current, milestoneId, suggested));
}

export function removeMilestone(milestoneId: string): void {
  update((current) => roadmapOps.removeMilestone(current, milestoneId));
}

export function addFeature(milestoneId: string, featureId: string): void {
  update((current) => roadmapOps.addFeature(current, milestoneId, featureId));
}

export function removeFeature(milestoneId: string, featureId: string): void {
  update((current) => roadmapOps.removeFeature(current, milestoneId, featureId));
}

export function moveMilestone(milestoneId: string, toIndex: number): void {
  update((current) => roadmapOps.moveMilestone(current, milestoneId, toIndex));
}

/** Starts a milestone the client builds themselves, and returns its new ID. */
export function createCustomMilestone(details: MilestoneDetails): string | null {
  const current = roadmap.get();
  if (!current) return null;

  const id = newCustomMilestoneId();
  roadmap.set(roadmapOps.createCustomMilestone(current, id, details));
  return id;
}

/** Changes a milestone's name, description, target date or status. */
export function setMilestoneDetails(milestoneId: string, changes: MilestoneDetails): void {
  update((current) => roadmapOps.setMilestoneDetails(current, milestoneId, changes));
}

/** Records a status change, which is a fact about the work, not about the roadmap. */
export function setFeatureStatus(featureId: string, status: FeatureStatusId): void {
  const catalogStatus = catalog.get()?.features.find((f) => f.id === featureId)?.status;
  if (!catalogStatus) return;

  featureStatuses.set(withFeatureStatus(featureStatuses.get(), featureId, status, catalogStatus));
}

// ---------------------------------------------------------------------------
// Derived stores
//
// The roadmap resolved against the menu, plus prices. Components read these.
// ---------------------------------------------------------------------------

const resolvedRoadmap = computed([catalog, roadmap, featureStatuses], resolveRoadmap);

/** The chosen milestones with their features, in delivery order. */
export const roadmapMilestones = computed(resolvedRoadmap, (resolved) => resolved.milestones);

/** The features not in any chosen milestone: the pool to pick from. */
export const availableFeatures = computed(
  resolvedRoadmap,
  (resolved) => resolved.availableFeatures,
);

/** Every feature on the menu, with the current statuses applied. */
export const allFeatures = computed([catalog, featureStatuses], (loaded, statuses) =>
  applyFeatureStatuses(loaded?.features ?? [], statuses),
);

/** Every milestone we proposed, with the features paired with it in content. */
export const menuMilestones = computed(catalog, resolveSuggestions);

/** What each milestone on the menu would cost as suggested, keyed by milestone ID. */
export const menuRollups = computed([menuMilestones, catalog], (menu, loaded) =>
  computeMilestoneRollups(menu, loaded?.features ?? []),
);

/** The IDs in the roadmap, so a card can tell whether it's been chosen. */
export const chosenMilestoneIds = computed(
  roadmap,
  (current) => new Set((current?.milestones ?? []).map((milestone) => milestone.id)),
);

/** The price of each milestone in the roadmap, keyed by milestone ID. */
export const milestoneRollups = computed([roadmapMilestones, catalog], (milestones, loaded) =>
  computeMilestoneRollups(milestones, loaded?.features ?? []),
);

/** The running total across the roadmap. */
export const roadmapRollup = computed(milestoneRollups, computeRoadmapRollup);

/** True until the header island has handed the menu to initRoadmap. */
export const isLoading = computed(catalog, (loaded) => loaded === null);

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Applies one pure operation to the roadmap.
 *
 * The operations return the identical roadmap when nothing changed, and
 * nanostores skips notifying subscribers when a store is set to the value it
 * already holds, so a no-op costs nothing downstream.
 */
function update(change: (current: Roadmap) => Roadmap): void {
  const current = roadmap.get();
  if (!current) return;

  roadmap.set(change(current));
}
