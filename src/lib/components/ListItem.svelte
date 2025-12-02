<script lang="ts">
  // List item with checkbox, text, and long-press/hover actions
  // Mobile: Long press to reveal edit/delete
  // Desktop: Hover to show actions

  import { Pencil, Trash2 } from 'lucide-svelte';
  import { Button } from '$lib/components/ui/button';
  import { Checkbox } from '$lib/components/ui/checkbox';
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
    if (target.closest('[data-slot="checkbox"]')) return;

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

  // Local checked state for checkbox
  let checked = $state(item.is_checked);

  // Update checked when item changes
  $effect(() => {
    checked = item.is_checked;
  });

  // Handle checkbox change
  function handleCheckboxChange() {
    handleToggle();
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
    <Checkbox
      bind:checked
      onchange={handleCheckboxChange}
      class="checkbox-custom"
      aria-label={item.is_checked ? 'Uncheck item' : 'Check item'}
    />

    <!-- Item text -->
    <span
      class="item-text"
      class:checked={item.is_checked}
    >
      {item.text}
    </span>

    <!-- Action buttons (desktop hover) -->
    <div class="actions-desktop">
      <Button
        variant="ghost"
        size="icon-sm"
        class="action-button-edit"
        onclick={handleEdit}
        aria-label="Edit item"
      >
        <Pencil size={18} />
      </Button>

      <Button
        variant="ghost"
        size="icon-sm"
        class="action-button-delete"
        onclick={handleDelete}
        aria-label="Delete item"
      >
        <Trash2 size={18} />
      </Button>
    </div>
  </div>

  <!-- Action buttons (mobile long press) -->
  <div class="actions-mobile">
    <Button
      variant="ghost"
      size="icon"
      class="action-button-edit"
      onclick={handleEdit}
      aria-label="Edit item"
    >
      <Pencil size={18} />
    </Button>

    <Button
      variant="ghost"
      size="icon"
      class="action-button-delete"
      onclick={handleDelete}
      aria-label="Delete item"
    >
      <Trash2 size={18} />
    </Button>
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

  /* Custom checkbox styling */
  :global(.checkbox-custom) {
    flex-shrink: 0;
  }

  @media (min-width: 1024px) {
    :global(.checkbox-custom) {
      margin-top: 2px;
    }
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

  /* Action button colors */
  :global(.action-button-edit) {
    color: #6b9bd1 !important;
  }

  :global(.action-button-edit:hover) {
    color: #3b82f6 !important;
    background-color: rgba(59, 130, 246, 0.1) !important;
  }

  :global(.action-button-delete) {
    color: #e89090 !important;
  }

  :global(.action-button-delete:hover) {
    color: #ef4444 !important;
    background-color: rgba(239, 68, 68, 0.1) !important;
  }

  /* Touch feedback for mobile */
  @media (hover: none) {
    .item-wrapper:active {
      background-color: var(--bg-hover);
    }
  }
</style>
