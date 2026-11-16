<!--
  A summary of what's currently narrowing the list.

  The filter panel shows what could be chosen; this shows what has been, in one
  line, with each criterion removable where you're looking at the results
  rather than back in the panel.
-->
<script lang="ts">
  import { describeActiveFilters } from '@/lib/filters/describe-active-filters';
  import { menuMilestones } from '@/stores/roadmap';
  import type { ActiveFilterChip } from '@/lib/filters/describe-active-filters';
  import type { FeatureFilterSurface } from '@/stores/filters';
  import type { CategoryId } from '@/config/categories';
  import type { FeatureStatusId } from '@/config/statuses';
  import type { Tag } from '@/types/domain';
  import type { TagId } from '@/types/brand';

  type Props = {
    filters: FeatureFilterSurface;
    /** Tags used by milestones, so phase chips can be labelled. */
    phaseTags?: readonly Tag[];
  };

  let { filters, phaseTags = [] }: Props = $props();

  const { filter, hasActiveFilter } = filters;

  const chips = $derived(
    describeActiveFilters($filter, {
      milestones: $menuMilestones.map((suggestion) => suggestion.milestone),
      tags: phaseTags,
    }),
  );

  /** Each chip removes itself through the toggle that set it. */
  function remove(chip: ActiveFilterChip) {
    switch (chip.facet) {
      case 'search':
        return filters.setSearch('');
      case 'milestoneTags':
        return filters.toggleMilestoneTag(chip.value as TagId);
      case 'milestones':
        return filters.toggleMilestone(chip.value);
      case 'categories':
        return filters.toggleCategory(chip.value as CategoryId);
      case 'statuses':
        return filters.toggleStatus(chip.value as FeatureStatusId);
    }
  }
</script>

{#if $hasActiveFilter && chips.length > 0}
  <div class="active">
    <h2 class="visually-hidden">Active filters</h2>
    <ul class="active__list">
      {#each chips as chip (`${chip.facet}:${chip.value}`)}
        <li>
          <button type="button" class="chip" onclick={() => remove(chip)}>
            <span class="chip__group">{chip.group}</span>
            <span class="chip__label">{chip.label}</span>
            <span class="chip__remove" aria-hidden="true">×</span>
            <span class="visually-hidden">Remove this filter</span>
          </button>
        </li>
      {/each}
    </ul>
    <button type="button" class="button--quiet button--small" onclick={filters.clear}>
      Clear all
    </button>
  </div>
{/if}

<style>
  .active {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-xs);
    margin-block-end: var(--space-m);
  }

  .active__list {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2xs);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .chip {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2xs);
    padding: var(--space-3xs) var(--space-xs);
    font: inherit;
    font-size: var(--font-size-s);
    color: var(--color-text);
    background-color: var(--color-surface-selected);
    border: 1px solid var(--color-accent);
    border-radius: var(--radius-btn);
    cursor: pointer;
  }

  .chip:hover {
    background-color: var(--color-surface-sunk);
  }

  .chip__group {
    font-size: var(--font-size-xs);
    color: var(--color-text-quiet);
  }

  .chip__label {
    font-weight: var(--font-weight-semibold);
  }

  .chip__remove {
    font-size: var(--font-size-m);
    line-height: 1;
    color: var(--color-text-quiet);
  }
</style>
