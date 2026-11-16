<!--
  The roadmap, as a bill.

  Every chosen milestone is itemised with its features and a subtotal, then the
  total. The milestones not chosen sit underneath with their prices, so it's
  clear what adding one would cost. Nothing here is measured against a budget.
-->
<script lang="ts">
  import {
    addMilestone,
    chosenMilestoneIds,
    menuMilestones,
    menuRollups,
    milestoneRollups,
    moveMilestone,
    removeMilestone,
    resetRoadmap,
    roadmapMilestones,
    roadmapRollup,
  } from '@/stores/roadmap';
  import { formatCents, sizeToCents } from '@/lib/budget/format-size';
  import {
    milestoneEditHref,
    milestoneHref,
    newMilestoneHref,
  } from '@/lib/roadmap/milestone-links';
  import { findFeatureStatus } from '@/config/statuses';

  const remaining = $derived(
    $menuMilestones.filter((suggestion) => !$chosenMilestoneIds.has(suggestion.milestone.id)),
  );
  const remainingCents = $derived(
    remaining.reduce(
      (total, suggestion) => total + ($menuRollups[suggestion.milestone.id]?.priceCents ?? 0),
      0,
    ),
  );
</script>

<section class="order" aria-labelledby="in-roadmap">
  <h2 id="in-roadmap">In your roadmap</h2>

  {#if $roadmapMilestones.length === 0}
    <p class="empty">
      Nothing in your roadmap yet. <a href="/">Start from the suggested milestones</a>, or
      <a href={newMilestoneHref()}>build one of your own</a>.
    </p>
  {:else}
    <ul class="order__list">
      {#each $roadmapMilestones as chosen, index (chosen.milestone.id)}
        {@const rollup = $milestoneRollups[chosen.milestone.id]}
        <li class="order__item">
          <details open>
            <summary>
              <span class="order__name">{chosen.milestone.title}</span>
              <span class="order__count">{rollup?.featureCount ?? 0} features</span>
              <span class="order__amount">{formatCents(rollup?.priceCents ?? 0)}</span>
            </summary>

            {#if chosen.features.length === 0}
              <p class="order__blank">Nothing in this milestone yet.</p>
            {:else}
              <ul class="order__features">
                {#each chosen.features as feature (feature.id)}
                  <li>
                    <a href={`/features/${feature.id}/`}>{feature.title}</a>
                    <span class={`status status--${feature.status}`}>
                      {findFeatureStatus(feature.status)?.label ?? feature.status}
                    </span>
                    <span class="order__amount">{formatCents(sizeToCents(feature.size))}</span>
                  </li>
                {/each}
              </ul>
            {/if}

            <p class="order__links">
              <a href={milestoneHref(chosen.milestone.id)}>View</a>
              <a href={milestoneEditHref(chosen.milestone.id)}>Change what’s in it</a>
              <button
                type="button"
                class="button--quiet button--small"
                disabled={index === 0}
                onclick={() => moveMilestone(chosen.milestone.id, index - 1)}
              >
                Move earlier
              </button>
              <button
                type="button"
                class="button--quiet button--small"
                disabled={index === $roadmapMilestones.length - 1}
                onclick={() => moveMilestone(chosen.milestone.id, index + 1)}
              >
                Move later
              </button>
              <button
                type="button"
                class="button--quiet button--small"
                onclick={() => removeMilestone(chosen.milestone.id)}
              >
                Remove from roadmap
              </button>
            </p>
          </details>
        </li>
      {/each}
    </ul>

    <p class="order__total">
      <span>Roadmap total</span>
      <span class="order__amount">{formatCents($roadmapRollup.totalCents)}</span>
    </p>

    <p class="order__reset">
      <button type="button" class="button--quiet button--small" onclick={resetRoadmap}>
        Start over
      </button>
    </p>
  {/if}
</section>

{#if remaining.length > 0}
  <section class="aside" aria-labelledby="not-chosen">
    <h2 id="not-chosen">Not in your roadmap</h2>
    <ul>
      {#each remaining as suggestion (suggestion.milestone.id)}
        <li>
          <a href={milestoneHref(suggestion.milestone.id)}>{suggestion.milestone.title}</a>
          <span class="order__amount">
            {formatCents($menuRollups[suggestion.milestone.id]?.priceCents ?? 0)}
          </span>
          <button
            type="button"
            class="button--secondary button--small"
            onclick={() => addMilestone(suggestion.milestone.id)}
          >
            Add to roadmap
          </button>
        </li>
      {/each}
    </ul>
    <p class="aside__total">Adding all of them would come to {formatCents(remainingCents)}</p>
  </section>
{/if}

<style>
  .empty {
    padding: var(--space-xl);
    color: var(--color-text-quiet);
    background-color: var(--color-surface-quiet);
    border-radius: var(--radius-panel);
  }

  h2 {
    margin-block-end: var(--space-m);
    font-size: var(--font-size-xl);
  }

  .order__list,
  .order__features,
  .aside ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .order__item {
    border-bottom: 1px solid var(--color-line);
  }

  summary {
    display: flex;
    align-items: baseline;
    gap: var(--space-m);
    padding-block: var(--space-m);
    cursor: pointer;
    font-weight: var(--font-weight-semibold);
  }

  .order__name {
    flex: 1;
  }

  .order__count,
  .order__blank {
    font-size: var(--font-size-s);
    font-weight: var(--font-weight-normal);
    color: var(--color-text-quiet);
  }

  .order__blank {
    margin: 0 0 var(--space-xs) var(--space-m);
  }

  .order__amount {
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .order__features li {
    display: flex;
    align-items: baseline;
    gap: var(--space-m);
    padding: var(--space-2xs) 0 var(--space-2xs) var(--space-m);
    font-size: var(--font-size-s);
    border-top: 1px solid var(--color-line-soft);
  }

  .order__features li a {
    flex: 1;
  }

  .order__links {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-m);
    align-items: center;
    padding: var(--space-s) 0 var(--space-m) var(--space-m);
  }

  .order__total {
    display: flex;
    justify-content: space-between;
    gap: var(--space-m);
    margin-block-start: var(--space-m);
    padding-block-start: var(--space-s);
    border-top: 2px solid var(--color-line-strong);
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
  }

  .order__reset {
    margin-block-start: var(--space-m);
  }

  .aside {
    margin-block-start: var(--space-2xl);
    padding: var(--space-l);
    background-color: var(--color-surface-quiet);
    border-radius: var(--radius-panel);
  }

  .aside li {
    display: flex;
    align-items: baseline;
    gap: var(--space-m);
    padding-block: var(--space-xs);
  }

  .aside li a {
    flex: 1;
  }

  .aside__total {
    margin-block-start: var(--space-s);
    font-size: var(--font-size-s);
    color: var(--color-text-quiet);
  }

  button:disabled {
    color: var(--color-text-faint);
    border-color: var(--color-line);
    cursor: default;
  }
</style>
