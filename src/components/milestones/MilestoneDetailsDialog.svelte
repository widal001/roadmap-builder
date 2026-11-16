<!--
  The milestone's basics: name, what it covers, target date.

  The same dialog names a new milestone and edits an existing one, so there is
  one form for these fields rather than two that drift apart. It's a native
  <dialog>, which brings the focus trap, Escape and the backdrop with it.
-->
<script lang="ts">
  import type { MilestoneDetails } from '@/lib/roadmap/types';

  type Props = {
    open: boolean;
    /** A milestone that doesn't exist yet is being named, not edited. */
    isNew: boolean;
    title: string;
    description: string;
    /** `YYYY-MM-DD`, which is what a date input reads and writes. */
    deadline: string;
    onSave: (details: MilestoneDetails) => void;
    onClose: () => void;
  };

  let {
    open,
    isNew,
    title: savedTitle,
    description: savedDescription,
    deadline: savedDeadline,
    onSave,
    onClose,
  }: Props = $props();

  let dialog = $state<HTMLDialogElement | null>(null);
  let title = $state('');
  let description = $state('');
  let deadline = $state('');

  // Opening starts from what's saved, so a cancelled edit leaves no trace.
  $effect(() => {
    if (!dialog) return;

    if (open && !dialog.open) {
      title = savedTitle;
      description = savedDescription;
      deadline = savedDeadline;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  });

  function save(event: SubmitEvent) {
    event.preventDefault();
    if (title.trim() === '') return;

    onSave({
      title: title.trim(),
      description: description.trim(),
      deadline: deadline === '' ? null : deadline,
    });
  }
</script>

<dialog bind:this={dialog} class="dialog" onclose={onClose}>
  <form class="dialog__form" onsubmit={save}>
    <h2 class="dialog__heading">{isNew ? 'Name your milestone' : 'Milestone details'}</h2>

    <label class="field">
      <span class="field__label">Name</span>
      <input class="field__name" type="text" bind:value={title} required />
    </label>

    <label class="field">
      <span class="field__label">What it covers</span>
      <textarea rows="3" bind:value={description}></textarea>
    </label>

    <label class="field">
      <span class="field__label">Target date</span>
      <input type="date" bind:value={deadline} />
    </label>

    <div class="dialog__actions">
      <button type="button" class="button--quiet" onclick={onClose}>Cancel</button>
      <button type="submit" class="button">{isNew ? 'Start this milestone' : 'Save'}</button>
    </div>
  </form>
</dialog>

<style>
  .dialog {
    width: min(100%, 34rem);
    padding: 0;
    color: var(--color-text);
    background-color: var(--color-surface);
    border: 1px solid var(--color-line);
    border-radius: var(--radius-panel);
    box-shadow: var(--shadow-card-hover);
  }

  .dialog::backdrop {
    background-color: #0f1b2ab3;
  }

  .dialog__form {
    display: grid;
    gap: var(--space-m);
    padding: var(--space-l);
  }

  .dialog__heading {
    margin: 0;
    font-size: var(--font-size-xl);
  }

  .field {
    display: grid;
    gap: var(--space-2xs);
  }

  .field__label {
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-text-faint);
  }

  .field input,
  .field textarea {
    width: 100%;
    padding: var(--space-xs) var(--space-s);
    font: inherit;
    background-color: var(--color-surface);
    border: 1px solid var(--color-field-border);
    border-radius: var(--radius-btn);
  }

  /* You are naming something, not filling in a form field. */
  .field__name {
    font-size: var(--font-size-l);
    font-weight: var(--font-weight-semibold);
  }

  .dialog__actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: var(--space-s);
  }
</style>
