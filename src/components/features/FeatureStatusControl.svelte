<!--
  The status control on a feature's own page.

  Status is editable here because this is where someone has just read what the
  work actually is. Which milestone it belongs to is not, because that changes
  a price, and prices belong next to the totals on the milestone page.
-->
<script lang="ts">
  import {
    allFeatures,
    menuMilestones,
    roadmapMilestones,
    setFeatureStatus,
  } from '@/stores/roadmap';
  import { milestoneHref } from '@/lib/roadmap/milestone-links';
  import { FEATURE_STATUSES } from '@/config/statuses';
  import type { FeatureStatusId } from '@/config/statuses';

  type Props = { featureId: string };
  let { featureId }: Props = $props();

  const feature = $derived($allFeatures.find((f) => f.id === featureId) ?? null);

  /** The milestone holding this feature, if the client has chosen one for it. */
  const holding = $derived(
    $roadmapMilestones.find((chosen) => chosen.features.some((f) => f.id === featureId)) ?? null,
  );

  /** Where the menu suggests it goes, shown when the client hasn't chosen yet. */
  const suggested = $derived(
    $menuMilestones.find((m) => m.milestone.id === feature?.milestoneId) ?? null,
  );
</script>

<div class="control">
  <label class="control__status">
    <span>Status</span>
    <select
      disabled={!feature}
      value={feature?.status ?? 'backlog'}
      onchange={(event) =>
        feature && setFeatureStatus(feature.id, event.currentTarget.value as FeatureStatusId)}
    >
      {#each FEATURE_STATUSES as option (option.id)}
        <option value={option.id}>{option.label}</option>
      {/each}
    </select>
  </label>

  <p class="control__milestone">
    <span>Milestone</span>
    {#if holding}
      <a href={milestoneHref(holding.milestone.id)}>{holding.milestone.title}</a>
      <span class="control__state">In your roadmap</span>
    {:else if suggested}
      <a href={milestoneHref(suggested.milestone.id)}>{suggested.milestone.title}</a>
      <span class="control__state">On the menu</span>
    {:else}
      <span>Not in a milestone</span>
    {/if}
  </p>
</div>

<style>
  .control {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-l);
    padding: var(--space-m) var(--space-l);
    background-color: var(--color-surface-quiet);
    border-radius: var(--radius-panel);
  }

  .control__status,
  .control__milestone {
    display: flex;
    flex-direction: column;
    gap: var(--space-2xs);
    margin: 0;
  }

  .control__status > span:first-child,
  .control__milestone > span:first-child {
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-text-faint);
  }

  select {
    padding: var(--space-2xs) var(--space-xs);
    background-color: var(--color-surface);
    border: 1px solid var(--color-field-border);
    border-radius: var(--radius-btn);
  }

  .control__state {
    font-size: var(--font-size-s);
    color: var(--color-text-quiet);
  }
</style>
