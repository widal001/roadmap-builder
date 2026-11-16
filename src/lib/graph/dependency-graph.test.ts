import { describe, expect, it } from 'vitest';

import { buildDependencyGraph } from '@/lib/graph/dependency-graph';
import { fid, makeFeature } from '@/lib/test-support/plan-fixtures';

/** a <- b <- c, plus d which blocks c, and an unrelated feature. */
const features = [
  makeFeature('a', { position: 1 }),
  makeFeature('b', { blockedBy: [fid('a')], blocking: [fid('c')], position: 2 }),
  makeFeature('c', { blockedBy: [fid('b'), fid('d')], position: 3 }),
  makeFeature('d', { blocking: [fid('c')], position: 4 }),
  makeFeature('lonely', { position: 5 }),
];

const graph = buildDependencyGraph(features);

describe('blockedBy and blocking', () => {
  it('lists what a feature waits on', () => {
    expect(graph.blockedBy(fid('c')).map((f) => f.id)).toEqual(['b', 'd']);
  });

  it('lists what waits on a feature', () => {
    expect(graph.blocking(fid('a')).map((f) => f.id)).toEqual(['b']);
  });

  it('returns nothing for a feature with no dependencies', () => {
    expect(graph.blockedBy(fid('lonely'))).toEqual([]);
    expect(graph.blocking(fid('lonely'))).toEqual([]);
  });

  it('ignores a reference to a feature that is not in the set', () => {
    const partial = buildDependencyGraph([makeFeature('x', { blockedBy: [fid('missing')] })]);

    expect(partial.blockedBy(fid('x'))).toEqual([]);
  });
});

describe('topoOrder', () => {
  it('places every feature after the features it is blocked by', () => {
    const order: string[] = graph.topoOrder().map((f) => f.id);

    expect(order.indexOf('a')).toBeLessThan(order.indexOf('b'));
    expect(order.indexOf('b')).toBeLessThan(order.indexOf('c'));
    expect(order.indexOf('d')).toBeLessThan(order.indexOf('c'));
  });

  it('includes every feature when there are no cycles', () => {
    expect(graph.topoOrder()).toHaveLength(features.length);
  });

  it('omits features caught in a cycle rather than looping forever', () => {
    const cyclic = buildDependencyGraph([
      makeFeature('p', { blockedBy: [fid('q')] }),
      makeFeature('q', { blockedBy: [fid('p')] }),
      makeFeature('free'),
    ]);

    expect(cyclic.topoOrder().map((f) => f.id)).toEqual(['free']);
  });
});

describe('neighborhood', () => {
  it('returns null for a feature that does not exist', () => {
    expect(graph.neighborhood(fid('ghost'))).toBeNull();
  });

  it('reaches two hops upstream by default', () => {
    const near = graph.neighborhood(fid('c'))!;

    expect(near.upstream.map((f) => f.id)).toEqual(['b', 'd', 'a']);
  });

  it('respects a shallower depth', () => {
    const near = graph.neighborhood(fid('c'), 1)!;

    expect(near.upstream.map((f) => f.id)).toEqual(['b', 'd']);
  });

  it('orders results nearest first', () => {
    const near = graph.neighborhood(fid('a'))!;

    expect(near.downstream.map((f) => f.id)).toEqual(['b', 'c']);
  });

  it('includes the root among the nodes', () => {
    const near = graph.neighborhood(fid('c'))!;

    expect(near.nodes.map((f) => f.id)).toContain('c');
    expect(near.rootId).toBe('c');
  });

  it('only includes edges between features in the neighborhood', () => {
    const near = graph.neighborhood(fid('c'), 1)!;
    const ids = new Set(near.nodes.map((f) => f.id));

    for (const edge of near.edges) {
      expect(ids.has(edge.from)).toBe(true);
      expect(ids.has(edge.to)).toBe(true);
    }
  });

  it('returns just the root for an isolated feature', () => {
    const near = graph.neighborhood(fid('lonely'))!;

    expect(near.nodes).toHaveLength(1);
    expect(near.edges).toEqual([]);
  });
});
