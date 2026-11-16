/**
 * Turning the saved roadmap into something the UI can render.
 *
 * The roadmap holds IDs and the details the client has changed. Components
 * need whole milestones and features, in the order the client put them in,
 * with those changes and the current statuses applied. This module is the one
 * place that join happens, so no component ever reads the catalog and the
 * roadmap side by side and draws its own conclusions.
 *
 * It also reports what isn't in the roadmap, because the catalog is a menu and
 * the pool of unchosen features is where everything is picked from.
 *
 * Pure, and free of Svelte, so it can be tested on its own.
 */

import { applyFeatureStatuses, type FeatureStatuses } from '@/lib/roadmap/feature-statuses';
import { isCustomMilestoneId, type MilestoneDetails, type Roadmap } from '@/lib/roadmap/types';
import { isDeliveryStarted } from '@/config/statuses';
import { toMilestoneId } from '@/types/brand';
import type { Catalog, Feature, Milestone } from '@/types/domain';

export interface ResolvedMilestone {
  /** The milestone with the client's changes applied. */
  milestone: Milestone;
  /** The features in it, in the order the roadmap lists them. */
  features: readonly Feature[];
  /** True when the client built this milestone instead of taking it off the menu. */
  isCustom: boolean;
  /**
   * True when the proposal already had delivery under way.
   *
   * Scope is settled once real work has started, so these milestones can't
   * have features added or removed. This reads the status written in content,
   * not the one the client set: marking a milestone started is a note about
   * progress, and it shouldn't lock the client out of the page they're on.
   */
  isScopeLocked: boolean;
}

export interface ResolvedRoadmap {
  /** The chosen milestones, in delivery order. */
  milestones: readonly ResolvedMilestone[];
  /** Everything not in any chosen milestone: the pool features are picked from. */
  availableFeatures: readonly Feature[];
}

/** What to render before the catalog has reached the store. */
export const EMPTY_RESOLVED_ROADMAP: ResolvedRoadmap = { milestones: [], availableFeatures: [] };

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolves the roadmap against the catalog.
 *
 * Accepts nulls and returns an empty result, so components that mount before
 * the catalog has loaded don't need their own null checks. IDs that aren't in
 * the catalog are dropped rather than rendered as gaps: they can only come
 * from a roadmap saved against content that has since changed.
 */
export function resolveRoadmap(
  catalog: Catalog | null,
  roadmap: Roadmap | null,
  statuses: FeatureStatuses,
): ResolvedRoadmap {
  if (!catalog) return EMPTY_RESOLVED_ROADMAP;

  const features = applyFeatureStatuses(catalog.features, statuses);
  if (!roadmap) return { milestones: [], availableFeatures: features };

  const featuresById = new Map(features.map((feature) => [feature.id as string, feature]));
  const milestonesById = new Map(catalog.milestones.map((m) => [m.id as string, m]));
  const chosen = new Set<string>();

  const milestones = roadmap.milestones.flatMap((entry, index): ResolvedMilestone[] => {
    const isCustom = isCustomMilestoneId(entry.id);
    const proposed = isCustom ? blankMilestone(entry.id, index) : milestonesById.get(entry.id);
    if (!proposed) return [];

    const contents = entry.featureIds.flatMap((id) => {
      const feature = featuresById.get(id);
      if (!feature) return [];
      chosen.add(id);
      return [feature];
    });

    return [
      {
        milestone: withDetails(proposed, entry.details),
        features: contents,
        isCustom,
        isScopeLocked: isDeliveryStarted(proposed.status),
      },
    ];
  });

  return {
    milestones,
    availableFeatures: features.filter((feature) => !chosen.has(feature.id)),
  };
}

/**
 * The features the catalog suggests for a milestone, in catalog order.
 *
 * This is the pairing written in the content files. Adding a milestone to the
 * roadmap brings these along, and comparing against them is what tells the
 * client they've changed something.
 */
export function suggestedFeatureIds(catalog: Catalog, milestoneId: string): readonly string[] {
  return catalog.features.filter((f) => f.milestoneId === milestoneId).map((f) => f.id as string);
}

/**
 * Every milestone we proposed, with the features paired with it in content.
 *
 * Resolved the same way a chosen milestone is, so the same pricing code can
 * tell the client what a milestone would cost before they add it.
 */
export function resolveSuggestions(catalog: Catalog | null): readonly ResolvedMilestone[] {
  if (!catalog) return [];

  return catalog.milestones.map((milestone) => ({
    milestone,
    features: catalog.features.filter((feature) => feature.milestoneId === milestone.id),
    isCustom: false,
    isScopeLocked: isDeliveryStarted(milestone.status),
  }));
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** The milestone as the client has it, with anything they left alone intact. */
function withDetails(milestone: Milestone, details: MilestoneDetails | undefined): Milestone {
  if (!details) return milestone;

  return {
    ...milestone,
    title: details.title ?? milestone.title,
    description: details.description ?? milestone.description,
    deadline:
      details.deadline === undefined
        ? milestone.deadline
        : details.deadline === null
          ? null
          : parseDeadline(details.deadline),
    status: details.status ?? milestone.status,
  };
}

/**
 * Reads a saved target date.
 *
 * A bare `YYYY-MM-DD` is read as local midnight rather than UTC, so the date
 * the client picked isn't shown back to them as the day before.
 */
function parseDeadline(value: string): Date {
  return new Date(value.includes('T') ? value : `${value}T00:00:00`);
}

/**
 * The milestone shape a client-built one starts from.
 *
 * It has no content file, so everything the client typed arrives as details
 * and this fills in the rest. Components then treat it exactly like a
 * milestone off the menu.
 */
function blankMilestone(id: string, index: number): Milestone {
  return {
    id: toMilestoneId(id),
    title: 'Untitled milestone',
    description: '',
    deadline: null,
    tags: [],
    status: 'planned',
    position: index + 1,
  };
}
