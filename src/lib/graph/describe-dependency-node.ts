/**
 * What a dependency shows besides its name.
 *
 * Both dependency views answer the same three questions about every feature
 * they draw: how far along it is, which milestone it sits in, and what it
 * costs. Working that out here means the tree and the diagram can't drift
 * apart, and it keeps the formatting and config lookups out of the components.
 *
 * Which milestone a feature sits in depends on what the client has assembled,
 * so the caller resolves that from the roadmap stores and passes it in. This
 * module stays pure.
 */

import { findFeatureStatus, type FeatureStatusId } from '@/config/statuses';
import { formatCents, sizeToCents } from '@/lib/budget/format-size';
import { milestoneHref } from '@/lib/roadmap/milestone-links';
import type { DependencyTreeNode } from '@/lib/graph/build-dependency-tree';
import type { Feature } from '@/types/domain';

/** The milestone a feature sits in, and how it got there. */
export interface MilestonePlacement {
  id: string;
  title: string;
  /** 'roadmap' when the client has chosen it, 'menu' when it's only suggested. */
  source: 'roadmap' | 'menu';
}

export interface DependencyNodeFacts {
  id: string;
  title: string;
  /** One sentence about the work, when the content file has one. */
  summary: string;
  href: string;
  statusId: FeatureStatusId;
  statusLabel: string;
  /** The CSS class for the status pill, from the shared status styles. */
  statusClass: string;
  price: string;
  /** Null when the feature isn't in any milestone, which is a normal state. */
  milestoneTitle: string | null;
  milestoneHref: string | null;
  /** What to say about the milestone: chosen, suggested, or neither. */
  milestoneNote: string;
}

/** One node of a dependency tree, with everything its row shows worked out. */
export interface DependencyRow {
  facts: DependencyNodeFacts;
  isRepeat: boolean;
  isTruncated: boolean;
  children: readonly DependencyRow[];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** The page that shows a feature and what it depends on. */
export function featureHref(id: string): string {
  return `/features/${id}/`;
}

/** Describes one feature for a dependency row or a diagram node. */
export function describeDependencyNode(
  feature: Feature,
  placement: MilestonePlacement | null,
): DependencyNodeFacts {
  const status = findFeatureStatus(feature.status);

  return {
    id: feature.id,
    title: feature.title,
    summary: feature.summary ?? '',
    href: featureHref(feature.id),
    statusId: feature.status,
    statusLabel: status?.label ?? feature.status,
    statusClass: `status status--${feature.status}`,
    price: formatCents(sizeToCents(feature.size)),
    milestoneTitle: placement?.title ?? null,
    milestoneHref: placement ? milestoneHref(placement.id) : null,
    milestoneNote: milestoneNoteFor(placement),
  };
}

/**
 * Describes every node of a tree, keeping its shape.
 *
 * `describe` is passed in rather than called directly because milestone
 * membership and the current status both depend on what the client has done,
 * which lives in a store. This module stays free of Svelte either way.
 */
export function describeDependencyTree(
  node: DependencyTreeNode,
  describe: (feature: Feature) => DependencyNodeFacts,
): DependencyRow {
  return {
    facts: describe(node.feature),
    isRepeat: node.isRepeat,
    isTruncated: node.isTruncated,
    children: node.children.map((child) => describeDependencyTree(child, describe)),
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * A feature in no milestone is ordinary: the catalog is a menu, and plenty of
 * it goes unchosen. The note says which of the three cases this is, so colour
 * and position are never the only signal.
 */
function milestoneNoteFor(placement: MilestonePlacement | null): string {
  if (!placement) return 'Not in a milestone';

  return placement.source === 'roadmap' ? 'In your roadmap' : 'On the menu';
}
