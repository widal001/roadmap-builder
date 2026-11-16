<!--
  Choosing what goes into a milestone.

  Two sections, each one collapsible, each keeping its summary bar in view as
  the page scrolls: what's in the milestone, and what else could be. The bars
  carry the counts and the price, so collapsing a section never hides the
  number being decided.

  Taking a feature off leaves it in place, marked, with the control in the same
  spot, so undoing mid-sentence is easy.

  Adding a feature whose prerequisites aren't in the roadmap doesn't silently
  pull them in. It offers, with the cost shown, so nothing changes the total
  without someone choosing it.
-->
<script lang="ts">
  import FeatureCard from '@/components/features/FeatureCard.svelte';
  import FeatureFilters from '@/components/features/FeatureFilters.svelte';
  import {
    addFeature,
    allFeatures,
    availableFeatures,
    removeFeature,
    roadmap,
  } from '@/stores/roadmap';
  import { createFeatureFilters } from '@/stores/filters';
  import { missingPrerequisites } from '@/lib/roadmap/required-features';
  import { formatCents, sizeToCents } from '@/lib/budget/format-size';
  import type { Feature, Tag } from '@/types/domain';

  type Props = {
    milestoneId: string;
    /** The features in it, in the order the roadmap lists them. */
    included: readonly Feature[];
    /** False while the milestone is read-only: not chosen yet, or already under way. */
    canChange: boolean;
    /** Tags used by milestones, so the filters can offer phases. */
    phaseTags?: readonly Tag[];
  };

  let { milestoneId, included, canChange, phaseTags = [] }: Props = $props();

  // Its own filter surface, so searching here never touches the catalogue page.
  const picker = createFeatureFilters(availableFeatures);
  const { filteredFeatures } = picker;

  /** The feature whose prerequisites are being offered, if any. */
  let pending = $state<Feature | null>(null);
  /** Features taken off in this session, kept visible so they can be put back. */
  let removed = $state<string[]>([]);

  const includedPrice = $derived(included.reduce((total, f) => total + sizeToCents(f.size), 0));

  const removedFeatures = $derived(
    removed.flatMap((id) => {
      const feature = $allFeatures.find((f) => f.id === id);
      return feature && !included.some((f) => f.id === id) ? [feature] : [];
    }),
  );

  const offered = $derived($filteredFeatures.filter((feature) => !removed.includes(feature.id)));

  const prerequisites = $derived(
    pending && $roadmap ? missingPrerequisites(pending, $allFeatures, $roadmap) : null,
  );

  function take(feature: Feature) {
    removeFeature(milestoneId, feature.id);
    if (!removed.includes(feature.id)) removed = [...removed, feature.id];
  }

  function putBack(feature: Feature) {
    addFeature(milestoneId, feature.id);
    removed = removed.filter((id) => id !== feature.id);
  }

  function add(feature: Feature) {
    if (!$roadmap) return;

    const needed = missingPrerequisites(feature, $allFeatures, $roadmap);
    if (needed.missing.length > 0) {
      pending = feature;
      return;
    }
    commit(feature);
  }

  function commit(feature: Feature, alsoAdd: readonly Feature[] = []) {
    for (const prerequisite of alsoAdd) addFeature(milestoneId, prerequisite.id);
    addFeature(milestoneId, feature.id);
    removed = removed.filter((id) => id !== feature.id);
    pending = null;
  }
</script>

<details class="section" open>
  <summary class="section__bar">
    <span class="section__title">In this milestone</span>
    <span class="section__note">
      {included.length} feature{included.length === 1 ? '' : 's'} · {formatCents(includedPrice)}
    </span>
  </summary>

  <div class="section__body">
    {#if included.length === 0 && removedFeatures.length === 0}
      <p class="blank">Nothing in it yet. Add features below.</p>
    {:else}
      <ul class="grid">
        {#each included as feature (feature.id)}
          <li>
            <FeatureCard
              {feature}
              inRoadmap
              selected
              showMilestone={false}
              href={`/features/${feature.id}/`}
              actionLabel={canChange ? 'Take it off' : undefined}
              onAction={canChange ? take : undefined}
            />
          </li>
        {/each}

        {#each removedFeatures as feature (feature.id)}
          <li class="taken">
            <p class="taken__note">Taken off</p>
            <FeatureCard
              {feature}
              showMilestone={false}
              href={`/features/${feature.id}/`}
              actionLabel="Put it back"
              onAction={putBack}
            />
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</details>

{#if canChange}
  <details class="section" open>
    <summary class="section__bar">
      <span class="section__title">Add features</span>
      <span class="section__note">
        {$availableFeatures.length} not in your roadmap
      </span>
    </summary>

    <div class="section__body">
      <FeatureFilters filters={picker} {phaseTags} compact />

      <p class="section__results" role="status">
        {offered.length} of {$availableFeatures.length} shown
      </p>

      {#if offered.length === 0}
        <p class="blank">Nothing matches. Clear a filter, or try another search.</p>
      {:else}
        <ul class="grid">
          {#each offered as feature (feature.id)}
            <li>
              <FeatureCard
                {feature}
                href={`/features/${feature.id}/`}
                actionLabel="Add"
                onAction={add}
              />

              {#if pending?.id === feature.id && prerequisites}
                <div class="needs">
                  <p>
                    <strong>{feature.title}</strong> depends on work that isn't in your roadmap yet:
                  </p>
                  <ul>
                    {#each prerequisites.missing as prerequisite (prerequisite.id)}
                      <li>
                        {prerequisite.title}
                        <span>{formatCents(sizeToCents(prerequisite.size))}</span>
                      </li>
                    {/each}
                  </ul>
                  <p class="needs__actions">
                    <button
                      type="button"
                      class="button button--small"
                      onclick={() => commit(feature, prerequisites.missing)}
                    >
                      Add all {prerequisites.missing.length + 1} ({formatCents(
                        prerequisites.additionalCents + sizeToCents(feature.size),
                      )})
                    </button>
                    <button
                      type="button"
                      class="button--secondary button--small"
                      onclick={() => commit(feature)}
                    >
                      Add just this one
                    </button>
                    <button
                      type="button"
                      class="button--quiet button--small"
                      onclick={() => (pending = null)}
                    >
                      Cancel
                    </button>
                  </p>
                </div>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </details>
{/if}

<style>
  .section {
    margin-block-start: var(--space-l);
  }

  /* Sticky under the milestone bar, which is itself sticky under the site
     header. The workspace measures both and sets --section-top. */
  .section__bar {
    position: sticky;
    list-style: none;
    top: var(--section-top, 0px);
    z-index: 5;
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: var(--space-s) var(--space-m);
    padding: var(--space-s) var(--space-m);
    background-color: var(--color-surface-quiet);
    border: 1px solid var(--color-line);
    border-radius: var(--radius-btn);
    cursor: pointer;
  }

  /* display: flex drops the native marker, so the bar draws its own. */
  .section__bar::-webkit-details-marker {
    display: none;
  }

  .section__bar::before {
    content: '▾';
    font-size: var(--font-size-s);
    color: var(--color-text-quiet);
  }

  .section:not([open]) .section__bar::before {
    content: '▸';
  }

  .section__title {
    font-size: var(--font-size-l);
    font-weight: var(--font-weight-bold);
  }

  .section__results {
    margin-block: var(--space-s) 0;
    font-size: var(--font-size-s);
    color: var(--color-text-quiet);
    font-variant-numeric: tabular-nums;
  }

  .section__note {
    margin-inline-start: auto;
    font-size: var(--font-size-s);
    color: var(--color-text-quiet);
    font-variant-numeric: tabular-nums;
  }

  .section__body {
    padding-block-start: var(--space-m);
  }

  .blank {
    padding: var(--space-xl);
    color: var(--color-text-quiet);
    background-color: var(--color-surface-quiet);
    border-radius: var(--radius-panel);
  }

  .grid {
    display: grid;
    gap: var(--space-m);
    margin: 0;
    padding: 0;
    list-style: none;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 20rem), 1fr));
  }

  /* The card takes the free height of its row; anything else in the item, such
     as the prerequisites panel, sits below at its own height. */
  .grid > li {
    display: grid;
    grid-template-rows: 1fr auto;
  }

  .grid > li.taken {
    grid-template-rows: auto 1fr;
  }

  .taken__note {
    margin-block-end: var(--space-2xs);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-text-faint);
  }

  .needs {
    margin-block-start: var(--space-xs);
    padding: var(--space-m);
    background-color: var(--color-surface-selected);
    border-radius: var(--radius-card);
  }

  .needs p {
    margin: 0 0 var(--space-xs);
    font-size: var(--font-size-s);
  }

  .needs ul {
    margin: 0 0 var(--space-s);
    padding-inline-start: var(--space-m);
    font-size: var(--font-size-s);
  }

  .needs li span {
    font-variant-numeric: tabular-nums;
    color: var(--color-text-quiet);
  }

  .needs__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
  }
</style>
