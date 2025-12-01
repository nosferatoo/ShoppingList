<script lang="ts">
  // List item with checkbox, text, and swipe/hover actions
  // Mobile: Swipe to reveal edit/delete
  // Desktop: Hover to show actions

  import { Check, Pencil, Trash2 } from 'lucide-svelte';
  import { panComposition as pan } from 'svelte-gestures';
  import type { Item } from '$lib/types';

  interface Props {
    item: Item;
    onToggle?: (id: number) => void;
    onEdit?: (id: number) => void;
    onDelete?: (id: number) => void;
  }

  let { item, onToggle, onEdit, onDelete }: Props = $props();

  // Swipe state
  let swipeOffset = $state(0);
  let isSwiped = $state(false);
  let isDesktop = $state(false);

  // Detect desktop on mount
  $effect(() => {
    if (typeof window !== 'undefined') {
      const checkDesktop = () => {
        isDesktop = window.matchMedia('(min-width: 1024px)').matches;
      };
      checkDesktop();
      window.addEventListener('resize', checkDesktop);
      return () => window.removeEventListener('resize', checkDesktop);
    }
  });

  // Handle pan gesture (swipe)
  function handlePan(event: CustomEvent) {
    if (isDesktop) return; // No swipe on desktop

    const { detail } = event;

    if (detail.direction === 'left') {
      // Swipe left to reveal actions
      const offset = Math.max(-100, Math.min(0, detail.x));
      swipeOffset = offset;
      isSwiped = offset < -30; // Threshold for "swiped"
    } else if (detail.direction === 'right' && isSwiped) {
      // Swipe right to close
      swipeOffset = 0;
      isSwiped = false;
    }
  }

  function handlePanEnd(event: CustomEvent) {
    if (isDesktop) return;

    const { detail } = event;

    // Snap to open or closed
    if (detail.x < -30) {
      swipeOffset = -100;
      isSwiped = true;
    } else {
      swipeOffset = 0;
      isSwiped = false;
    }
  }

  function handleToggle() {
    onToggle?.(item.id);
  }

  function handleEdit() {
    onEdit?.(item.id);
    // Close swipe after action
    swipeOffset = 0;
    isSwiped = false;
  }

  function handleDelete() {
    onDelete?.(item.id);
    // No need to close swipe, item will be removed
  }
</script>

<div
  class="item-wrapper"
  class:swiped={isSwiped}
>
  <!-- Main item content -->
  <div
    class="item-content"
    style="transform: translateX({swipeOffset}px)"
    use:pan
    onpan={handlePan}
    onpanend={handlePanEnd}
  >
    <!-- Checkbox -->
    <button
      type="button"
      class="checkbox"
      class:checked={item.is_checked}
      onclick={handleToggle}
      aria-label={item.is_checked ? 'Uncheck item' : 'Check item'}
    >
      {#if item.is_checked}
        <Check size={18} strokeWidth={3} />
      {/if}
    </button>

    <!-- Item text -->
    <span
      class="item-text"
      class:checked={item.is_checked}
    >
      {item.text}
    </span>

    <!-- Action buttons (desktop hover) -->
    <div class="actions-desktop">
      <button
        type="button"
        class="action-button edit"
        onclick={handleEdit}
        aria-label="Edit item"
      >
        <Pencil size={18} />
      </button>

      <button
        type="button"
        class="action-button delete"
        onclick={handleDelete}
        aria-label="Delete item"
      >
        <Trash2 size={18} />
      </button>
    </div>
  </div>

  <!-- Action buttons (mobile swipe) -->
  <div class="actions-mobile">
    <button
      type="button"
      class="action-button edit"
      onclick={handleEdit}
      aria-label="Edit item"
    >
      <Pencil size={18} />
    </button>

    <button
      type="button"
      class="action-button delete"
      onclick={handleDelete}
      aria-label="Delete item"
    >
      <Trash2 size={18} />
    </button>
  </div>
</div>

<style>
  .item-wrapper {
    /* Layout */
    position: relative;
    overflow: hidden;

    /* Border */
    border-bottom: 1px solid var(--border-subtle);

    /* Transition */
    transition: background-color var(--transition-fast);
  }

  .item-wrapper:hover {
    background-color: var(--bg-hover);
  }

  .item-content {
    /* Layout */
    display: flex;
    align-items: center;
    gap: var(--space-3);

    /* Size */
    min-height: 48px;
    position: relative;
    z-index: 1;

    /* Spacing */
    padding: var(--space-3) var(--space-4);

    /* Background */
    background-color: var(--bg-primary);

    /* Transition */
    transition: transform var(--transition-normal);
  }

  @media (min-width: 1024px) {
    .item-content {
      align-items: flex-start;
      padding: var(--space-3) var(--space-4);
    }
  }

  /* Checkbox */
  .checkbox {
    /* Layout */
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    /* Size */
    width: 24px;
    height: 24px;

    /* Style */
    border: 2px solid var(--border-default);
    border-radius: var(--radius-sm);
    background-color: transparent;
    cursor: pointer;

    /* Color */
    color: var(--text-inverse);

    /* Transition */
    transition: all var(--transition-fast);

    /* Reset */
    padding: 0;
  }

  @media (min-width: 1024px) {
    .checkbox {
      margin-top: 2px;
    }
  }

  .checkbox:hover {
    border-color: var(--accent-primary);
  }

  .checkbox.checked {
    background-color: var(--accent-primary);
    border-color: var(--accent-primary);
  }

  .checkbox:focus-visible {
    outline: 2px solid var(--border-focus);
    outline-offset: 2px;
  }

  /* Item text */
  .item-text {
    /* Layout */
    flex: 1;

    /* Typography */
    font-size: var(--text-base);
    color: var(--text-primary);
    line-height: var(--leading-normal);

    /* Text handling */
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    /* Transition */
    transition: color var(--transition-fast);
  }

  @media (min-width: 1024px) {
    .item-text {
      /* Allow wrapping on desktop */
      white-space: normal;
      word-wrap: break-word;
      overflow-wrap: break-word;

      /* Limit to 2 lines */
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  }

  .item-text.checked {
    color: var(--text-secondary);
  }

  /* Desktop actions (hover to reveal) */
  .actions-desktop {
    /* Layout */
    display: none;
    align-items: center;
    gap: var(--space-2);

    /* Animation */
    opacity: 0;
    pointer-events: none;
    transition: opacity var(--transition-fast);
  }

  @media (min-width: 1024px) {
    .actions-desktop {
      display: flex;
    }

    .item-wrapper:hover .actions-desktop {
      opacity: 1;
      pointer-events: auto;
    }
  }

  /* Mobile actions (swipe to reveal) */
  .actions-mobile {
    /* Layout */
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    z-index: 0;

    /* Layout */
    display: flex;
    align-items: center;
  }

  @media (min-width: 1024px) {
    .actions-mobile {
      display: none;
    }
  }

  /* Action buttons */
  .action-button {
    /* Layout */
    display: flex;
    align-items: center;
    justify-content: center;

    /* Size */
    width: 48px;
    height: 48px;
    min-width: 48px;

    /* Style */
    border: none;
    cursor: pointer;

    /* Color */
    color: white;

    /* Transition */
    transition: opacity var(--transition-fast);

    /* Reset */
    padding: 0;
  }

  .action-button:active {
    opacity: 0.8;
  }

  .action-button.edit {
    background-color: var(--blue-medium);
  }

  .action-button.delete {
    background-color: var(--error);
  }

  /* Desktop action button styling */
  @media (min-width: 1024px) {
    .action-button {
      width: 40px;
      height: 40px;
      min-width: 40px;
      background: none;
      border-radius: var(--radius-md);
      transition: color var(--transition-fast),
                  background-color var(--transition-fast);
    }

    .action-button.edit {
      color: #6b9bd1;
      background: none;
    }

    .action-button.edit:hover {
      color: #3b82f6;
      background-color: rgba(59, 130, 246, 0.1);
    }

    .action-button.delete {
      color: #e89090;
      background: none;
    }

    .action-button.delete:hover {
      color: #ef4444;
      background-color: rgba(239, 68, 68, 0.1);
    }

    .action-button:focus-visible {
      outline: 2px solid var(--border-focus);
      outline-offset: 2px;
    }
  }

  /* Touch feedback for mobile */
  @media (hover: none) {
    .item-wrapper:active {
      background-color: var(--bg-hover);
    }
  }
</style>
