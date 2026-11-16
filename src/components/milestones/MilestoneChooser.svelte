<!--
  The milestones we're proposing, on the landing page.

  Each one can go into the roadmap whole, or be opened first to see and change
  what's in it. A milestone already in the roadmap shows the client's version,
  with any details they've changed; one that isn't shows what we proposed and
  what it would cost.
-->
<script lang="ts">
  import MilestoneCard from '@/components/milestones/MilestoneCard.svelte';
  import {
    addMilestone,
    chosenMilestoneIds,
    menuMilestones,
    menuRollups,
    milestoneRollups,
    removeMilestone,
    roadmapMilestones,
  } from '@/stores/roadmap';
  import type { Milestone } from '@/types/domain';

  function toggle(milestone: Milestone) {
    if ($chosenMilestoneIds.has(milestone.id)) removeMilestone(milestone.id);
    else addMilestone(milestone.id);
  }
</script>

{#if $menuMilestones.length === 0}
  <p class="loading">Loading the proposed milestones…</p>
{:else}
  <ul class="chooser">
    {#each $menuMilestones as suggestion (suggestion.milestone.id)}
      {@const id = suggestion.milestone.id}
      {@const inRoadmap = $roadmapMilestones.find((m) => m.milestone.id === id)}
      <li>
        <MilestoneCard
          milestone={inRoadmap?.milestone ?? suggestion.milestone}
          rollup={$milestoneRollups[id] ?? $menuRollups[id]}
          chosen={$chosenMilestoneIds.has(id)}
          locked={suggestion.isScopeLocked}
          onToggle={toggle}
        />
      </li>
    {/each}
  </ul>
{/if}

<style>
  .chooser {
    display: grid;
    gap: var(--space-m);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .loading {
    padding: var(--space-xl);
    color: var(--color-text-quiet);
    background-color: var(--color-surface-quiet);
    border-radius: var(--radius-panel);
  }
</style>
