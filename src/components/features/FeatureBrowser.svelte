<!--
  The feature catalogue.

  Features are never scoped to one milestone here: this is the full list
  everything is picked from, which is why each card says where it currently
  sits rather than assuming.
-->
<script lang="ts">
  import ActiveFilterChips from '@/components/features/ActiveFilterChips.svelte';
  import FeatureCard from '@/components/features/FeatureCard.svelte';
  import FeatureFilterPanel from '@/components/features/FeatureFilterPanel.svelte';
  import { catalogFilters } from '@/stores/filters';
  import { allFeatures } from '@/stores/roadmap';
  import type { Tag } from '@/types/domain';

  type Props = { phaseTags: readonly Tag[] };
  let { phaseTags }: Props = $props();

  const { filteredFeatures } = catalogFilters;
</script>

{#if $allFeatures.length === 0}
  <p class="loading">Loading features…</p>
{:else}
  <div class="browser">
    <FeatureFilterPanel
      filters={catalogFilters}
      {phaseTags}
      resultCount={$filteredFeatures.length}
    />

    <div class="browser__results">
      <h2 class="results-count" role="status">
        {$filteredFeatures.length}
        {$filteredFeatures.length === 1 ? 'feature' : 'features'}
        {#if $filteredFeatures.length !== $allFeatures.length}
          <span class="results-count__total">of {$allFeatures.length}</span>
        {/if}
      </h2>

      <ActiveFilterChips filters={catalogFilters} {phaseTags} />

      {#if $filteredFeatures.length === 0}
        <p class="loading">No features match these filters.</p>
      {:else}
        <ul class="grid">
          {#each $filteredFeatures as feature (feature.id)}
            <li><FeatureCard {feature} href={`/features/${feature.id}/`} /></li>
          {/each}
        </ul>
      {/if}
    </div>
  </div>
{/if}

<style>
  .browser {
    display: grid;
    gap: var(--space-l);
    align-items: start;
  }

  @media (min-width: 48rem) {
    .browser {
      grid-template-columns: minmax(14rem, 18rem) 1fr;
      gap: var(--space-xl);
    }
  }

  .results-count {
    margin-block-end: var(--space-s);
    font-size: var(--font-size-l);
    font-weight: var(--font-weight-bold);
  }

  .results-count__total {
    font-weight: var(--font-weight-normal);
    color: var(--color-text-quiet);
  }

  .loading {
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
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 18rem), 1fr));
  }

  .grid > li {
    display: flex;
  }
</style>
