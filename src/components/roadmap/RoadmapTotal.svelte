<!--
  The roadmap total in the site header.

  Also the island that hands the menu to the roadmap store, because the header
  is on every page. Hovering or focusing the total reveals the per-milestone
  breakdown; activating it goes to the roadmap page for the full detail.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import {
    initRoadmap,
    milestoneRollups,
    roadmapMilestones,
    roadmapRollup,
  } from '@/stores/roadmap';
  import { formatCents } from '@/lib/budget/format-size';
  import type { Catalog } from '@/types/domain';

  type Props = { catalog: Catalog };
  let { catalog }: Props = $props();

  onMount(() => initRoadmap(catalog));

  /**
   * How much of the roadmap is delivered. Null until there is something to be
   * a percentage of, so an empty roadmap shows a total rather than a bare 0%.
   */
  const percentDelivered = $derived(
    $roadmapRollup.totalCents > 0
      ? Math.round(($roadmapRollup.deliveredCents / $roadmapRollup.totalCents) * 100)
      : null,
  );
</script>

<div class="total">
  <a class="total__link" href="/roadmap/">
    <span class="total__label">
      {$roadmapRollup.milestoneCount === 0
        ? 'Roadmap'
        : `${$roadmapRollup.milestoneCount} milestone${$roadmapRollup.milestoneCount === 1 ? '' : 's'}`}
    </span>
    <span class="total__amount">{formatCents($roadmapRollup.totalCents)}</span>
    {#if percentDelivered !== null}
      <span class="total__progress">
        <span class="total__bar" aria-hidden="true">
          <span class="total__bar-fill" style={`width: ${percentDelivered}%`}></span>
        </span>
        <span class="total__progress-text">{percentDelivered}% delivered</span>
      </span>
    {/if}
  </a>

  <div class="total__breakdown" role="tooltip">
    {#if $roadmapMilestones.length === 0}
      <p class="total__empty">Nothing in your roadmap yet.</p>
    {:else}
      <ul class="total__list">
        {#each $roadmapMilestones as chosen (chosen.milestone.id)}
          <li>
            <span>{chosen.milestone.title}</span>
            <span class="total__row-amount">
              {formatCents($milestoneRollups[chosen.milestone.id]?.priceCents ?? 0)}
            </span>
          </li>
        {/each}
      </ul>
      <p class="total__sum">
        <span>
          {$roadmapRollup.milestoneCount} milestone{$roadmapRollup.milestoneCount === 1 ? '' : 's'}
        </span>
        <span class="total__row-amount">{formatCents($roadmapRollup.totalCents)}</span>
      </p>
    {/if}
  </div>
</div>

<style>
  .total {
    position: relative;
  }

  .total__link {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: var(--space-3xs);
    padding: var(--space-2xs) var(--space-s);
    border-radius: var(--radius-btn);
    color: inherit;
    text-decoration: none;
  }

  .total__link:hover {
    background-color: #ffffff1a;
  }

  .total__label {
    font-size: var(--font-size-xs);
    opacity: 0.75;
  }

  .total__amount {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
    font-variant-numeric: tabular-nums;
    line-height: 1.1;
  }

  .total__progress {
    display: flex;
    align-items: center;
    gap: var(--space-2xs);
    margin-block-start: var(--space-3xs);
  }

  .total__bar {
    display: block;
    width: 4rem;
    height: 4px;
    border-radius: 2px;
    background-color: #ffffff2e;
    overflow: hidden;
  }

  .total__bar-fill {
    display: block;
    height: 100%;
    background-color: var(--brand-cyan);
    transition: width var(--transition-fast);
  }

  .total__progress-text {
    font-size: var(--font-size-xs);
    opacity: 0.85;
    font-variant-numeric: tabular-nums;
  }

  /* Revealed on hover and on keyboard focus, so it isn't pointer-only. */
  .total__breakdown {
    position: absolute;
    inset-inline-end: 0;
    z-index: 10;
    min-width: 18rem;
    margin-block-start: var(--space-2xs);
    padding: var(--space-s) var(--space-m);
    background-color: var(--color-surface);
    color: var(--color-text);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-card-hover);
    opacity: 0;
    visibility: hidden;
    transition: opacity var(--transition-fast);
  }

  .total:hover .total__breakdown,
  .total:focus-within .total__breakdown {
    opacity: 1;
    visibility: visible;
  }

  .total__list {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .total__list li,
  .total__sum {
    display: flex;
    justify-content: space-between;
    gap: var(--space-m);
    padding-block: var(--space-2xs);
    font-size: var(--font-size-s);
  }

  .total__sum {
    margin-block-start: var(--space-2xs);
    padding-block-start: var(--space-xs);
    border-top: 1px solid var(--color-line-strong);
    font-weight: var(--font-weight-semibold);
  }

  .total__row-amount {
    font-variant-numeric: tabular-nums;
  }

  .total__empty {
    margin: 0;
    font-size: var(--font-size-s);
    color: var(--color-text-quiet);
  }

  @media (max-width: 34rem) {
    .total__breakdown {
      display: none;
    }
  }
</style>
