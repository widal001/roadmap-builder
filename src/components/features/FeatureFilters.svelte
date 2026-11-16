<!--
  The filter controls.

  Just the controls: the chrome around them differs by context. On the
  catalogue they sit in a sidebar panel; in the milestone picker they sit
  inline, where `compact` folds the secondary facets behind a disclosure.

  Every option carries a count of what it would match, so someone can see what
  a choice is worth before making it rather than selecting something and
  finding it returns nothing.
-->
<script lang="ts">
  import { menuMilestones } from '@/stores/roadmap';
  import { CATEGORIES } from '@/config/categories';
  import { FEATURE_STATUSES } from '@/config/statuses';
  import { UNASSIGNED } from '@/lib/filters/filter-features';
  import type { FeatureFilterSurface } from '@/stores/filters';
  import type { Tag } from '@/types/domain';

  type Props = {
    /** The surface whose filter these controls change. */
    filters: FeatureFilterSurface;
    /** Tags used by milestones, so phase filters can be labelled. */
    phaseTags?: readonly Tag[];
    /** Folds the secondary facets behind a disclosure, for inline use. */
    compact?: boolean;
  };

  let { filters, phaseTags = [], compact = false }: Props = $props();

  const { filter, hasActiveFilter, counts } = filters;

  const milestoneOptions = $derived([
    ...$menuMilestones.map((suggestion) => ({
      id: suggestion.milestone.id as string,
      label: suggestion.milestone.title,
    })),
    { id: UNASSIGNED, label: 'No milestone' },
  ]);
</script>

<div class="filters">
  <label class="filters__search">
    <span class="visually-hidden">Search features by title</span>
    <input
      type="search"
      placeholder="Search features…"
      value={$filter.search}
      oninput={(event) => filters.setSearch(event.currentTarget.value)}
    />
  </label>

  {#if phaseTags.length > 0}
    <fieldset class="group">
      <legend>Phase</legend>
      {#each phaseTags as tag (tag.id)}
        <label class="option">
          <input
            type="checkbox"
            checked={$filter.milestoneTags.includes(tag.id)}
            onchange={() => filters.toggleMilestoneTag(tag.id)}
          />
          <span class="option__label">{tag.label}</span>
          <span class="option__count">{$counts.milestoneTags.get(tag.id) ?? 0}</span>
        </label>
      {/each}
    </fieldset>
  {/if}

  <details class="secondary" open={!compact}>
    <summary class:visually-hidden={!compact}>More filters</summary>

    <fieldset class="group">
      <legend>Milestone</legend>
      {#each milestoneOptions as option (option.id)}
        <label class="option">
          <input
            type="checkbox"
            checked={$filter.milestones.includes(option.id)}
            onchange={() => filters.toggleMilestone(option.id)}
          />
          <span class="option__label">{option.label}</span>
          <span class="option__count">{$counts.milestones.get(option.id) ?? 0}</span>
        </label>
      {/each}
    </fieldset>

    <fieldset class="group">
      <legend>Category</legend>
      {#each CATEGORIES as category (category.id)}
        <label class="option">
          <input
            type="checkbox"
            checked={$filter.categories.includes(category.id)}
            onchange={() => filters.toggleCategory(category.id)}
          />
          <span class="option__label">{category.label}</span>
          <span class="option__count">{$counts.categories.get(category.id) ?? 0}</span>
        </label>
      {/each}
    </fieldset>

    <fieldset class="group">
      <legend>Status</legend>
      {#each FEATURE_STATUSES as status (status.id)}
        <label class="option">
          <input
            type="checkbox"
            checked={$filter.statuses.includes(status.id)}
            onchange={() => filters.toggleStatus(status.id)}
          />
          <span class="option__label">{status.label}</span>
          <span class="option__count">{$counts.statuses.get(status.id) ?? 0}</span>
        </label>
      {/each}
    </fieldset>
  </details>

  {#if $hasActiveFilter}
    <button
      type="button"
      class="button--quiet button--small filters__clear"
      onclick={filters.clear}
    >
      Clear all filters
    </button>
  {/if}
</div>

<style>
  .filters {
    display: flex;
    flex-direction: column;
    gap: var(--space-l);
  }

  .filters__search input {
    width: 100%;
    padding: var(--space-xs) var(--space-s);
    background-color: var(--color-surface);
    border: 1px solid var(--color-field-border);
    border-radius: var(--radius-btn);
  }

  .secondary {
    display: flex;
    flex-direction: column;
    gap: var(--space-l);
  }

  .secondary > summary {
    font-size: var(--font-size-s);
    font-weight: var(--font-weight-semibold);
    cursor: pointer;
  }

  .group {
    display: flex;
    flex-direction: column;
    gap: var(--space-3xs);
    margin: 0;
    padding: 0;
    border: 0;
  }

  legend {
    padding: 0 0 var(--space-2xs);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-text-faint);
  }

  /* A full-width row, so the count lines up down the right-hand edge and the
     whole row is a click target rather than just the label text. */
  .option {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    padding: var(--space-3xs) var(--space-2xs);
    font-size: var(--font-size-s);
    border-radius: var(--radius-btn);
    cursor: pointer;
  }

  .option:hover {
    background-color: var(--color-surface-sunk);
  }

  .option:has(input:checked) {
    font-weight: var(--font-weight-semibold);
  }

  .option:has(input:focus-visible) {
    outline: 2px solid var(--color-focus);
    outline-offset: 1px;
  }

  .option__label {
    flex: 1;
  }

  .option__count {
    font-variant-numeric: tabular-nums;
    font-size: var(--font-size-xs);
    color: var(--color-text-faint);
  }

  .option:has(input:checked) .option__count {
    color: var(--color-text-quiet);
  }

  .filters__clear {
    align-self: flex-start;
  }
</style>
