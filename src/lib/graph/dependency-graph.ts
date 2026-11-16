/**
 * Queries over the feature dependency graph.
 *
 * Content records dependencies in one direction (`blockedBy`). This module
 * builds the reverse index once and answers questions against both directions,
 * so nothing downstream has to scan every feature to find what a feature blocks.
 */

import type { DependencyEdge, Feature } from '@/types/domain';
import type { FeatureId } from '@/types/brand';

/** A slice of the graph around one feature, ready to render as a list or diagram. */
export interface DependencyNeighborhood {
  /** The feature the neighborhood is centred on. */
  rootId: FeatureId;
  /** Features reachable within the requested number of hops, including the root. */
  nodes: readonly Feature[];
  /** Edges between those features. */
  edges: readonly DependencyEdge[];
  /** Features that must finish before the root, nearest first. */
  upstream: readonly Feature[];
  /** Features waiting on the root, nearest first. */
  downstream: readonly Feature[];
}

export interface DependencyGraph {
  /** Features that must finish before `id`. */
  blockedBy(id: FeatureId): readonly Feature[];
  /** Features waiting on `id`. */
  blocking(id: FeatureId): readonly Feature[];
  /**
   * Every feature in dependency order: a feature always appears after the
   * features it is blocked by. Features in a cycle are omitted, so callers that
   * need cycles reported should use validateContent first.
   */
  topoOrder(): readonly Feature[];
  /** The slice of the graph within `depth` hops of `id`, in both directions. */
  neighborhood(id: FeatureId, depth?: number): DependencyNeighborhood | null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Builds the graph. Indexes are computed once, so queries afterwards are cheap. */
export function buildDependencyGraph(features: readonly Feature[]): DependencyGraph {
  const byId = new Map<FeatureId, Feature>(features.map((f) => [f.id, f]));

  const upstreamIds = new Map<FeatureId, FeatureId[]>();
  const downstreamIds = new Map<FeatureId, FeatureId[]>();

  for (const feature of features) {
    for (const upstream of feature.blockedBy) {
      if (!byId.has(upstream)) continue;
      push(upstreamIds, feature.id, upstream);
      push(downstreamIds, upstream, feature.id);
    }
  }

  const resolve = (ids: readonly FeatureId[] | undefined): readonly Feature[] =>
    (ids ?? []).map((id) => byId.get(id)).filter((f): f is Feature => f !== undefined);

  return {
    blockedBy: (id) => resolve(upstreamIds.get(id)),
    blocking: (id) => resolve(downstreamIds.get(id)),
    topoOrder: () => topoSort(features, upstreamIds),
    neighborhood: (id, depth = 2) => {
      const root = byId.get(id);
      if (!root) return null;

      const upstream = walk(id, depth, upstreamIds);
      const downstream = walk(id, depth, downstreamIds);
      const reached = new Set<FeatureId>([id, ...upstream, ...downstream]);

      return {
        rootId: id,
        nodes: [...reached].map((n) => byId.get(n)).filter((f): f is Feature => f !== undefined),
        edges: edgesWithin(reached, upstreamIds),
        upstream: resolve(upstream),
        downstream: resolve(downstream),
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function push(index: Map<FeatureId, FeatureId[]>, key: FeatureId, value: FeatureId): void {
  const existing = index.get(key);
  if (existing) existing.push(value);
  else index.set(key, [value]);
}

/**
 * Breadth-first walk out to `depth` hops, excluding the starting node.
 * Breadth-first so the result is ordered nearest-first.
 */
function walk(
  start: FeatureId,
  depth: number,
  index: Map<FeatureId, FeatureId[]>,
): readonly FeatureId[] {
  const seen = new Set<FeatureId>([start]);
  const found: FeatureId[] = [];

  let frontier: FeatureId[] = [start];

  for (let hop = 0; hop < depth; hop++) {
    const next: FeatureId[] = [];

    for (const node of frontier) {
      for (const neighbor of index.get(node) ?? []) {
        if (seen.has(neighbor)) continue;
        seen.add(neighbor);
        found.push(neighbor);
        next.push(neighbor);
      }
    }

    if (next.length === 0) break;
    frontier = next;
  }

  return found;
}

function edgesWithin(
  nodes: ReadonlySet<FeatureId>,
  upstreamIds: Map<FeatureId, FeatureId[]>,
): readonly DependencyEdge[] {
  const edges: DependencyEdge[] = [];

  for (const node of nodes) {
    for (const upstream of upstreamIds.get(node) ?? []) {
      if (nodes.has(upstream)) edges.push({ from: upstream, to: node });
    }
  }

  return edges;
}

/**
 * Kahn's algorithm. Ties are broken by the features' existing order, so the
 * result is stable across runs and reflects the order authored in content.
 */
function topoSort(
  features: readonly Feature[],
  upstreamIds: Map<FeatureId, FeatureId[]>,
): readonly Feature[] {
  const remaining = new Map<FeatureId, number>(
    features.map((f) => [f.id, (upstreamIds.get(f.id) ?? []).length]),
  );

  const downstream = new Map<FeatureId, FeatureId[]>();
  for (const [id, upstreams] of upstreamIds) {
    for (const upstream of upstreams) push(downstream, upstream, id);
  }

  const ready = features.filter((f) => remaining.get(f.id) === 0);
  const ordered: Feature[] = [];

  while (ready.length > 0) {
    const feature = ready.shift()!;
    ordered.push(feature);

    for (const dependent of downstream.get(feature.id) ?? []) {
      const count = (remaining.get(dependent) ?? 0) - 1;
      remaining.set(dependent, count);
      if (count === 0) {
        const next = features.find((f) => f.id === dependent);
        if (next) ready.push(next);
      }
    }
  }

  return ordered;
}
