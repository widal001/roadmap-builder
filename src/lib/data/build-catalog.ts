/**
 * Turning content entries into the domain model.
 *
 * This module takes plain objects rather than Astro content entries, so it can
 * be tested with fixtures and without loading the content layer. plan-data.ts
 * is responsible for fetching entries and handing them here.
 *
 * Four things happen on the way through: `blocking` is derived by inverting
 * every `blockedBy` list, each feature's summary is derived from its body, the
 * content is validated, and a hash is computed so saved scenarios can tell
 * they were made against a different plan.
 *
 * The hash covers only the fields the plan's arithmetic depends on, so editing
 * the prose of a feature doesn't throw away a client's saved roadmap.
 */

import { summarizeBody } from '@/lib/data/summarize-body';
import { validateContent } from '@/lib/data/validate-content';
import { toFeatureId, toMilestoneId, toTagId } from '@/types/brand';
import type { Catalog, Feature, Milestone, Program, Tag } from '@/types/domain';
import type { FeatureId } from '@/types/brand';
import type { SizeId } from '@/config/sizes';
import type { CategoryId } from '@/config/categories';
import type { FeatureStatusId, MilestoneStatusId } from '@/config/statuses';

// ---------------------------------------------------------------------------
// Input shapes
//
// These mirror the content collection schemas. An entry is its ID plus the
// validated frontmatter.
// ---------------------------------------------------------------------------

export interface ContentEntry<T> {
  id: string;
  data: T;
  /** The raw markdown body. A feature's summary is derived from it. */
  body?: string;
}

export interface ProgramData {
  title: string;
}

export interface MilestoneData {
  title: string;
  description: string;
  deadline: Date | null;
  position: number;
  status: MilestoneStatusId;
  tags: string[];
}

export interface FeatureData {
  title: string;
  category: CategoryId;
  milestone: string | null;
  size: SizeId;
  status: FeatureStatusId;
  position: number;
  tags: string[];
  blockedBy: string[];
}

export interface TagData {
  label: string;
  description: string;
}

export interface RawContent {
  program: ContentEntry<ProgramData> | undefined;
  milestones: readonly ContentEntry<MilestoneData>[];
  features: readonly ContentEntry<FeatureData>[];
  /** Optional so tests can build a catalog without declaring tags. */
  tags?: readonly ContentEntry<TagData>[];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Builds the catalog from content entries.
 *
 * @throws ContentValidationError when a reference is missing or the dependency
 * edges contain a cycle.
 */
export function buildCatalog(raw: RawContent): Catalog {
  const tags = (raw.tags ?? []).map(toTag);
  const milestones = raw.milestones.map(toMilestone).sort(byPosition);
  const features = withBlocking(raw.features.map(toFeature)).sort(byPosition);

  validateContent(features, milestones, tags);

  return {
    hash: hashCatalog(raw),
    program: toProgram(raw.program),
    milestones,
    features,
    tags,
  };
}

/**
 * A short, stable hash of the content.
 *
 * Not cryptographic. It only has to change when the plan changes, so that a
 * scenario saved against an older plan is discarded rather than misapplied.
 */
export function hashCatalog(raw: RawContent): string {
  return fnv1a(canonicalize(raw)).toString(16).padStart(8, '0').slice(0, 8);
}

// ---------------------------------------------------------------------------
// Mapping content entries to domain types
// ---------------------------------------------------------------------------

function toProgram(entry: ContentEntry<ProgramData> | undefined): Program {
  return { title: entry?.data.title ?? 'Untitled program' };
}

function toTag(entry: ContentEntry<TagData>): Tag {
  return {
    id: toTagId(entry.id),
    label: entry.data.label,
    description: entry.data.description,
  };
}

function toMilestone(entry: ContentEntry<MilestoneData>): Milestone {
  return {
    id: toMilestoneId(entry.id),
    title: entry.data.title,
    description: entry.data.description,
    deadline: entry.data.deadline,
    tags: entry.data.tags.map(toTagId),
    status: entry.data.status,
    position: entry.data.position,
  };
}

function toFeature(entry: ContentEntry<FeatureData>): Feature {
  return {
    id: toFeatureId(entry.id),
    title: entry.data.title,
    summary: summarizeBody(entry.body),
    category: entry.data.category,
    milestoneId: entry.data.milestone === null ? null : toMilestoneId(entry.data.milestone),
    blockedBy: entry.data.blockedBy.map(toFeatureId),
    blocking: [],
    tags: entry.data.tags.map(toTagId),
    size: entry.data.size,
    status: entry.data.status,
    position: entry.data.position,
  };
}

/**
 * Fills in each feature's `blocking` list by inverting every `blockedBy` list.
 *
 * Deriving one side from the other is what guarantees the two can never
 * disagree. Content only ever writes `blockedBy`.
 */
function withBlocking(features: readonly Feature[]): Feature[] {
  const blocking = new Map<FeatureId, FeatureId[]>();

  for (const feature of features) {
    for (const upstream of feature.blockedBy) {
      const existing = blocking.get(upstream);
      if (existing) existing.push(feature.id);
      else blocking.set(upstream, [feature.id]);
    }
  }

  return features.map((feature) => ({
    ...feature,
    blocking: blocking.get(feature.id) ?? [],
  }));
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function byPosition(a: { position: number }, b: { position: number }): number {
  return a.position - b.position;
}

/**
 * A deterministic string for the content.
 *
 * Entries are sorted by ID and only the fields that affect the plan are
 * included, so reordering files on disk doesn't change the hash but editing a
 * budget does.
 */
function canonicalize(raw: RawContent): string {
  const program = raw.program ? raw.program.data.title : '';

  const milestones = [...raw.milestones]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((m) =>
      [
        m.id,
        m.data.title,
        m.data.deadline?.toISOString() ?? '',
        m.data.position,
        m.data.status,
      ].join('|'),
    );

  const features = [...raw.features]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((f) =>
      [
        f.id,
        f.data.title,
        f.data.category,
        f.data.milestone ?? '',
        f.data.size,
        f.data.status,
        f.data.position,
        [...f.data.blockedBy].sort().join(','),
      ].join('|'),
    );

  return [program, ...milestones, ...features].join('\n');
}

/** FNV-1a, 32-bit. Small, fast, and good enough to detect a changed plan. */
function fnv1a(input: string): number {
  let hash = 0x811c9dc5;

  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return hash >>> 0;
}
