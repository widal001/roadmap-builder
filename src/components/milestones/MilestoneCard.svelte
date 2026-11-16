<!--
  One milestone, as a card.

  Used on the landing page to choose milestones and on the roadmap page to
  review them. Shows what it costs, how that compares with what we proposed,
  and whether it's in the roadmap. A milestone is in or it isn't: there is no
  third state to render.

  Adding stays on the page rather than opening the milestone, so several can be
  added in a row while the running total climbs. Opening it is the second,
  quieter action.
-->
<script lang="ts">
  import { formatCents, formatCentsSigned } from '@/lib/budget/format-size';
  import { milestoneEditHref, milestoneHref } from '@/lib/roadmap/milestone-links';
  import { MILESTONE_STATUSES } from '@/config/statuses';
  import type { Milestone } from '@/types/domain';
  import type { MilestoneRollup } from '@/lib/budget/rollup';

  type Props = {
    milestone: Milestone;
    rollup: MilestoneRollup | undefined;
    /** Whether this milestone is in the roadmap. */
    chosen?: boolean;
    /** Milestones the proposal says are already under way can't be re-scoped. */
    locked?: boolean;
    onToggle?: (milestone: Milestone) => void;
  };

  let { milestone, rollup, chosen = false, locked = false, onToggle }: Props = $props();

  const statusLabel = $derived(
    MILESTONE_STATUSES.find((s) => s.id === milestone.status)?.label ?? milestone.status,
  );
  const deadline = $derived(
    milestone.deadline
      ? new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(
          milestone.deadline,
        )
      : null,
  );
  const featureCount = $derived(rollup?.featureCount ?? 0);
</script>

<article class="milestone" class:milestone--chosen={chosen}>
  <header class="milestone__head">
    <div>
      <h3 class="milestone__title">
        <a href={milestoneHref(milestone.id)}>{milestone.title}</a>
      </h3>
      <p class="milestone__when">
        {#if deadline}<span>Due {deadline}</span>{/if}
        <span class="milestone__status">{statusLabel}</span>
        {#if locked}<span class="milestone__status">Scope settled</span>{/if}
      </p>
    </div>
    <p class="milestone__price">{formatCents(rollup?.priceCents ?? 0)}</p>
  </header>

  <p class="milestone__description">{milestone.description}</p>

  <p class="milestone__counts">
    {featureCount} feature{featureCount === 1 ? '' : 's'}
    {#if rollup?.isCustomized}
      <span class="milestone__drift">
        {formatCentsSigned(rollup.differenceCents)} against the {formatCents(
          rollup.defaultPriceCents,
        )} we proposed
      </span>
    {/if}
  </p>

  <footer class="milestone__foot">
    {#if onToggle}
      <button
        type="button"
        class={chosen ? 'button--quiet' : 'button'}
        onclick={() => onToggle(milestone)}
      >
        {chosen ? 'Remove from roadmap' : 'Add to roadmap'}
      </button>
    {/if}

    {#if locked}
      <span class="milestone__locked">Delivery has started</span>
    {:else}
      <a class="button--secondary" href={milestoneEditHref(milestone.id)}>
        {chosen ? 'Change what’s in it' : 'See what’s in it'}
      </a>
    {/if}

    {#if chosen}<span class="milestone__chosen-flag">In your roadmap</span>{/if}
  </footer>
</article>

<style>
  .milestone {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    padding: var(--space-l);
    background-color: var(--color-surface);
    border: 1px solid var(--color-line);
    border-radius: var(--radius-panel);
    box-shadow: var(--shadow-card);
  }

  .milestone--chosen {
    border-color: var(--color-accent);
    box-shadow: var(--shadow-card-hover);
  }

  .milestone__head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-m);
  }

  .milestone__title {
    margin: 0;
    font-size: var(--font-size-l);
    font-weight: var(--font-weight-bold);
    line-height: var(--line-height-snug);
  }

  .milestone__title a {
    color: inherit;
    text-decoration: none;
  }

  .milestone__title a:hover {
    text-decoration: underline;
  }

  .milestone__price {
    margin: 0;
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .milestone__when {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
    margin: var(--space-3xs) 0 0;
    font-size: var(--font-size-s);
    color: var(--color-text-quiet);
  }

  .milestone__status {
    padding: var(--space-3xs) var(--space-xs);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
    background-color: var(--color-surface-sunk);
    border-radius: var(--radius-btn);
  }

  .milestone__description {
    margin: 0;
    color: var(--color-text-quiet);
    line-height: var(--line-height-normal);
  }

  .milestone__counts {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
    margin: 0;
    font-size: var(--font-size-s);
    color: var(--color-text-quiet);
  }

  .milestone__drift {
    font-weight: var(--font-weight-medium);
    color: var(--color-text);
  }

  .milestone__foot {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-s);
    margin-block-start: var(--space-2xs);
    padding-block-start: var(--space-s);
    border-top: 1px solid var(--color-line-soft);
  }

  .milestone__locked,
  .milestone__chosen-flag {
    font-size: var(--font-size-s);
    color: var(--color-text-quiet);
  }

  .milestone__chosen-flag {
    margin-inline-start: auto;
    font-weight: var(--font-weight-semibold);
    color: var(--color-accent-hover);
  }
</style>
