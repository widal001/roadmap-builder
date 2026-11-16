<!--
  Switches between the two ways of reading a feature's dependencies.

  Two real buttons rather than a styled checkbox, so the control is reachable
  and operable from the keyboard without any handling of our own. The chosen
  view is the primary button and the other is secondary, so the current state
  is carried by the shape of the control as well as by aria-pressed.
-->
<script lang="ts">
  type Props = {
    mode: 'tree' | 'graph';
    onChange: (mode: 'tree' | 'graph') => void;
  };

  let { mode, onChange }: Props = $props();

  const VIEWS = [
    { id: 'tree', label: 'List' },
    { id: 'graph', label: 'Diagram' },
  ] as const;
</script>

<div class="toggle" role="group" aria-label="How to show dependencies">
  {#each VIEWS as view (view.id)}
    <button
      type="button"
      class={mode === view.id ? 'button button--small' : 'button--secondary button--small'}
      aria-pressed={mode === view.id}
      onclick={() => onChange(view.id)}
    >
      {view.label}
    </button>
  {/each}
</div>

<style>
  .toggle {
    display: flex;
    gap: var(--space-2xs);
  }
</style>
