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
    showActions?: boolean;
    onToggle?: (id: number) => void;
    onEdit?: (id: number) => void;
    onDelete?: (id: number) => void;
    onActionToggle?: (shouldShow: boolean) => void;
  }

  let { item, showActions = false, onToggle, onEdit, onDelete, onActionToggle }: Props = $props();

  // Long press state
  let isDesktop = $state(false);
  let longPressTimer: ReturnType<typeof setTimeout> | null = null;
  let wasLongPress = $state(false);

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

    wasLongPress = false;

    // Don't trigger long press on checkbox
    const target = event.target as HTMLElement;
    if (target.closest('[data-slot="checkbox"]')) return;

    // If actions are already showing, toggle them off on long press
    if (showActions) {
      longPressTimer = setTimeout(() => {
        wasLongPress = true;
        onActionToggle?.(false);
      }, 500); // 500ms for long press
    } else {
      // Otherwise, show actions on long press
      longPressTimer = setTimeout(() => {
        wasLongPress = true;
        onActionToggle?.(true);
      }, 500); // 500ms for long press
    }
  }

  function handleTouchEnd() {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }

    // Reset wasLongPress after a short delay to allow click handler to check it
    setTimeout(() => {
      wasLongPress = false;
    }, 100);
  }

  function handleTouchMove() {
    // Cancel long press if user moves finger
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }

  function handleToggle() {
    onToggle?.(item.id);
    // Hide actions when checking/unchecking
    onActionToggle?.(false);
  }

  function handleEdit() {
    onEdit?.(item.id);
    onActionToggle?.(false);
  }

  // Handle regular click (tap) to hide actions on any item
  function handleItemClick(event: MouseEvent) {
    if (isDesktop) return;

    // Don't process click if it was a long press
    if (wasLongPress) {
      return;
    }

    // Don't hide if clicking on action buttons
    const target = event.target as HTMLElement;
    if (target.closest('.actions-mobile')) {
      return;
    }

    // Hide actions when clicking any item (including checkbox)
    onActionToggle?.(false);
  }

  function handleDelete() {
    onDelete?.(item.id);
  }

  // Handle checkbox change - call parent toggle handler
  function handleCheckboxChange(value: boolean | 'indeterminate') {
    // Only handle boolean values
    if (typeof value === 'boolean') {
      handleToggle();
    }
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="item-wrapper"
  class:show-actions={showActions}
  onclick={handleItemClick}
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
      checked={item.is_checked}
      onCheckedChange={handleCheckboxChange}
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

    /* Spacing */
    margin: 0 var(--space-3);

    /* Transition */
    transition: background-color var(--transition-fast);
  }

  .item-wrapper:hover {
    background-color: var(--bg-hover);
  }

  .item-content {
    /* Layout */
    display: flex;
    align-items: start;
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
      padding: var(--space-3) var(--space-4);
    }
  }

  /* Custom checkbox styling */
  :global(.checkbox-custom) {
    flex-shrink: 0;
    width: 24px !important;
    height: 24px !important;
    margin-top: 2px !important;
  }

  /* Increase checkmark icon size */
  :global(.checkbox-custom svg) {
    width: 18px !important;
    height: 18px !important;
  }

  /* Item text */
  .item-text {
    /* Layout */
    flex: 1;

    /* Typography */
    font-size: var(--text-base);
    color: var(--text-primary);
    line-height: var(--leading-normal);

    /* Text handling - allow wrapping on both mobile and desktop */
    white-space: normal;
    word-wrap: break-word;
    overflow-wrap: break-word;

    /* Limit to 2 lines */
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;

    /* Transition */
    transition: color var(--transition-fast);
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

  /* Action button colors - aligned with design system */
  :global(.action-button-edit) {
    /* Style */
    background-color: var(--bg-secondary) !important;
    color: var(--blue-medium) !important; /* Blue tint on mobile */
    border: 1px solid var(--border-subtle) !important;
    border-radius: var(--radius-md) !important;

    /* Transition */
    transition: all var(--transition-fast) !important;
  }

  /* Desktop: gray default, blue on hover */
  @media (min-width: 1024px) {
    :global(.action-button-edit) {
      color: var(--text-secondary) !important;
    }

    :global(.action-button-edit:hover) {
      background-color: var(--blue-medium) !important;
      color: var(--text-inverse) !important;
      border-color: var(--blue-medium) !important;
      box-shadow: var(--shadow-sm) !important;
      transform: scale(1.05) !important;
    }
  }

  :global(.action-button-edit:active) {
    transform: scale(0.98) !important;
  }

  :global(.action-button-delete) {
    /* Style */
    background-color: var(--bg-secondary) !important;
    color: var(--error) !important; /* Red tint on mobile */
    border: 1px solid var(--border-subtle) !important;
    border-radius: var(--radius-md) !important;

    /* Transition */
    transition: all var(--transition-fast) !important;
  }

  /* Desktop: gray default, red on hover */
  @media (min-width: 1024px) {
    :global(.action-button-delete) {
      color: var(--text-secondary) !important;
    }

    :global(.action-button-delete:hover) {
      background-color: var(--error) !important;
      color: var(--text-inverse) !important;
      border-color: var(--error) !important;
      box-shadow: var(--shadow-sm) !important;
      transform: scale(1.05) !important;
    }
  }

  :global(.action-button-delete:active) {
    transform: scale(0.98) !important;
  }

  /* Touch feedback for mobile */
  @media (hover: none) {
    .item-wrapper:active {
      background-color: var(--bg-hover);
    }
  }
</style>
