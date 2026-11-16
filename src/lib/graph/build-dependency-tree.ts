/**
 * Building one feature's dependencies into a tree.
 *
 * dependency-graph.ts answers what sits next to a feature. The detail page
 * needs the whole branch: what blocks the things that block this feature, and
 * so on outwards. This module walks one direction of the graph and returns a
 * tree, which the page renders as nested disclosures and the graph view hands
 * to the layout engine.
 *
 * Pure, and free of Svelte and Astro, so it can be tested on its own.
 */

import { buildDependencyGraph } from '@/lib/graph/dependency-graph';
import { fieldLabel } from '@/lib/labels/resolve-label';
import type { FeatureId } from '@/types/brand';
import type { DependencyEdge, Feature } from '@/types/domain';

/** Which way to walk: toward what blocks a feature, or toward what it blocks. */
export type DependencyDirection = 'upstream' | 'downstream';

export interface DependencyTreeNode {
  feature: Feature;
  /** Hops from the root. The root itself is 0. */
  depth: number;
  /** Empty for a repeat, for a truncated node, and for a feature with nothing beyond it. */
  children: readonly DependencyTreeNode[];
  /**
   * True when this feature is expanded elsewhere in the same tree, at the same
   * depth or shallower. A repeat is still listed where it belongs, so the
   * reader sees that two branches converge, but its own branch is drawn once.
   */
  isRepeat: boolean;
  /** True when the feature has further dependencies that `maxDepth` cut off. */
  isTruncated: boolean;
}

export interface DependencyTree {
  direction: DependencyDirection;
  /** The feature the tree is centred on, with everything else hanging off it. */
  root: DependencyTreeNode;
  /** How many hops out the tree was built. */
  maxDepth: number;
  /** Distinct features below the root. Repeats are counted once. */
  featureCount: number;
}

/** The features and edges of one or more trees, flattened for a layout engine. */
export interface DependencyGraphSlice {
  nodes: readonly Feature[];
  edges: readonly DependencyEdge[];
}

/**
 * How far out a tree reaches by default.
 *
 * Deep enough that the chains in the content reach their ends, shallow enough
 * that an accidental cycle or a hub feature can't unfold into a huge document.
 */
export const DEFAULT_DEPENDENCY_TREE_DEPTH = 4;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Builds the tree of everything that blocks `rootId`, or everything it blocks.
 *
 * Returns null when the ID isn't in `features`, matching `neighborhood`.
 *
 * The walk is breadth-first and expands each feature at most once across the
 * whole tree, so the branch under a shared blocker is drawn at the shallowest
 * place it appears and the walk terminates even if the content ever grows a
 * cycle.
 */
export function buildDependencyTree(
  features: readonly Feature[],
  rootId: FeatureId | string,
  direction: DependencyDirection,
  maxDepth: number = DEFAULT_DEPENDENCY_TREE_DEPTH,
): DependencyTree | null {
  const rootFeature = features.find((feature) => feature.id === rootId);
  if (!rootFeature) return null;

  const graph = buildDependencyGraph(features);
  const step = direction === 'upstream' ? graph.blockedBy : graph.blocking;

  const root = newNode(rootFeature, 0);
  const expanded = new Set<string>([rootFeature.id]);

  let frontier: MutableNode[] = [root];
  let featureCount = 0;

  for (let depth = 1; depth <= maxDepth && frontier.length > 0; depth++) {
    const next: MutableNode[] = [];

    for (const parent of frontier) {
      for (const neighbor of step(parent.feature.id)) {
        const isRepeat = expanded.has(neighbor.id);
        const node = newNode(neighbor, depth, isRepeat);
        parent.children.push(node);

        if (isRepeat) continue;

        expanded.add(neighbor.id);
        featureCount++;
        next.push(node);
      }
    }

    frontier = next;
  }

  // Whatever is left on the frontier sits at maxDepth. Marking the ones that
  // still have dependencies lets the UI say the branch continues instead of
  // implying the chain ends here.
  for (const node of frontier) {
    node.isTruncated = step(node.feature.id).length > 0;
  }

  return { direction, root, maxDepth, featureCount };
}

/**
 * The distinct features and edges across several trees.
 *
 * The graph view draws exactly what the tree lists, so it reads the same trees
 * rather than querying the graph again and risking a different answer. Edges
 * always point from blocker to blocked, whichever direction the tree walked.
 */
export function flattenDependencyTrees(
  trees: readonly (DependencyTree | null)[],
): DependencyGraphSlice {
  const nodes = new Map<string, Feature>();
  const edges = new Map<string, DependencyEdge>();

  for (const tree of trees) {
    if (!tree) continue;
    collect(tree.root, tree.direction, nodes, edges);
  }

  return { nodes: [...nodes.values()], edges: [...edges.values()] };
}

/**
 * The heading for one direction, taken from the label config.
 *
 * The two directions are the `blockedBy` and `blocking` fields of a feature,
 * so renaming them for a different deployment is a change to labels.ts.
 */
export function dependencyDirectionLabel(direction: DependencyDirection): string {
  return fieldLabel('feature', direction === 'upstream' ? 'blockedBy' : 'blocking');
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** The tree is assembled with mutable children and handed out as readonly. */
interface MutableNode extends DependencyTreeNode {
  children: DependencyTreeNode[];
  isTruncated: boolean;
}

function newNode(feature: Feature, depth: number, isRepeat = false): MutableNode {
  return { feature, depth, children: [], isRepeat, isTruncated: false };
}

function collect(
  node: DependencyTreeNode,
  direction: DependencyDirection,
  nodes: Map<string, Feature>,
  edges: Map<string, DependencyEdge>,
): void {
  nodes.set(node.feature.id, node.feature);

  for (const child of node.children) {
    const edge: DependencyEdge =
      direction === 'upstream'
        ? { from: child.feature.id, to: node.feature.id }
        : { from: node.feature.id, to: child.feature.id };

    edges.set(`${edge.from}->${edge.to}`, edge);
    collect(child, direction, nodes, edges);
  }
}
