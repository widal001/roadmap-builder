<!--
  The bar that stays put while you change a milestone.

  It runs the full width of the window because it carries both numbers the
  client is weighing: what this milestone costs, and what the whole roadmap
  costs with it in. Moving a milestone earlier or later is here too, since
  delivery order is part of the same decision.
-->
<script lang="ts">
  import { moveMilestone, setMilestoneDetails } from '@/stores/roadmap';
  import { formatCents, formatCentsSigned } from '@/lib/budget/format-size';
  import { MILESTONE_STATUSES } from '@/config/statuses';
  import type { MilestoneStatusId } from '@/config/statuses';
  import type { MilestoneRollup, RoadmapRollup } from '@/lib/budget/rollup';
  import type { ResolvedMilestone } from '@/lib/roadmap/resolve-roadmap';

  type Props = {
    resolved: ResolvedMilestone;
    rollup: MilestoneRollup | undefined;
    /** The whole roadmap, for the running total beside this milestone's price. */
    roadmap: RoadmapRollup;
    /** Where this milestone sits in the delivery order, or -1 when it isn't in the roadmap. */
    index: number;
    onEditDetails: () => void;
    /** Where "Done" goes back to. */
    doneHref: string;
  };

  let { resolved, rollup, roadmap, index, onEditDetails, doneHref }: Props = $props();

  const id = $derived(resolved.milestone.id);
  const inRoadmap = $derived(index >= 0);
  const featureCount = $derived(rollup?.featureCount ?? resolved.features.length);
  const deadline = $derived(
    resolved.milestone.deadline
      ? new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(
          resolved.milestone.deadline,
        )
      : null,
  );
</script>

<!-- data-sticky-bar is how the workspace finds this to measure its height. -->
<div class="bar" data-sticky-bar>
  <div class="bar__inner">
    <div class="bar__identity">
      <h1 class="bar__name">{resolved.milestone.title}</h1>
      <p class="bar__when">
        {#if deadline}<span>Due {deadline}</span>{/if}
        {#if inRoadmap}
          <span>Delivery {index + 1} of {roadmap.milestoneCount}</span>
        {:else}
          <span>Not in your roadmap yet</span>
        {/if}
      </p>
    </div>

    <dl class="bar__figures">
      <div class="bar__figure">
        <dt>This milestone</dt>
        <dd>
          {formatCents(rollup?.priceCents ?? 0)}
          <span class="bar__note">
            {featureCount} feature{featureCount === 1 ? '' : 's'}
            {#if rollup?.isCustomized}
              · {formatCentsSigned(rollup.differenceCents)} against what we suggested
            {/if}
          </span>
        </dd>
      </div>

      <div class="bar__figure">
        <dt>Roadmap</dt>
        <dd>
          <a href="/roadmap/">{formatCents(roadmap.totalCents)}</a>
          <span class="bar__note">
            {roadmap.milestoneCount} milestone{roadmap.milestoneCount === 1 ? '' : 's'}
          </span>
        </dd>
      </div>
    </dl>

    <div class="bar__actions">
      {#if inRoadmap}
        <label class="bar__status">
          <span class="visually-hidden">Status for {resolved.milestone.title}</span>
          <select
            value={resolved.milestone.status}
            onchange={(event) =>
              setMilestoneDetails(id, {
                status: event.currentTarget.value as MilestoneStatusId,
              })}
          >
            {#each MILESTONE_STATUSES as status (status.id)}
              <option value={status.id}>{status.label}</option>
            {/each}
          </select>
        </label>

        <button type="button" class="button--secondary button--small" onclick={onEditDetails}>
          Edit details
        </button>

        {#if roadmap.milestoneCount > 1}
          <span class="bar__order">
            <button
              type="button"
              class="button--quiet button--small"
              disabled={index === 0}
              onclick={() => moveMilestone(id, index - 1)}
            >
              Earlier
            </button>
            <button
              type="button"
              class="button--quiet button--small"
              disabled={index === roadmap.milestoneCount - 1}
              onclick={() => moveMilestone(id, index + 1)}
            >
              Later
            </button>
          </span>
        {/if}
      {/if}

      <a class="button button--small" href={doneHref}>Done</a>
    </div>
  </div>
</div>

<style>
  /* Full width, and sticky under the site header. --sticky-top is measured by
     the workspace, because the header's height changes as it wraps. */
  .bar {
    position: sticky;
    top: var(--sticky-top, 0px);
    z-index: 10;
    background-color: var(--color-surface);
    border-bottom: 1px solid var(--color-line);
    box-shadow: var(--shadow-card);
  }

  .bar__inner {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-m) var(--space-xl);
    width: 100%;
    max-width: var(--container-page);
    margin-inline: auto;
    padding: var(--space-s) var(--space-m);
  }

  .bar__identity {
    flex: 1 1 14rem;
  }

  .bar__name {
    margin: 0;
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
  }

  .bar__when {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
    margin: var(--space-3xs) 0 0;
    font-size: var(--font-size-s);
    color: var(--color-text-quiet);
  }

  .bar__figures {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-l);
    margin: 0;
  }

  .bar__figure dt {
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-text-faint);
  }

  .bar__figure dd {
    margin: 0;
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-extrabold);
    font-variant-numeric: tabular-nums;
    line-height: var(--line-height-tight);
  }

  .bar__figure dd a {
    color: inherit;
  }

  .bar__note {
    display: block;
    font-size: var(--font-size-s);
    font-weight: var(--font-weight-normal);
    color: var(--color-text-quiet);
  }

  .bar__actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-xs);
    margin-inline-start: auto;
  }

  .bar__status select {
    padding: var(--space-2xs) var(--space-xs);
    font: inherit;
    font-size: var(--font-size-s);
    background-color: var(--color-surface);
    border: 1px solid var(--color-field-border);
    border-radius: var(--radius-btn);
  }

  .bar__order {
    display: inline-flex;
    gap: var(--space-2xs);
  }
</style>
