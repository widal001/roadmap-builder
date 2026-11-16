<!--
  A feature's dependencies as a nested list.

  One level of the tree per call: each row that has dependencies of its own
  holds a <details> containing this component again, so a reader can open a
  blocker to see what blocks it, and so on outwards.

  The markup is the accessible baseline for this section. It is rendered on the
  server and needs no JavaScript: <details> opens on its own, every title is a
  real link, and nothing is reachable by pointer alone.

  <summary> is the first child of its <details> on purpose. Wrapping it in a
  layout element silently stops the disclosure from working.
-->
<script lang="ts">
  import DependencyTree from './DependencyTree.svelte';
  import type { DependencyRow } from '@/lib/graph/describe-dependency-node';

  type Props = {
    rows: readonly DependencyRow[];
    /** The word for this direction, used on each disclosure: "Blocked by 3". */
    directionLabel: string;
  };

  let { rows, directionLabel }: Props = $props();
</script>

<ul class="tree">
  {#each rows as row (row.facts.id)}
    <li class="tree__item">
      <p class="node">
        <a class="node__title" href={row.facts.href}>{row.facts.title}</a>
        <span class={row.facts.statusClass}>{row.facts.statusLabel}</span>
        <span class="node__price">{row.facts.price}</span>
      </p>

      {#if row.facts.summary}
        <p class="node__summary">{row.facts.summary}</p>
      {/if}

      <p class="node__milestone">
        {#if row.facts.milestoneTitle && row.facts.milestoneHref}
          <a href={row.facts.milestoneHref}>{row.facts.milestoneTitle}</a>
          <span class="node__note">{row.facts.milestoneNote}</span>
        {:else}
          <span class="node__note">{row.facts.milestoneNote}</span>
        {/if}
      </p>

      {#if row.children.length > 0}
        <details class="tree__branch">
          <summary>{directionLabel} {row.children.length}</summary>
          <DependencyTree rows={row.children} {directionLabel} />
        </details>
      {:else if row.isRepeat}
        <p class="node__note">Already listed above</p>
      {:else if row.isTruncated}
        <p class="node__note">More beyond this</p>
      {/if}
    </li>
  {/each}
</ul>

<style>
  .tree {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .tree__item {
    padding-block: var(--space-xs);
    border-bottom: 1px solid var(--color-line-soft);
  }

  /* Nested levels sit inside a disclosure, which already indents them, so they
     only need a rule to tie the children back to their parent. */
  .tree .tree {
    margin-block-start: var(--space-2xs);
    padding-inline-start: var(--space-s);
    border-left: 2px solid var(--color-line);
  }

  .tree .tree .tree__item:last-child {
    border-bottom: none;
    padding-block-end: 0;
  }

  .node {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2xs) var(--space-xs);
    margin: 0;
  }

  .node__title {
    font-weight: var(--font-weight-semibold);
    color: inherit;
    text-decoration: none;
  }

  .node__title:hover {
    text-decoration: underline;
  }

  .node__price {
    margin-inline-start: auto;
    font-variant-numeric: tabular-nums;
    color: var(--color-text-quiet);
  }

  /* One line: the summary is orientation, and a row shouldn't grow to fit it. */
  .node__summary {
    margin: 0;
    overflow: hidden;
    font-size: var(--font-size-s);
    color: var(--color-text-quiet);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .node__milestone {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2xs) var(--space-xs);
    margin: 0;
    font-size: var(--font-size-s);
    color: var(--color-text-quiet);
  }

  .node__note {
    margin: 0;
    font-size: var(--font-size-xs);
    color: var(--color-text-faint);
  }

  /* Left as display: list-item so the browser keeps its disclosure triangle:
     without it the control reads as a link rather than something that opens. */
  .tree__branch > summary {
    width: fit-content;
    margin-block-start: var(--space-2xs);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    color: var(--color-accent);
    cursor: pointer;
  }

  .tree__branch > summary:hover {
    color: var(--color-accent-hover);
  }
</style>
