/**
 * Placing dependency nodes and edges on a canvas.
 *
 * This is the only module that knows a layout engine exists. It takes plain
 * boxes and connections, returns coordinates, and leaves the drawing to the
 * component, so swapping ELK for something else is a change to this file and
 * nothing else.
 *
 * ELK runs on the main thread. A feature's neighbourhood is about ten nodes
 * and lays out in a few milliseconds, and ELK's worker build has known module
 * resolution problems under Vite and pnpm (elkjs#272). The engine is loaded
 * with a dynamic import so it ships only to the people who open the graph.
 */

/** A box to place. Width and height are decided by whatever draws it. */
export interface LayoutNode {
  id: string;
  width: number;
  height: number;
}

/** A connection between two boxes, named by node ID. */
export interface LayoutEdge {
  from: string;
  to: string;
}

export interface LayoutPoint {
  x: number;
  y: number;
}

export interface LayoutOptions {
  /** Which way the arrows run. 'right' puts blockers to the left of what they block. */
  direction?: 'right' | 'down';
  /** Gap between nodes sitting side by side. */
  nodeSpacing?: number;
  /** Gap between one layer of the graph and the next. */
  layerSpacing?: number;
  /** Breathing room between the outermost nodes and the edge of the canvas. */
  padding?: number;
}

export interface PositionedNode extends LayoutNode {
  x: number;
  y: number;
}

export interface PositionedEdge extends LayoutEdge {
  /** The corners of the line, from the source box to the target box. */
  points: readonly LayoutPoint[];
}

export interface GraphLayout {
  /** The size of the canvas the placed nodes need. */
  width: number;
  height: number;
  nodes: readonly PositionedNode[];
  edges: readonly PositionedEdge[];
}

const DEFAULT_OPTIONS = {
  direction: 'right',
  nodeSpacing: 20,
  layerSpacing: 56,
  padding: 8,
} as const satisfies Required<LayoutOptions>;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Lays the graph out and returns every node's position and every edge's route.
 *
 * Nodes and edges come back in the order they were given, so a caller can pair
 * a positioned node with whatever it knows about that node. An edge pointing
 * at a node that wasn't passed in is dropped rather than failing the layout.
 */
export async function layoutGraph(
  nodes: readonly LayoutNode[],
  edges: readonly LayoutEdge[],
  options: LayoutOptions = {},
): Promise<GraphLayout> {
  if (nodes.length === 0) return { width: 0, height: 0, nodes: [], edges: [] };

  const settings = { ...DEFAULT_OPTIONS, ...options };
  const known = new Set(nodes.map((node) => node.id));
  const drawable = edges.filter((edge) => known.has(edge.from) && known.has(edge.to));

  const elk = await loadEngine();
  const laidOut = await elk.layout({
    id: 'dependencies',
    layoutOptions: elkOptions(settings),
    children: nodes.map((node) => ({ id: node.id, width: node.width, height: node.height })),
    edges: drawable.map((edge, index) => ({
      id: `edge-${index}`,
      sources: [edge.from],
      targets: [edge.to],
    })),
  });

  const placed = new Map((laidOut.children ?? []).map((child) => [child.id, child] as const));

  return {
    width: laidOut.width ?? 0,
    height: laidOut.height ?? 0,
    nodes: nodes.map((node) => {
      const child = placed.get(node.id);
      return { ...node, x: child?.x ?? 0, y: child?.y ?? 0 };
    }),
    edges: drawable.map((edge, index) => ({
      ...edge,
      points: routeOf(laidOut.edges?.[index]),
    })),
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
//
// Everything below is ELK's vocabulary: its option strings, its promise-based
// API, and the section shape it reports routes in.
// ---------------------------------------------------------------------------

/** ELK's layout result, narrowed to the parts this module reads. */
interface ElkResult {
  width?: number;
  height?: number;
  children?: ElkPlacedNode[];
  edges?: ElkRoutedEdge[];
}

interface ElkPlacedNode {
  id: string;
  x?: number;
  y?: number;
}

interface ElkRoutedEdge {
  sections?: {
    startPoint: LayoutPoint;
    endPoint: LayoutPoint;
    bendPoints?: LayoutPoint[];
  }[];
}

interface ElkEngine {
  layout(graph: unknown): Promise<ElkResult>;
}

/**
 * One engine instance, created the first time a graph is drawn.
 *
 * Constructing ELK is the expensive part, so it's kept rather than rebuilt
 * each time someone switches back to the graph.
 */
let enginePromise: Promise<ElkEngine> | null = null;

function loadEngine(): Promise<ElkEngine> {
  enginePromise ??= import('elkjs/lib/elk.bundled.js').then(
    (module) => new module.default() as ElkEngine,
  );

  return enginePromise;
}

function elkOptions(settings: Required<LayoutOptions>): Record<string, string> {
  return {
    'elk.algorithm': 'layered',
    'elk.direction': settings.direction === 'right' ? 'RIGHT' : 'DOWN',
    'elk.edgeRouting': 'ORTHOGONAL',
    'elk.spacing.nodeNode': String(settings.nodeSpacing),
    'elk.layered.spacing.nodeNodeBetweenLayers': String(settings.layerSpacing),
    'elk.padding': `[top=${settings.padding},left=${settings.padding},bottom=${settings.padding},right=${settings.padding}]`,
    // Keeps a node near the nodes it connects to rather than at the top of its
    // layer, which is what stops long diagonal runs across the diagram.
    'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
  };
}

/** An edge ELK couldn't route is drawn as nothing rather than as a wrong line. */
function routeOf(edge: ElkRoutedEdge | undefined): readonly LayoutPoint[] {
  const section = edge?.sections?.[0];
  if (!section) return [];

  return [section.startPoint, ...(section.bendPoints ?? []), section.endPoint];
}
