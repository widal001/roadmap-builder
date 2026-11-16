<!--
  The one page for changing a milestone.

  Building a milestone of your own and editing one off the menu are the same
  job, so they are the same page. A milestone that doesn't exist yet opens the
  details dialog first, and once it's named the page is identical to the one an
  existing milestone gets. Which milestone is in the URL, because a milestone
  the client built has no content file and so no route of its own.
-->
<script lang="ts">
  import { onMount } from 'svelte';

  import MilestoneDetailsDialog from '@/components/milestones/MilestoneDetailsDialog.svelte';
  import MilestoneFeaturePicker from '@/components/milestones/MilestoneFeaturePicker.svelte';
  import MilestoneSummaryBar from '@/components/milestones/MilestoneSummaryBar.svelte';
  import {
    addMilestone,
    chosenMilestoneIds,
    createCustomMilestone,
    isLoading,
    menuMilestones,
    milestoneRollups,
    removeMilestone,
    roadmapMilestones,
    roadmapRollup,
    setMilestoneDetails,
  } from '@/stores/roadmap';
  import {
    milestoneEditHref,
    milestoneHref,
    newMilestoneHref,
  } from '@/lib/roadmap/milestone-links';
  import type { MilestoneDetails } from '@/lib/roadmap/types';
  import type { Tag } from '@/types/domain';

  type Props = {
    /** Tags used by milestones, so the feature filters can offer phases. */
    phaseTags?: readonly Tag[];
  };
  let { phaseTags = [] }: Props = $props();

  /** The milestone being worked on, from the URL so the page can be revisited. */
  let milestoneId = $state<string | null>(null);
  let detailsOpen = $state(false);
  let root = $state<HTMLElement | null>(null);

  onMount(() => {
    milestoneId = new URLSearchParams(window.location.search).get('id');

    // There is nothing to edit until it has a name, so ask for one first.
    if (!milestoneId) detailsOpen = true;
  });

  const index = $derived(
    milestoneId ? $roadmapMilestones.findIndex((m) => m.milestone.id === milestoneId) : -1,
  );
  const inRoadmap = $derived(index >= 0);

  // In the roadmap, this is the client's version. Otherwise it's what we
  // proposed, so a milestone can be looked at before it's chosen.
  const resolved = $derived(
    milestoneId
      ? ($roadmapMilestones[index] ??
          $menuMilestones.find((m) => m.milestone.id === milestoneId) ??
          null)
      : null,
  );
  const rollup = $derived(milestoneId ? $milestoneRollups[milestoneId] : undefined);
  const canChange = $derived(inRoadmap && resolved !== null && !resolved.isScopeLocked);

  // A milestone the client built has no page of its own to go back to.
  const doneHref = $derived(
    resolved && !resolved.isCustom ? milestoneHref(resolved.milestone.id) : '/roadmap/',
  );

  /**
   * The site header is sticky and changes height as it wraps, and the
   * milestone bar sticks below it, so both offsets are measured rather than
   * guessed at.
   */
  $effect(() => {
    const header = document.querySelector('.site-header');
    const bar = root?.querySelector('[data-sticky-bar]');
    if (!root || !header || !bar || !resolved) return;

    const sync = () => {
      const headerHeight = header.getBoundingClientRect().height;
      root?.style.setProperty('--sticky-top', `${headerHeight}px`);
      root?.style.setProperty(
        '--section-top',
        `${headerHeight + bar.getBoundingClientRect().height}px`,
      );
    };

    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(header);
    observer.observe(bar);
    return () => observer.disconnect();
  });

  function saveDetails(details: MilestoneDetails) {
    detailsOpen = false;

    if (!milestoneId) {
      const id = createCustomMilestone(details);
      if (!id) return;

      milestoneId = id;
      // Replacing rather than pushing keeps Back pointed where the client came
      // from, not at the empty page they've just filled in.
      window.history.replaceState(null, '', milestoneEditHref(id));
      return;
    }

    // Details are part of the roadmap, so a milestone has to be in it first.
    if (!$chosenMilestoneIds.has(milestoneId)) addMilestone(milestoneId);
    setMilestoneDetails(milestoneId, details);
  }

  function remove() {
    if (!milestoneId) return;

    const wasCustom = resolved?.isCustom ?? false;
    removeMilestone(milestoneId);
    if (wasCustom) window.location.href = '/roadmap/';
  }

  /** A date input reads and writes `YYYY-MM-DD` in the viewer's own time zone. */
  function toDateInputValue(date: Date | null): string {
    if (!date) return '';

    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${String(date.getDate()).padStart(2, '0')}`;
  }
</script>

<div class="workspace" bind:this={root}>
  {#if resolved}
    <MilestoneSummaryBar
      {resolved}
      {rollup}
      roadmap={$roadmapRollup}
      {index}
      {doneHref}
      onEditDetails={() => (detailsOpen = true)}
    />
  {/if}

  <div class="page">
    {#if !resolved}
      {#if $isLoading}
        <p class="notice">Loading…</p>
      {:else if milestoneId}
        <p class="notice">
          That milestone isn't in your roadmap any more.
          <a href={newMilestoneHref()}>Build a new one</a>.
        </p>
      {:else}
        <div class="notice">
          <h1>Build your own milestone</h1>
          <p>Name it and set a target date. You can change both later.</p>
          <p>
            <button type="button" class="button" onclick={() => (detailsOpen = true)}>
              Name this milestone
            </button>
          </p>
        </div>
      {/if}
    {:else}
      {#if !inRoadmap}
        <!-- A milestone has contents of its own only once it's in the roadmap.
             Until then this is our proposal, and nothing here can change. -->
        <div class="invite">
          <p>This is what we proposed for {resolved.milestone.title}.</p>
          <button type="button" class="button" onclick={() => addMilestone(resolved.milestone.id)}>
            Add to roadmap
          </button>
        </div>
      {:else if resolved.isScopeLocked}
        <p class="notice">Delivery has started, so what's in this milestone is settled.</p>
      {/if}

      {#if resolved.milestone.description}
        <p class="about">{resolved.milestone.description}</p>
      {/if}

      <MilestoneFeaturePicker
        milestoneId={resolved.milestone.id}
        included={resolved.features}
        {canChange}
        {phaseTags}
      />

      {#if inRoadmap}
        <p class="remove">
          <button type="button" class="button--quiet button--small" onclick={remove}>
            {resolved.isCustom ? 'Delete this milestone' : 'Remove from roadmap'}
          </button>
        </p>
      {/if}
    {/if}
  </div>
</div>

<MilestoneDetailsDialog
  open={detailsOpen}
  isNew={milestoneId === null}
  title={resolved?.milestone.title ?? ''}
  description={resolved?.milestone.description ?? ''}
  deadline={toDateInputValue(resolved?.milestone.deadline ?? null)}
  onSave={saveDetails}
  onClose={() => (detailsOpen = false)}
/>

<style>
  .notice {
    padding: var(--space-xl);
    color: var(--color-text-quiet);
    background-color: var(--color-surface-quiet);
    border-radius: var(--radius-panel);
  }

  .notice h1 {
    margin-block-end: var(--space-xs);
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-extrabold);
    color: var(--color-text);
  }

  .notice p + p {
    margin-block-start: var(--space-m);
  }

  .invite {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-m);
    padding: var(--space-m) var(--space-l);
    background-color: var(--color-surface-selected);
    border-radius: var(--radius-panel);
  }

  .invite p {
    margin: 0;
    line-height: var(--line-height-normal);
  }

  .about {
    max-width: 44rem;
    margin-block-start: var(--space-m);
    color: var(--color-text-quiet);
    line-height: var(--line-height-normal);
  }

  .remove {
    margin-block-start: var(--space-2xl);
  }
</style>
