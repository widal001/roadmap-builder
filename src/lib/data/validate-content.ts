/**
 * Checking content for problems the schemas can't catch.
 *
 * A Zod schema validates one entry at a time, so it can't tell whether a
 * `blockedBy` entry points at a feature that exists, or whether the dependency
 * edges form a cycle. Astro's `reference()` doesn't reliably fail the build on
 * a missing entry either, so those checks live here.
 *
 * This runs during the build via build-catalog.ts, which means bad content
 * fails the build with a message naming the offending entry.
 */

import type { DependencyEdge, Feature, Milestone, Tag } from '@/types/domain';
import type { FeatureId, MilestoneId } from '@/types/brand';

export class ContentValidationError extends Error {
  readonly problems: readonly string[];

  constructor(problems: readonly string[]) {
    super(`Content validation failed:\n  - ${problems.join('\n  - ')}`);
    this.name = 'ContentValidationError';
    this.problems = problems;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Checks features and milestones for broken references and dependency cycles.
 *
 * Collects every problem before throwing, so one build reports all of them
 * rather than making you fix them one at a time.
 *
 * @throws ContentValidationError when anything is wrong.
 */
export function validateContent(
  features: readonly Feature[],
  milestones: readonly Milestone[],
  tags: readonly Tag[] = [],
): void {
  const problems = [
    ...findDuplicateIds(features),
    ...findMissingMilestoneRefs(features, milestones),
    ...findMissingFeatureRefs(features),
    ...findDependencyCycles(toEdges(features)),
    ...findMissingTagRefs(features, milestones, tags),
  ];

  if (problems.length > 0) throw new ContentValidationError(problems);
}

/** Every dependency edge implied by the features' `blockedBy` lists. */
export function toEdges(features: readonly Feature[]): readonly DependencyEdge[] {
  return features.flatMap((feature) =>
    feature.blockedBy.map((upstream) => ({ from: upstream, to: feature.id })),
  );
}

// ---------------------------------------------------------------------------
// Individual checks
// ---------------------------------------------------------------------------

function findDuplicateIds(features: readonly Feature[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const feature of features) {
    if (seen.has(feature.id)) duplicates.add(feature.id);
    seen.add(feature.id);
  }

  return [...duplicates].map((id) => `features/${id}: duplicate feature ID`);
}

function findMissingMilestoneRefs(
  features: readonly Feature[],
  milestones: readonly Milestone[],
): string[] {
  const known = new Set<MilestoneId>(milestones.map((m) => m.id));

  return features
    .filter((f) => f.milestoneId !== null && !known.has(f.milestoneId))
    .map((f) => `features/${f.id}: milestone "${f.milestoneId}" does not exist`);
}

function findMissingFeatureRefs(features: readonly Feature[]): string[] {
  const known = new Set<FeatureId>(features.map((f) => f.id));

  return features.flatMap((feature) =>
    feature.blockedBy
      .filter((upstream) => !known.has(upstream))
      .map((upstream) => `features/${feature.id}: blockedBy "${upstream}" does not exist`),
  );
}

/** Tags are authored freely, so a typo should fail the build rather than vanish. */
function findMissingTagRefs(
  features: readonly Feature[],
  milestones: readonly Milestone[],
  tags: readonly Tag[],
): string[] {
  if (tags.length === 0) return [];
  const known = new Set<string>(tags.map((t) => t.id));

  const check = (kind: string, id: string, used: readonly string[]) =>
    used
      .filter((tag) => !known.has(tag))
      .map((tag) => `${kind}/${id}: tag "${tag}" does not exist`);

  return [
    ...features.flatMap((f) => check('features', f.id, f.tags)),
    ...milestones.flatMap((m) => check('milestones', m.id, m.tags)),
  ];
}

/**
 * Finds cycles with an iterative depth-first search.
 *
 * Iterative rather than recursive so a deep chain can't overflow the stack, and
 * so the path that forms the cycle is available to put in the message.
 */
function findDependencyCycles(edges: readonly DependencyEdge[]): string[] {
  const downstream = groupByFrom(edges);
  const state = new Map<FeatureId, 'visiting' | 'done'>();
  const problems: string[] = [];

  for (const start of downstream.keys()) {
    if (state.get(start)) continue;

    const path: FeatureId[] = [];
    const stack: { node: FeatureId; childIndex: number }[] = [{ node: start, childIndex: 0 }];
    state.set(start, 'visiting');
    path.push(start);

    while (stack.length > 0) {
      const frame = stack[stack.length - 1]!;
      const children = downstream.get(frame.node) ?? [];

      if (frame.childIndex >= children.length) {
        state.set(frame.node, 'done');
        stack.pop();
        path.pop();
        continue;
      }

      const child = children[frame.childIndex++]!;

      if (state.get(child) === 'visiting') {
        const cycleStart = path.indexOf(child);
        const cycle = [...path.slice(cycleStart), child].join(' -> ');
        problems.push(`dependency cycle: ${cycle}`);
        continue;
      }

      if (state.get(child) === 'done') continue;

      state.set(child, 'visiting');
      path.push(child);
      stack.push({ node: child, childIndex: 0 });
    }
  }

  return problems;
}

function groupByFrom(edges: readonly DependencyEdge[]): Map<FeatureId, FeatureId[]> {
  const grouped = new Map<FeatureId, FeatureId[]>();

  for (const edge of edges) {
    const existing = grouped.get(edge.from);
    if (existing) existing.push(edge.to);
    else grouped.set(edge.from, [edge.to]);
  }

  return grouped;
}
