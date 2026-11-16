/**
 * The domain model.
 *
 * These types are independent of Astro and of any storage mechanism. Keep
 * Astro imports out of this file so the pure modules under src/lib can be
 * tested without loading the content layer.
 */

import type { FeatureId, MilestoneId, TagId } from '@/types/brand';
import type { SizeId } from '@/config/sizes';
import type { CategoryId } from '@/config/categories';
import type { FeatureStatusId, MilestoneStatusId } from '@/config/statuses';

export interface Feature {
  id: FeatureId;
  title: string;
  /**
   * One plain-text sentence about the work, derived from the first paragraph
   * of the markdown body when the catalog is built. Empty when there is no
   * body to derive it from.
   */
  summary: string;
  category: CategoryId;
  /** The milestone this feature is assigned to, or null if it's unassigned. */
  milestoneId: MilestoneId | null;
  /** Features that must be finished before this one. Written in the content files. */
  blockedBy: readonly FeatureId[];
  /** Features waiting on this one. Computed from other features' blockedBy lists. */
  blocking: readonly FeatureId[];
  tags: readonly TagId[];
  size: SizeId;
  status: FeatureStatusId;
  position: number;
}

export interface Milestone {
  id: MilestoneId;
  title: string;
  description: string;
  deadline: Date | null;
  tags: readonly TagId[];
  status: MilestoneStatusId;
  position: number;
}

export interface Program {
  title: string;
}

export interface Tag {
  id: TagId;
  label: string;
  description: string;
}

/** One edge of the dependency graph: `from` must finish before `to` can start. */
export interface DependencyEdge {
  from: FeatureId;
  to: FeatureId;
}

/**
 * The menu, loaded from content.
 *
 * This is the contract between the data layer and everything downstream. A
 * milestone here is a suggestion, not a commitment: the client assembles their
 * roadmap from it, and the pure modules take a Catalog and a Roadmap and
 * derive everything else, which is what lets them be tested without Astro.
 */
export interface Catalog {
  /** Hash of the menu's contents. Detects a roadmap assembled from an older menu. */
  hash: string;
  program: Program;
  milestones: readonly Milestone[];
  features: readonly Feature[];
  /** Every tag used by the content, for labelling and filtering. */
  tags: readonly Tag[];
}
