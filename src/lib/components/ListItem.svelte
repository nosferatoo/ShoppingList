<script lang="ts">
  // List item with checkbox, text, and long-press/hover actions
  // Mobile: Long press to reveal edit/delete
  // Desktop: Hover to show actions

  import { Check, Pencil, Trash2 } from 'lucide-svelte';
  import type { Item } from '$lib/types';

  interface Props {
    item: Item;
    onToggle?: (id: number) => void;
    onEdit?: (id: number) => void;
    onDelete?: (id: number) => void;
  }

  let { item, onToggle, onEdit, onDelete }: Props = $props();

  // Long press state
  let showActions = $state(false);
  let isDesktop = $state(false);
  let longPressTimer: ReturnType<typeof setTimeout> | null = null;

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

  // Long press detection
  function handleTouchStart(event: TouchEvent) {
    if (isDesktop) return;

    // Don't trigger long press on checkbox
    const target = event.target as HTMLElement;
    if (target.closest('.checkbox')) return;

    // If actions are already showing, toggle them off on long press
    if (showActions) {
      longPressTimer = setTimeout(() => {
        showActions = false;
      }, 500); // 500ms for long press
    } else {
      // Otherwise, show actions on long press
      longPressTimer = setTimeout(() => {
        showActions = true;
      }, 500); // 500ms for long press
    }
  }

  function handleTouchEnd() {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }

  function handleTouchMove() {
    // Cancel long press if user moves finger
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }

  // Close actions when clicking outside
  function handleClickOutside(event: MouseEvent) {
    if (!isDesktop && showActions) {
      const target = event.target as HTMLElement;
      if (!target.closest('.item-wrapper')) {
        showActions = false;
      }
    }
  }

  // Add global click listener
  $effect(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('click', handleClickOutside);
      return () => window.removeEventListener('click', handleClickOutside);
    }
  });

  function handleToggle() {
    onToggle?.(item.id);
  }

  function handleEdit() {
    onEdit?.(item.id);
    showActions = false;
  }

  function handleDelete() {
    onDelete?.(item.id);
  }
</script>

<div
  class="item-wrapper"
  class:show-actions={showActions}
>
  <!-- Main item content -->
  <div
    class="item-content"
    ontouchstart={handleTouchStart}
    ontouchend={handleTouchEnd}
    ontouchmove={handleTouchMove}
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

  <!-- Action buttons (mobile long press) -->
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

  /* Mobile actions (long press to reveal) */
  .actions-mobile {
    /* Layout */
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    z-index: 2;

    /* Layout */
    display: flex;
    align-items: center;

    /* Hidden by default */
    opacity: 0;
    pointer-events: none;
    transform: translateX(20px);
    transition: opacity var(--transition-fast),
                transform var(--transition-fast);
  }

  .item-wrapper.show-actions .actions-mobile {
    opacity: 1;
    pointer-events: auto;
    transform: translateX(0);
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
    background: none;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;

    /* Transition */
    transition: color var(--transition-fast),
                background-color var(--transition-fast),
                opacity var(--transition-fast);

    /* Reset */
    padding: 0;
  }

  .action-button:active {
    opacity: 0.8;
  }

  .action-button.edit {
    color: #6b9bd1;
    background: none;
  }

  .action-button.edit:active {
    color: #3b82f6;
    background-color: rgba(59, 130, 246, 0.1);
  }

  .action-button.delete {
    color: #e89090;
    background: none;
  }

  .action-button.delete:active {
    color: #ef4444;
    background-color: rgba(239, 68, 68, 0.1);
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
