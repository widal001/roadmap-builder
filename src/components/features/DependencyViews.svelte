<!--
  The dependency section of a feature's page.

  It holds the two directions, the two ways of reading them, and the join
  between the trees built at build time and what the client has changed since:
  a feature's status and the milestone it ended up in both come from the
  roadmap stores, read-only.

  The list is the baseline. It is server-rendered and works with no JavaScript,
  so the toggle only appears once this island has hydrated and the diagram it
  switches to can actually be drawn.
-->
<script lang="ts">
  import { onMount } from 'svelte';

  import DependencyGraph from './DependencyGraph.svelte';
  import DependencyToggle from './DependencyToggle.svelte';
  import DependencyTree from './DependencyTree.svelte';

  import {
    dependencyDirectionLabel,
    flattenDependencyTrees,
    type DependencyTree as DependencyTreeData,
  } from '@/lib/graph/build-dependency-tree';
  import {
    describeDependencyNode,
    describeDependencyTree,
    type DependencyNodeFacts,
    type MilestonePlacement,
  } from '@/lib/graph/describe-dependency-node';
  import { allFeatures, roadmapMilestones } from '@/stores/roadmap';
  import type { Feature } from '@/types/domain';

  type Props = {
    /** Everything that has to finish before this feature can. */
    upstream: DependencyTreeData | null;
    /** Everything waiting on this feature. */
    downstream: DependencyTreeData | null;
    /**
     * Milestone titles from the catalog, keyed by ID. Used to name the
     * milestone a feature is suggested for before the roadmap has loaded, and
     * for features the client hasn't chosen.
     */
    menuMilestoneTitles: Record<string, string>;
  };

  let { upstream, downstream, menuMilestoneTitles }: Props = $props();

  let mode = $state<'tree' | 'graph'>('tree');

  /*
   * The toggle is hidden until this runs, so a reader without JavaScript never
   * meets a control that can't do anything.
   */
  let isInteractive = $state(false);
  onMount(() => {
    isInteractive = true;
  });

  const rootFeature = $derived(upstream?.root.feature ?? downstream?.root.feature ?? null);

  /** Statuses the client has changed since the page was built. */
  const liveStatuses = $derived(
    new Map($allFeatures.map((feature) => [feature.id, feature.status])),
  );

  /** Where each feature sits in the roadmap the client has assembled. */
  const chosenPlacements = $derived(
    new Map<string, MilestonePlacement>(
      $roadmapMilestones.flatMap((chosen) =>
        chosen.features.map((feature): [string, MilestonePlacement] => [
          feature.id,
          { id: chosen.milestone.id, title: chosen.milestone.title, source: 'roadmap' },
        ]),
      ),
    ),
  );

  const upstreamRows = $derived(
    upstream ? describeDependencyTree(upstream.root, describe).children : [],
  );
  const downstreamRows = $derived(
    downstream ? describeDependencyTree(downstream.root, describe).children : [],
  );

  const slice = $derived(flattenDependencyTrees([upstream, downstream]));
  const graphNodes = $derived(slice.nodes.map(describe));

  /** With nothing on either side there is only one box, so there is nothing to draw. */
  const hasDependencies = $derived(upstreamRows.length > 0 || downstreamRows.length > 0);

  const graphDescription = $derived(
    `${upstream?.featureCount ?? 0} features ahead of this one and ` +
      `${downstream?.featureCount ?? 0} waiting on it. ` +
      'Each arrow points from a feature to the one it blocks.',
  );

  function describe(feature: Feature): DependencyNodeFacts {
    const status = liveStatuses.get(feature.id) ?? feature.status;
    const current = status === feature.status ? feature : { ...feature, status };

    return describeDependencyNode(current, placementOf(feature));
  }

  /**
   * The roadmap wins over the catalog: once the client has put a feature in a
   * milestone, that is where it is, whatever the content file suggested.
   */
  function placementOf(feature: Feature): MilestonePlacement | null {
    const chosen = chosenPlacements.get(feature.id);
    if (chosen) return chosen;

    if (!feature.milestoneId) return null;
    const title = menuMilestoneTitles[feature.milestoneId];

    return title ? { id: feature.milestoneId, title, source: 'menu' } : null;
  }
</script>

<section class="deps" aria-labelledby="dependencies-heading">
  <div class="deps__head">
    <h2 id="dependencies-heading">Dependencies</h2>
    {#if isInteractive && hasDependencies}
      <DependencyToggle {mode} onChange={(next) => (mode = next)} />
    {/if}
  </div>

  {#if mode === 'graph' && hasDependencies}
    <DependencyGraph
      nodes={graphNodes}
      edges={slice.edges}
      rootId={rootFeature?.id ?? ''}
      title={`Dependencies for ${rootFeature?.title ?? 'this feature'}`}
      description={graphDescription}
    />
  {:else}
    <div class="deps__columns">
      <section aria-labelledby="deps-upstream">
        <h3 id="deps-upstream">{dependencyDirectionLabel('upstream')}</h3>
        {#if upstreamRows.length > 0}
          <DependencyTree
            rows={upstreamRows}
            directionLabel={dependencyDirectionLabel('upstream')}
          />
        {:else}
          <p class="deps__none">Nothing has to happen first.</p>
        {/if}
      </section>

      <section aria-labelledby="deps-downstream">
        <h3 id="deps-downstream">{dependencyDirectionLabel('downstream')}</h3>
        {#if downstreamRows.length > 0}
          <DependencyTree
            rows={downstreamRows}
            directionLabel={dependencyDirectionLabel('downstream')}
          />
        {:else}
          <p class="deps__none">Nothing is waiting on this.</p>
        {/if}
      </section>
    </div>
  {/if}
</section>

<style>
  .deps__head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-s);
    margin-block-end: var(--space-m);
  }

  .deps__head h2 {
    margin: 0;
    font-size: var(--font-size-xl);
  }

  .deps__columns {
    display: grid;
    gap: var(--space-l);
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 20rem), 1fr));
  }

  .deps__columns h3 {
    margin-block-end: var(--space-xs);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-text-faint);
  }

  .deps__none {
    margin: 0;
    color: var(--color-text-quiet);
    font-size: var(--font-size-s);
  }
</style>
