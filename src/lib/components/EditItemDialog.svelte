<script lang="ts">
  // Dialog for editing an item's text
  import { X } from 'lucide-svelte';
  import type { Item } from '$lib/types';

  interface Props {
    item: Item | null;
    listName?: string;
    isOpen: boolean;
    onSave?: (itemId: number, newText: string) => Promise<void>;
    onClose?: () => void;
  }

  let { item, listName = '', isOpen, onSave, onClose }: Props = $props();

  // Local state for editing
  let editText = $state('');
  let isSaving = $state(false);

  // Update editText when item changes
  $effect(() => {
    if (item) {
      editText = item.text;
    }
  });

  // Handle save
  async function handleSave() {
    if (item && editText.trim() && !isSaving) {
      try {
        isSaving = true;
        await onSave?.(item.id, editText.trim());
        onClose?.();
      } catch (err) {
        console.error('Failed to save item:', err);
      } finally {
        isSaving = false;
      }
    }
  }

  // Handle cancel
  function handleCancel() {
    if (!isSaving) {
      onClose?.();
    }
  }

  // Handle backdrop click
  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget && !isSaving) {
      handleCancel();
    }
  }

  // Handle keyboard shortcuts
  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape' && !isSaving) {
      handleCancel();
    } else if (event.key === 'Enter' && !event.shiftKey && !isSaving) {
      event.preventDefault();
      handleSave();
    }
  }
</script>

{#if isOpen && item}
  <!-- Modal backdrop -->
  <div
    class="modal-backdrop"
    onclick={handleBackdropClick}
    role="presentation"
  >
    <!-- Modal dialog -->
    <div
      class="modal-dialog"
      role="dialog"
      aria-labelledby="edit-dialog-title"
      aria-modal="true"
    >
      <!-- Header -->
      <div class="modal-header">
        <h2 id="edit-dialog-title" class="modal-title">
          {#if listName}
            Edit Item - {listName}
          {:else}
            Edit Item
          {/if}
        </h2>
        <button
          type="button"
          class="close-button"
          onclick={handleCancel}
          aria-label="Close dialog"
        >
          <X size={20} />
        </button>
      </div>

      <!-- Content -->
      <div class="modal-content">
        <input
          type="text"
          class="edit-input"
          bind:value={editText}
          onkeydown={handleKeyDown}
          placeholder="Item text"
          autofocus
        />
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <button
          type="button"
          class="button button-secondary"
          onclick={handleCancel}
        >
          Cancel
        </button>
        <button
          type="button"
          class="button button-primary"
          onclick={handleSave}
          disabled={!editText.trim() || isSaving}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Modal backdrop */
  .modal-backdrop {
    /* Position */
    position: fixed;
    inset: 0;
    z-index: 1000;

    /* Layout */
    display: flex;
    align-items: center;
    justify-content: center;

    /* Background */
    background-color: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);

    /* Padding for mobile */
    padding: var(--space-4);
  }

  /* Modal dialog */
  .modal-dialog {
    /* Layout */
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 500px;
    max-height: 90vh;

    /* Style */
    background-color: var(--bg-primary);
    border-radius: var(--radius-lg);
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
                0 10px 10px -5px rgba(0, 0, 0, 0.04);

    /* Animation */
    animation: slideIn 0.2s ease-out;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(-10px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  /* Header */
  .modal-header {
    /* Layout */
    display: flex;
    align-items: center;
    justify-content: space-between;

    /* Spacing */
    padding: var(--space-6);
    padding-bottom: var(--space-4);

    /* Border */
    border-bottom: 1px solid var(--border-subtle);
  }

  .modal-title {
    /* Typography */
    font-size: var(--text-lg);
    font-weight: var(--font-semibold);
    color: var(--text-primary);

    /* Reset */
    margin: 0;
  }

  .close-button {
    /* Layout */
    display: flex;
    align-items: center;
    justify-content: center;

    /* Size */
    width: 32px;
    height: 32px;

    /* Style */
    border: none;
    border-radius: var(--radius-md);
    background-color: transparent;
    cursor: pointer;

    /* Color */
    color: var(--text-secondary);

    /* Transition */
    transition: background-color var(--transition-fast), color var(--transition-fast);

    /* Reset */
    padding: 0;
  }

  .close-button:hover {
    background-color: var(--bg-hover);
    color: var(--text-primary);
  }

  .close-button:focus-visible {
    outline: 2px solid var(--border-focus);
    outline-offset: 2px;
  }

  /* Content */
  .modal-content {
    /* Spacing */
    padding: var(--space-6);
  }

  .edit-input {
    /* Layout */
    width: 100%;

    /* Spacing */
    padding: var(--space-3) var(--space-4);

    /* Typography */
    font-size: var(--text-base);
    color: var(--text-primary);
    font-family: inherit;

    /* Style */
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    background-color: var(--bg-primary);

    /* Transition */
    transition: border-color var(--transition-fast);
  }

  .edit-input:hover {
    border-color: var(--border-hover);
  }

  .edit-input:focus {
    outline: none;
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .edit-input::placeholder {
    color: var(--text-muted);
  }

  /* Footer */
  .modal-footer {
    /* Layout */
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--space-3);

    /* Spacing */
    padding: var(--space-4) var(--space-6);
    padding-top: var(--space-4);

    /* Border */
    border-top: 1px solid var(--border-subtle);
  }

  /* Buttons */
  .button {
    /* Layout */
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);

    /* Spacing */
    padding: var(--space-2) var(--space-4);

    /* Typography */
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    font-family: inherit;

    /* Style */
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;

    /* Transition */
    transition: all var(--transition-fast);
  }

  .button:focus-visible {
    outline: 2px solid var(--border-focus);
    outline-offset: 2px;
  }

  .button-secondary {
    background-color: var(--bg-secondary);
    color: var(--text-primary);
  }

  .button-secondary:hover {
    background-color: var(--bg-hover);
  }

  .button-primary {
    background-color: var(--accent-primary);
    color: white;
  }

  .button-primary:hover {
    background-color: var(--accent-hover);
  }

  .button-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .button-primary:disabled:hover {
    background-color: var(--accent-primary);
  }
</style>
