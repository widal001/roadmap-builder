<!--
  The chrome around the filter controls on the catalogue.

  A sidebar from tablet width up, where there's room for it to stay open. On a
  phone it collapses to a button that opens the same controls as a sheet, so
  the filters never eat the screen the results need.
-->
<script lang="ts">
  import FeatureFilters from '@/components/features/FeatureFilters.svelte';
  import type { FeatureFilterSurface } from '@/stores/filters';
  import type { Tag } from '@/types/domain';

  type Props = {
    filters: FeatureFilterSurface;
    phaseTags?: readonly Tag[];
    /** How many features match, shown on the sheet's confirm button. */
    resultCount: number;
  };

  let { filters, phaseTags = [], resultCount }: Props = $props();

  /** Only meaningful at phone width, where the panel is a sheet. */
  let sheetOpen = $state(false);

  const { filter } = filters;

  const activeCount = $derived(
    ($filter.search.trim() === '' ? 0 : 1) +
      $filter.milestoneTags.length +
      $filter.milestones.length +
      $filter.categories.length +
      $filter.statuses.length,
  );
</script>

<button
  type="button"
  class="button--secondary opener"
  aria-expanded={sheetOpen}
  onclick={() => (sheetOpen = true)}
>
  Filters{activeCount > 0 ? ` (${activeCount})` : ''}
</button>

<aside class="panel" class:panel--open={sheetOpen} aria-label="Filter features">
  <div class="panel__head">
    <h2>Filters</h2>
    <button
      type="button"
      class="panel__close"
      onclick={() => (sheetOpen = false)}
      aria-label="Close filters"
    >
      ×
    </button>
  </div>

  <div class="panel__body">
    <FeatureFilters {filters} {phaseTags} />
  </div>

  <div class="panel__foot">
    <button type="button" class="button" onclick={() => (sheetOpen = false)}>
      View {resultCount} result{resultCount === 1 ? '' : 's'}
    </button>
  </div>
</aside>

<style>
  /* Phone first: the panel is a sheet, opened by a button. */
  .opener {
    width: 100%;
    margin-block-end: var(--space-m);
  }

  .panel {
    position: fixed;
    inset: 0;
    z-index: 30;
    display: none;
    flex-direction: column;
    background-color: var(--color-surface);
    overflow-y: auto;
  }

  .panel--open {
    display: flex;
  }

  .panel__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-m);
    padding: var(--space-m);
    border-bottom: 1px solid var(--color-line);
  }

  .panel__head h2 {
    margin: 0;
    font-size: var(--font-size-l);
  }

  .panel__close {
    padding: 0 var(--space-xs);
    font-size: var(--font-size-2xl);
    line-height: 1;
    color: var(--color-text-quiet);
    background: none;
    border: 0;
    cursor: pointer;
  }

  .panel__body {
    flex: 1;
    padding: var(--space-m);
  }

  .panel__foot {
    position: sticky;
    bottom: 0;
    padding: var(--space-m);
    background-color: var(--color-surface);
    border-top: 1px solid var(--color-line);
  }

  .panel__foot .button {
    width: 100%;
  }

  /* From tablet up there's room to keep it open beside the results, so the
     sheet machinery drops away entirely. */
  @media (min-width: 48rem) {
    .opener,
    .panel__head,
    .panel__foot {
      display: none;
    }

    .panel {
      position: sticky;
      top: var(--space-m);
      inset-inline: auto;
      inset-block: auto;
      z-index: 1;
      display: block;
      max-height: calc(100vh - var(--space-xl));
      padding: var(--space-m);
      background-color: var(--color-surface-quiet);
      border-radius: var(--radius-panel);
    }

    .panel__body {
      padding: 0;
    }
  }
</style>
