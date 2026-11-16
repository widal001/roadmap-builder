<!--
  One feature, as a card.

  The title and the price are the scan line; everything else is quieter. The
  size tier isn't repeated next to the price, because they are the same fact
  said twice — the tier is on the feature's own page.

  The card is read-only about status: it shows where the work stands, and
  changing that happens on the feature page. Cards appear in grids of two and
  three, so the card fills the height of its row and clamps its summary, and
  one long first paragraph can't set the height of everything beside it.
-->
<script lang="ts">
  import { findCategory } from '@/config/categories';
  import { findFeatureStatus } from '@/config/statuses';
  import { formatSize } from '@/lib/budget/format-size';
  import { milestoneHref } from '@/lib/roadmap/milestone-links';
  import type { Feature, Milestone } from '@/types/domain';

  type Props = {
    feature: Feature;
    /** The milestone holding this feature, or the one it's suggested for. */
    milestone?: Milestone | null;
    /** Whether that milestone is in the roadmap. */
    inRoadmap?: boolean;
    /** Whether the feature is part of the selection being built. */
    selected?: boolean;
    /** Shown as the card's one action. Omit for a read-only card. */
    actionLabel?: string;
    onAction?: (feature: Feature) => void;
    /** Links the title to the detail page. */
    href?: string;
    /** Turn off where every card on the page is in the same milestone. */
    showMilestone?: boolean;
  };

  let {
    feature,
    milestone = null,
    inRoadmap = false,
    selected = false,
    actionLabel,
    onAction,
    href,
    showMilestone = true,
  }: Props = $props();

  const category = $derived(findCategory(feature.category));
  const status = $derived(findFeatureStatus(feature.status));
  const price = $derived(formatSize(feature.size));

  /** Spelled out for screen readers; the arrows are the glance version. */
  const dependencySummary = $derived(
    [countOf(feature.blockedBy.length, 'blocker'), countOf(feature.blocking.length, 'dependent')]
      .filter((part) => part !== null)
      .join(', '),
  );

  function countOf(count: number, noun: string): string | null {
    return count === 0 ? null : `${count} ${noun}${count === 1 ? '' : 's'}`;
  }
</script>

<article class="card" class:card--selected={selected}>
  <header class="card__head">
    <h3 class="card__title">
      {#if href}<a {href}>{feature.title}</a>{:else}{feature.title}{/if}
    </h3>
    <p class="card__price">{price}</p>
  </header>

  {#if feature.summary}
    <p class="card__summary">{feature.summary}</p>
  {/if}

  <p class="card__meta">
    <span>{category?.label ?? feature.category}</span>

    {#if dependencySummary !== ''}
      <span aria-hidden="true">·</span>
      <span class="card__deps">
        <span aria-hidden="true" title={dependencySummary}>
          {#if feature.blockedBy.length > 0}↑{feature.blockedBy.length}{/if}
          {#if feature.blocking.length > 0}↓{feature.blocking.length}{/if}
        </span>
        <span class="visually-hidden">{dependencySummary}</span>
      </span>
    {/if}

    {#if showMilestone && milestone}
      <span aria-hidden="true">·</span>
      <span>
        {inRoadmap ? 'In' : 'Suggested for'}
        <a href={milestoneHref(milestone.id)}>{milestone.title}</a>
      </span>
    {/if}
  </p>

  <footer class="card__foot">
    <p class={`status status--${feature.status}`}>{status?.label ?? feature.status}</p>

    {#if actionLabel && onAction}
      <button
        type="button"
        class={selected ? 'button--quiet button--small' : 'button--secondary button--small'}
        onclick={() => onAction(feature)}
      >
        {actionLabel}
      </button>
    {/if}
  </footer>
</article>

<style>
  /* Full height so cards in the same grid row line up, whatever their titles
     and summaries do. */
  .card {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    height: 100%;
    padding: var(--space-m);
    background-color: var(--color-surface);
    border: 1px solid var(--color-line);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-card);
    transition: box-shadow var(--transition-fast);
  }

  .card:hover {
    box-shadow: var(--shadow-card-hover);
  }

  /* Selected carries a tint, a heavier border and the action's own label, so
     it never depends on colour alone. */
  .card--selected {
    background-color: var(--color-surface-selected);
    border-color: var(--color-accent);
  }

  .card__head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-m);
  }

  .card__title {
    margin: 0;
    font-size: var(--font-size-m);
    font-weight: var(--font-weight-semibold);
    line-height: var(--line-height-snug);
  }

  .card__title a {
    color: inherit;
    text-decoration: none;
  }

  .card__title a:hover {
    text-decoration: underline;
  }

  .card__price {
    margin: 0;
    font-weight: var(--font-weight-bold);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  /* Two lines on every card, so a long first paragraph can't set the height of
     its whole row. */
  .card__summary {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
    margin: 0;
    font-size: var(--font-size-s);
    line-height: var(--line-height-normal);
    color: var(--color-text-quiet);
  }

  .card__meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2xs) var(--space-xs);
    margin: 0;
    font-size: var(--font-size-s);
    color: var(--color-text-quiet);
  }

  .card__deps {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    white-space: nowrap;
  }

  .card__foot {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-xs) var(--space-s);
    margin-block-start: auto;
    padding-block-start: var(--space-s);
    border-top: 1px solid var(--color-line-soft);
  }
</style>
