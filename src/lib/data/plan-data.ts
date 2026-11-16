/**
 * The only module that reads content collections.
 *
 * Pages and components import from here rather than calling getCollection
 * themselves. When plan data moves to D1, the bodies of these functions change
 * and nothing else does.
 *
 * Each function stays short: fetch entries, hand them to the pure functions in
 * build-catalog.ts. That keeps the logic testable without the content layer.
 */

import { getCollection, getEntry } from 'astro:content';
import { buildCatalog, type RawContent } from '@/lib/data/build-catalog';
import { buildDependencyGraph, type DependencyNeighborhood } from '@/lib/graph/dependency-graph';
import type { Catalog, Feature, Milestone } from '@/types/domain';
import type { FeatureId, MilestoneId } from '@/types/brand';

export interface FeatureDetail {
  feature: Feature;
  /** The feature's markdown body, rendered to HTML at build time. */
  bodyHtml: string;
  milestone: Milestone | null;
  /** Features within two hops in the dependency graph, plus the edges between them. */
  dependencies: DependencyNeighborhood | null;
}

export interface MilestoneDetail {
  milestone: Milestone;
  bodyHtml: string;
  /** The features assigned to this milestone in the proposed plan. */
  features: readonly Feature[];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Loads the program, milestones and features as proposed, sorted by position. */
export async function getCatalog(): Promise<Catalog> {
  return buildCatalog(await loadRawContent());
}

/** Loads one feature and its related data, or null when the ID doesn't exist. */
export async function getFeatureDetail(id: FeatureId | string): Promise<FeatureDetail | null> {
  const catalog = await getCatalog();
  const feature = catalog.features.find((f) => f.id === id);
  if (!feature) return null;

  const entry = await getEntry('features', String(id));
  const graph = buildDependencyGraph(catalog.features);

  return {
    feature,
    bodyHtml: renderedHtml(entry),
    milestone: catalog.milestones.find((m) => m.id === feature.milestoneId) ?? null,
    dependencies: graph.neighborhood(feature.id, 2),
  };
}

/** Loads one milestone and its features, or null when the ID doesn't exist. */
export async function getMilestoneDetail(
  id: MilestoneId | string,
): Promise<MilestoneDetail | null> {
  const catalog = await getCatalog();
  const milestone = catalog.milestones.find((m) => m.id === id);
  if (!milestone) return null;

  const entry = await getEntry('milestones', String(id));

  return {
    milestone,
    bodyHtml: renderedHtml(entry),
    features: catalog.features.filter((f) => f.milestoneId === milestone.id),
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function loadRawContent(): Promise<RawContent> {
  const [programEntries, milestones, features, tags] = await Promise.all([
    getCollection('program'),
    getCollection('milestones'),
    getCollection('features'),
    getCollection('tags'),
  ]);

  return {
    program: programEntries[0],
    milestones,
    features,
    tags,
  };
}

/**
 * The HTML Astro rendered for an entry's markdown body.
 *
 * The content layer renders bodies at build time and stores the result on the
 * entry, so the detail pages don't need a markdown parser of their own.
 */
function renderedHtml(entry: { rendered?: { html?: string } } | undefined): string {
  return entry?.rendered?.html ?? '';
}
