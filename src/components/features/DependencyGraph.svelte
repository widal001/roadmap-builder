<!--
  A feature's dependencies as a diagram.

  ELK places the boxes and routes the lines; the SVG here is ours, so the
  diagram is styled with the same tokens as the rest of the page. The engine is
  loaded on demand, so nobody who stays on the list view downloads it.

  This view is an enhancement over the list, not a replacement for it. Every
  box is a real link with its full name, status, price and milestone in its
  accessible name, so the diagram is navigable from the keyboard; the SVG
  itself carries a title and a description.
-->
<script lang="ts">
  import { layoutGraph, type GraphLayout, type LayoutPoint } from '@/lib/graph/layout-graph';
  import type { DependencyNodeFacts } from '@/lib/graph/describe-dependency-node';
  import type { FeatureStatusId } from '@/config/statuses';
  import type { DependencyEdge } from '@/types/domain';

  type Props = {
    /** Every feature in the diagram, the page's own feature included. */
    nodes: readonly DependencyNodeFacts[];
    /** Each edge runs from the blocker to the feature it blocks. */
    edges: readonly DependencyEdge[];
    /** The feature the page is about, drawn with an accent outline. */
    rootId: string;
    /** Read out as the diagram's name. */
    title: string;
    /** Read out as the diagram's summary, for anyone who can't see it. */
    description: string;
  };

  let { nodes, edges, rootId, title, description }: Props = $props();

  const uid = $props.id();

  /* Boxes are a fixed size so ELK's layers line up and the text has room for
     three lines without measuring anything. */
  const NODE_WIDTH = 208;
  const NODE_HEIGHT = 76;
  const TITLE_LIMIT = 26;

  /*
   * SVG shapes are painted with fill and stroke, so the status pill classes
   * can't be reused here. These point at the same tokens the pills use, and
   * the type means a new status in config fails to compile until it has one.
   */
  const STATUS_PAINT = {
    backlog: ['--color-status-backlog-bg', '--color-status-backlog-ink'],
    prioritized: ['--color-status-prioritized-bg', '--color-status-prioritized-ink'],
    in_progress: ['--color-status-in-progress-bg', '--color-status-in-progress-ink'],
    in_review: ['--color-status-in-review-bg', '--color-status-in-review-ink'],
    done: ['--color-status-done-bg', '--color-status-done-ink'],
    cancelled: ['--color-status-cancelled-bg', '--color-status-cancelled-ink'],
  } as const satisfies Record<FeatureStatusId, readonly [string, string]>;

  let layout = $state<GraphLayout | null>(null);
  let failed = $state(false);

  $effect(() => {
    const boxes = nodes.map((node) => ({
      id: node.id,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    }));
    const links = edges.map((edge) => ({ from: String(edge.from), to: String(edge.to) }));

    // The props can change while a layout is in flight, so a stale result is
    // dropped rather than drawn over the newer one.
    let current = true;

    layoutGraph(boxes, links, { direction: 'right' })
      .then((result) => {
        if (!current) return;
        layout = result;
        failed = false;
      })
      .catch(() => {
        if (current) failed = true;
      });

    return () => {
      current = false;
    };
  });

  /** The placed boxes paired back up with what each one says. */
  const placed = $derived.by(() => {
    if (!layout) return [];

    const factsById = new Map(nodes.map((node) => [node.id, node]));

    return layout.nodes.flatMap((box) => {
      const facts = factsById.get(box.id);
      return facts ? [{ box, facts }] : [];
    });
  });

  function paintFor(status: FeatureStatusId): string {
    const [tint, ink] = STATUS_PAINT[status];
    return `--node-tint: var(${tint}); --node-ink: var(${ink});`;
  }

  function describeNode(facts: DependencyNodeFacts): string {
    const milestone = facts.milestoneTitle ?? facts.milestoneNote;
    return `${facts.title}. ${facts.statusLabel}. ${facts.price}. ${milestone}.`;
  }

  function clamp(text: string, limit: number): string {
    return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
  }

  function pathFor(points: readonly LayoutPoint[]): string {
    return points
      .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`)
      .join(' ');
  }
</script>

{#if failed}
  <p class="graph__message">The diagram couldn't be drawn. Switch back to the list.</p>
{:else if !layout}
  <p class="graph__message">Drawing the diagram…</p>
{:else}
  <div class="graph__scroll">
    <svg
      class="graph"
      role="img"
      aria-labelledby="{uid}-title {uid}-desc"
      viewBox="0 0 {layout.width} {layout.height}"
      width={layout.width}
      height={layout.height}
    >
      <title id="{uid}-title">{title}</title>
      <desc id="{uid}-desc">{description}</desc>

      <defs>
        <marker
          id="{uid}-arrow"
          viewBox="0 0 8 8"
          refX="7"
          refY="4"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path class="graph__arrow" d="M0,0 L8,4 L0,8 z" />
        </marker>
      </defs>

      {#each layout.edges as edge (`${edge.from}->${edge.to}`)}
        <path class="graph__edge" d={pathFor(edge.points)} marker-end="url(#{uid}-arrow)" />
      {/each}

      {#each placed as { box, facts } (facts.id)}
        <a
          class="graph__node"
          class:graph__node--root={facts.id === rootId}
          href={facts.href}
          aria-label={describeNode(facts)}
        >
          {#if facts.summary}<title>{facts.summary}</title>{/if}
          <rect
            class="graph__box"
            style={paintFor(facts.statusId)}
            x={box.x}
            y={box.y}
            width={box.width}
            height={box.height}
            rx="6"
          />
          <text class="graph__name" x={box.x + 12} y={box.y + 24} aria-hidden="true">
            {clamp(facts.title, TITLE_LIMIT)}
          </text>
          <text class="graph__meta" x={box.x + 12} y={box.y + 44} aria-hidden="true">
            {facts.statusLabel} · {facts.price}
          </text>
          <text class="graph__meta" x={box.x + 12} y={box.y + 62} aria-hidden="true">
            {clamp(facts.milestoneTitle ?? facts.milestoneNote, TITLE_LIMIT)}
          </text>
        </a>
      {/each}
    </svg>
  </div>
{/if}

<style>
  .graph__message {
    margin: 0;
    padding-block: var(--space-m);
    color: var(--color-text-quiet);
  }

  /* The diagram keeps its laid-out size and scrolls sideways on a narrow
     screen, rather than shrinking the labels below a readable size. */
  .graph__scroll {
    overflow-x: auto;
    padding-block: var(--space-xs);
  }

  .graph {
    display: block;
    max-width: none;
  }

  .graph__box {
    fill: var(--node-tint, var(--color-surface-quiet));
    stroke: var(--node-ink, var(--color-line));
    stroke-width: 1;
  }

  .graph__node--root .graph__box {
    stroke: var(--color-accent);
    stroke-width: 3;
  }

  .graph__name {
    font-size: var(--font-size-s);
    font-weight: var(--font-weight-semibold);
    fill: var(--color-text);
  }

  .graph__meta {
    font-size: var(--font-size-xs);
    fill: var(--color-text-quiet);
  }

  .graph__edge {
    fill: none;
    stroke: var(--color-line-strong);
    stroke-width: 1.5;
  }

  .graph__arrow {
    fill: var(--color-line-strong);
  }

  .graph__node:focus-visible .graph__box {
    outline: 3px solid var(--color-focus);
    outline-offset: 2px;
  }
</style>
