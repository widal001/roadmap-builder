/**
 * Feature and milestone statuses.
 *
 * Position in the array determines both board column order and sort order, so
 * there is no separate order field. Reordering these arrays reorders the UI.
 */

export interface StatusDefinition {
  readonly id: string;
  readonly label: string;
  /** Terminal statuses are end states: nothing moves out of them. */
  readonly isTerminal: boolean;
}

export const FEATURE_STATUSES = [
  { id: 'backlog', label: 'Backlog', isTerminal: false },
  { id: 'prioritized', label: 'Prioritized', isTerminal: false },
  { id: 'in_progress', label: 'In progress', isTerminal: false },
  { id: 'in_review', label: 'In review', isTerminal: false },
  { id: 'done', label: 'Done', isTerminal: true },
  { id: 'cancelled', label: 'Cancelled', isTerminal: true },
] as const satisfies readonly StatusDefinition[];

export type FeatureStatusId = (typeof FEATURE_STATUSES)[number]['id'];

export const MILESTONE_STATUSES = [
  { id: 'planned', label: 'Planned', isTerminal: false },
  { id: 'active', label: 'Active', isTerminal: false },
  { id: 'complete', label: 'Complete', isTerminal: true },
] as const satisfies readonly StatusDefinition[];

export type MilestoneStatusId = (typeof MILESTONE_STATUSES)[number]['id'];

// ---------------------------------------------------------------------------
// Semantics
//
// The one place that decides what a status means for budget rollups.
// ---------------------------------------------------------------------------

/** The status that counts a feature as delivered in progress meters. */
export const DELIVERED_STATUS_ID = 'done' satisfies FeatureStatusId;

/** Whether a feature in this status counts toward the delivered total. */
export function isDelivered(status: FeatureStatusId): boolean {
  return status === DELIVERED_STATUS_ID;
}

/**
 * Whether work on a milestone has started.
 *
 * Scope is settled once delivery is under way, so these milestones can't have
 * features added or removed.
 */
export function isDeliveryStarted(status: MilestoneStatusId): boolean {
  return status !== 'planned';
}

export const FEATURE_STATUS_IDS = FEATURE_STATUSES.map((s) => s.id) as readonly FeatureStatusId[];
export const MILESTONE_STATUS_IDS = MILESTONE_STATUSES.map(
  (s) => s.id,
) as readonly MilestoneStatusId[];

const FEATURE_STATUS_BY_ID: ReadonlyMap<string, StatusDefinition> = new Map(
  FEATURE_STATUSES.map((s) => [s.id, s]),
);

/** Returns the status definition, or undefined when the ID isn't configured. */
export function findFeatureStatus(id: string): StatusDefinition | undefined {
  return FEATURE_STATUS_BY_ID.get(id);
}
