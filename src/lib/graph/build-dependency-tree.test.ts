import { describe, expect, it } from 'vitest';

import {
  buildDependencyTree,
  dependencyDirectionLabel,
  flattenDependencyTrees,
  type DependencyTreeNode,
} from '@/lib/graph/build-dependency-tree';
import { fid, makeFeature } from '@/lib/test-support/plan-fixtures';

/**
 * `shared` is reachable from `root` directly and through two longer branches,
 * so it lands at three different depths and two branches converge on it.
 *
 *   root <- near <- shared <- base
 *   root <- far  <- deep   <- shared
 *   root <- shared
 */
const features = [
  makeFeature('root', { blockedBy: [fid('near'), fid('far'), fid('shared')] }),
  makeFeature('near', { blockedBy: [fid('shared')] }),
  makeFeature('far', { blockedBy: [fid('deep')] }),
  makeFeature('deep', { blockedBy: [fid('shared')] }),
  makeFeature('shared', { blockedBy: [fid('base')] }),
  makeFeature('base'),
  makeFeature('lonely'),
];

/** The child titles of a node, so a test can state a shape in one line. */
function childIds(node: DependencyTreeNode): string[] {
  return node.children.map((child) => child.feature.id);
}

/** The shallowest node for a feature, which is the one the builder expanded. */
function findNode(root: DependencyTreeNode, id: string): DependencyTreeNode | null {
  const queue = [root];

  while (queue.length > 0) {
    const node = queue.shift()!;
    if (node.feature.id === id) return node;
    queue.push(...node.children);
  }

  return null;
}

describe('buildDependencyTree', () => {
  it('returns null for a feature that does not exist', () => {
    expect(buildDependencyTree(features, 'ghost', 'upstream')).toBeNull();
  });

  it('puts the root at depth zero with its direct blockers below it', () => {
    const tree = buildDependencyTree(features, 'root', 'upstream')!;

    expect(tree.root.feature.id).toBe('root');
    expect(tree.root.depth).toBe(0);
    expect(childIds(tree.root)).toEqual(['near', 'far', 'shared']);
  });

  it('reaches past the direct blockers to their blockers', () => {
    const tree = buildDependencyTree(features, 'root', 'upstream')!;

    expect(childIds(findNode(tree.root, 'far')!)).toEqual(['deep']);
    expect(childIds(findNode(tree.root, 'shared')!)).toEqual(['base']);
    expect(findNode(tree.root, 'base')!.depth).toBe(2);
  });

  it('walks downstream when asked for what a feature blocks', () => {
    const tree = buildDependencyTree(features, 'base', 'downstream')!;

    expect(childIds(tree.root)).toEqual(['shared']);
    expect(childIds(findNode(tree.root, 'shared')!)).toEqual(['root', 'near', 'deep']);
  });

  it('returns a root with no children for an isolated feature', () => {
    const tree = buildDependencyTree(features, 'lonely', 'upstream')!;

    expect(tree.root.children).toEqual([]);
    expect(tree.featureCount).toBe(0);
  });

  it('reports the direction and depth it was asked for', () => {
    const tree = buildDependencyTree(features, 'root', 'upstream', 2)!;

    expect(tree.direction).toBe('upstream');
    expect(tree.maxDepth).toBe(2);
  });
});

describe('repeated features', () => {
  it('expands a feature at the shallowest place it appears', () => {
    const tree = buildDependencyTree(features, 'root', 'upstream')!;
    const shallow = tree.root.children.find((child) => child.feature.id === 'shared')!;

    expect(shallow.depth).toBe(1);
    expect(shallow.isRepeat).toBe(false);
    expect(childIds(shallow)).toEqual(['base']);
  });

  it('lists a feature again under every branch that reaches it', () => {
    const tree = buildDependencyTree(features, 'root', 'upstream')!;

    expect(childIds(findNode(tree.root, 'near')!)).toEqual(['shared']);
    expect(childIds(findNode(tree.root, 'deep')!)).toEqual(['shared']);
  });

  it('marks the deeper appearances as repeats and does not expand them', () => {
    const tree = buildDependencyTree(features, 'root', 'upstream')!;
    const repeat = findNode(tree.root, 'near')!.children[0]!;

    expect(repeat.feature.id).toBe('shared');
    expect(repeat.isRepeat).toBe(true);
    expect(repeat.children).toEqual([]);
  });

  it('counts a feature reached by several branches once', () => {
    const tree = buildDependencyTree(features, 'root', 'upstream')!;

    expect(tree.featureCount).toBe(5);
  });

  it('treats a feature that blocks itself as a repeat rather than recursing', () => {
    const selfBlocking = [makeFeature('loop', { blockedBy: [fid('loop')] })];
    const tree = buildDependencyTree(selfBlocking, 'loop', 'upstream')!;

    expect(tree.root.children).toHaveLength(1);
    expect(tree.root.children[0]!.isRepeat).toBe(true);
    expect(tree.featureCount).toBe(0);
  });

  it('terminates on a cycle instead of recursing forever', () => {
    const cyclic = [
      makeFeature('p', { blockedBy: [fid('r')] }),
      makeFeature('q', { blockedBy: [fid('p')] }),
      makeFeature('r', { blockedBy: [fid('q')] }),
    ];

    const tree = buildDependencyTree(cyclic, 'p', 'upstream', 100)!;

    expect(childIds(tree.root)).toEqual(['r']);
    expect(childIds(findNode(tree.root, 'r')!)).toEqual(['q']);
    expect(findNode(tree.root, 'q')!.children[0]!.isRepeat).toBe(true);
    expect(tree.featureCount).toBe(2);
  });
});

describe('depth limits', () => {
  it('stops at the requested depth', () => {
    const tree = buildDependencyTree(features, 'root', 'upstream', 1)!;

    expect(childIds(tree.root)).toEqual(['near', 'far', 'shared']);
    expect(tree.root.children.every((child) => child.children.length === 0)).toBe(true);
  });

  it('marks a cut-off feature so the UI can say the branch continues', () => {
    const tree = buildDependencyTree(features, 'root', 'upstream', 1)!;

    expect(findNode(tree.root, 'far')!.isTruncated).toBe(true);
  });

  it('leaves a feature with nothing beyond it unmarked', () => {
    const tree = buildDependencyTree(features, 'shared', 'upstream', 1)!;

    expect(findNode(tree.root, 'base')!.isTruncated).toBe(false);
  });
});

describe('flattenDependencyTrees', () => {
  const upstream = buildDependencyTree(features, 'root', 'upstream');
  const downstream = buildDependencyTree(features, 'root', 'downstream');

  it('lists each feature once across both directions', () => {
    const slice = flattenDependencyTrees([upstream, downstream]);
    const ids = slice.nodes.map((feature) => feature.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('root');
  });

  it('points every edge from the blocker to the feature it blocks', () => {
    const slice = flattenDependencyTrees([upstream]);

    expect(slice.edges).toContainEqual({ from: 'near', to: 'root' });
    expect(slice.edges).toContainEqual({ from: 'base', to: 'shared' });
  });

  it('points downstream edges the same way', () => {
    const slice = flattenDependencyTrees([buildDependencyTree(features, 'base', 'downstream')]);

    expect(slice.edges).toContainEqual({ from: 'base', to: 'shared' });
    expect(slice.edges).toContainEqual({ from: 'shared', to: 'near' });
  });

  it('keeps one edge when two trees both reach it', () => {
    const slice = flattenDependencyTrees([upstream, downstream]);
    const keys = slice.edges.map((edge) => `${edge.from}->${edge.to}`);

    expect(new Set(keys).size).toBe(keys.length);
  });

  it('includes the edge to a repeat, because the branches really do converge', () => {
    const slice = flattenDependencyTrees([upstream]);

    expect(slice.edges).toContainEqual({ from: 'shared', to: 'near' });
    expect(slice.edges).toContainEqual({ from: 'shared', to: 'deep' });
  });

  it('ignores trees that could not be built', () => {
    expect(flattenDependencyTrees([null])).toEqual({ nodes: [], edges: [] });
  });
});

describe('dependencyDirectionLabel', () => {
  it("takes each direction's heading from the label config", () => {
    expect(dependencyDirectionLabel('upstream')).toBe('Blocked by');
    expect(dependencyDirectionLabel('downstream')).toBe('Blocks');
  });
});
