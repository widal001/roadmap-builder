import { describe, expect, it } from 'vitest';

import { layoutGraph } from '@/lib/graph/layout-graph';

/** a -> b -> c, so the layout has three layers to separate. */
const nodes = [
  { id: 'a', width: 160, height: 60 },
  { id: 'b', width: 160, height: 60 },
  { id: 'c', width: 160, height: 60 },
];

const edges = [
  { from: 'a', to: 'b' },
  { from: 'b', to: 'c' },
];

describe('layoutGraph', () => {
  it('returns an empty canvas for an empty graph', async () => {
    expect(await layoutGraph([], [])).toEqual({ width: 0, height: 0, nodes: [], edges: [] });
  });

  it('gives every node a position and keeps the order it was given', async () => {
    const layout = await layoutGraph(nodes, edges);

    expect(layout.nodes.map((node) => node.id)).toEqual(['a', 'b', 'c']);
    expect(layout.nodes.every((node) => Number.isFinite(node.x) && Number.isFinite(node.y))).toBe(
      true,
    );
  });

  it('separates the layers along the flow direction', async () => {
    const layout = await layoutGraph(nodes, edges, { direction: 'right' });
    const [a, b, c] = layout.nodes;

    expect(a!.x).toBeLessThan(b!.x);
    expect(b!.x).toBeLessThan(c!.x);
  });

  it('sizes the canvas to hold every node', async () => {
    const layout = await layoutGraph(nodes, edges);

    for (const node of layout.nodes) {
      expect(node.x + node.width).toBeLessThanOrEqual(layout.width);
      expect(node.y + node.height).toBeLessThanOrEqual(layout.height);
    }
  });

  it('routes each edge as a line with at least a start and an end', async () => {
    const layout = await layoutGraph(nodes, edges);

    expect(layout.edges).toHaveLength(2);
    expect(layout.edges.every((edge) => edge.points.length >= 2)).toBe(true);
  });

  it('drops an edge pointing at a node that was not passed in', async () => {
    const layout = await layoutGraph(nodes, [...edges, { from: 'a', to: 'ghost' }]);

    expect(layout.edges.map((edge) => edge.to)).toEqual(['b', 'c']);
  });
});
