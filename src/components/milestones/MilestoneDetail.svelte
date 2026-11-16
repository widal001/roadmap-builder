<!--
  One milestone and the features in it.

  Read-first: this page is for understanding what a milestone contains and how
  far along it is. Changing it happens in the editor.

  A milestone in the roadmap shows the client's version, with any details they
  have changed. One still on the menu shows what we proposed, which is what
  they'd get by adding it.
-->
<script lang="ts">
  import FeatureCard from '@/components/features/FeatureCard.svelte';
  import {
    addMilestone,
    chosenMilestoneIds,
    menuMilestones,
    menuRollups,
    milestoneRollups,
    removeMilestone,
    roadmapMilestones,
  } from '@/stores/roadmap';
  import { formatCents, formatCentsSigned } from '@/lib/budget/format-size';
  import { milestoneEditHref } from '@/lib/roadmap/milestone-links';

  type Props = { milestoneId: string };
  let { milestoneId }: Props = $props();

  const chosen = $derived($chosenMilestoneIds.has(milestoneId));

  // In the roadmap, this is what the client assembled. Otherwise it's what we
  // proposed, so the page always has something to show.
  const resolved = $derived(
    $roadmapMilestones.find((m) => m.milestone.id === milestoneId) ??
      $menuMilestones.find((m) => m.milestone.id === milestoneId) ??
      null,
  );
  const rollup = $derived(chosen ? $milestoneRollups[milestoneId] : $menuRollups[milestoneId]);

  // The heading above is prerendered from the content file, so a milestone the
  // client has renamed says so here rather than quietly disagreeing with it.
  const renamedTo = $derived.by(() => {
    const proposed = $menuMilestones.find((m) => m.milestone.id === milestoneId)?.milestone;
    const current = resolved?.milestone;
    return proposed && current && proposed.title !== current.title ? current.title : null;
  });
  const featureCount = $derived(rollup?.featureCount ?? 0);
</script>

{#if !resolved}
  <p class="loading">Loading this milestone…</p>
{:else}
  <div class="summary">
    <div class="summary__figures">
      <p class="summary__price">{formatCents(rollup?.priceCents ?? 0)}</p>
      <p class="summary__count">
        {featureCount} feature{featureCount === 1 ? '' : 's'}
        {#if rollup?.isCustomized}
          · {formatCentsSigned(rollup.differenceCents)} against the {formatCents(
            rollup.defaultPriceCents,
          )} we proposed
        {/if}
      </p>
      {#if rollup && rollup.deliveredCents > 0}
        <p class="summary__progress">
          {formatCents(rollup.deliveredCents)} delivered ({Math.round(rollup.completion * 100)}%)
        </p>
      {/if}
      <p class="summary__state">{chosen ? 'In your roadmap' : 'Not in your roadmap'}</p>
      {#if renamedTo}
        <p class="summary__state">You renamed this to “{renamedTo}”</p>
      {/if}
    </div>

    <div class="summary__actions">
      {#if chosen}
        <button type="button" class="button--quiet" onclick={() => removeMilestone(milestoneId)}>
          Remove from roadmap
        </button>
      {:else}
        <button type="button" class="button" onclick={() => addMilestone(milestoneId)}>
          Add to roadmap
        </button>
      {/if}

      {#if resolved.isScopeLocked}
        <p class="summary__locked">Delivery has started, so the scope is settled.</p>
      {:else}
        <a class="button--secondary" href={milestoneEditHref(milestoneId)}>
          {chosen ? 'Change what’s in it' : 'See what’s in it'}
        </a>
      {/if}
    </div>
  </div>

  <h2>Features</h2>
  {#if resolved.features.length === 0}
    <p class="loading">Nothing in this milestone yet.</p>
  {:else}
    <ul class="features">
      {#each resolved.features as feature (feature.id)}
        <li>
          <FeatureCard
            {feature}
            milestone={resolved.milestone}
            inRoadmap={chosen}
            showMilestone={false}
            href={`/features/${feature.id}/`}
          />
        </li>
      {/each}
    </ul>
  {/if}
{/if}

<style>
  .loading {
    padding: var(--space-xl);
    color: var(--color-text-quiet);
    background-color: var(--color-surface-quiet);
    border-radius: var(--radius-panel);
  }

  .summary {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-l);
    padding: var(--space-l);
    margin-block-end: var(--space-2xl);
    background-color: var(--color-surface-quiet);
    border-radius: var(--radius-panel);
  }

  .summary__price {
    margin: 0;
    font-size: var(--font-size-3xl);
    font-weight: var(--font-weight-extrabold);
    font-variant-numeric: tabular-nums;
  }

  .summary__count,
  .summary__progress,
  .summary__state,
  .summary__locked {
    margin: var(--space-2xs) 0 0;
    font-size: var(--font-size-s);
    color: var(--color-text-quiet);
  }

  .summary__actions {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-xs);
  }

  h2 {
    margin-block-end: var(--space-m);
    font-size: var(--font-size-xl);
  }

  .features {
    display: grid;
    gap: var(--space-m);
    margin: 0;
    padding: 0;
    list-style: none;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 20rem), 1fr));
  }
</style>
