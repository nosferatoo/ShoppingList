<script lang="ts">
  // List card component - displays a list with items and input
  // Shows list header, add item input, and sorted items

  import { ShoppingCart, CheckCircle, Plus } from 'lucide-svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
  } from '$lib/components/ui/card';
  import ListItem from './ListItem.svelte';
  import type { List, Item } from '$lib/types';
  import { isActiveItem } from '$lib/types';

  interface Props {
    list: List;
    items: Item[];
    userId: string;
    resetActionsTrigger?: number;
    onAddItem?: (listId: number, text: string) => void;
    onToggleItem?: (id: number) => void;
    onEditItem?: (id: number) => void;
    onDeleteItem?: (id: number) => void;
  }

  let {
    list,
    items,
    userId,
    resetActionsTrigger = 0,
    onAddItem,
    onToggleItem,
    onEditItem,
    onDeleteItem
  }: Props = $props();

  // Helper function to check if current user is the owner
  function isOwner(): boolean {
    return list.owner_id === userId;
  }

  // Input state
  let newItemText = $state('');
  let isAdding = $state(false);
  let inputElement: HTMLInputElement | null = $state(null);

  // Track which item has actions showing (mobile long-press)
  let activeItemId = $state<number | null>(null);

  // Handle item action visibility
  function handleItemActionToggle(itemId: number, shouldShow: boolean) {
    activeItemId = shouldShow ? itemId : null;
  }

  // Reset actions when resetActionsTrigger changes (e.g., on swipe)
  $effect(() => {
    // Watch for changes to resetActionsTrigger
    if (resetActionsTrigger > 0) {
      activeItemId = null;
    }
  });

  // Sorted items
  let activeItems = $derived(items.filter(isActiveItem));

  // Filter items based on input text (only show items that start with the entered text)
  let filteredItems = $derived.by(() => {
    const searchText = newItemText.trim().toLowerCase();

    // If no search text, return all items
    if (!searchText) {
      return activeItems;
    }

    // Filter items that start with the search text (case-insensitive)
    return activeItems.filter(item =>
      item.text.toLowerCase().startsWith(searchText)
    );
  });

  let uncheckedItems = $derived(
    filteredItems
      .filter(item => !item.is_checked)
      .sort((a, b) => a.text.localeCompare(b.text))
  );

  let checkedItems = $derived(
    filteredItems
      .filter(item => item.is_checked)
      .sort((a, b) => a.text.localeCompare(b.text))
  );

  // Item counts for display
  let totalCount = $derived(activeItems.length);
  let checkedCount = $derived(checkedItems.length);

  // Handle add item
  async function handleAddItem(e: Event) {
    e.preventDefault();

    const text = newItemText.trim();
    if (!text) return;

    isAdding = true;

    try {
      await onAddItem?.(list.id, text);
      newItemText = ''; // Clear input on success

      // Auto-focus for continued input
      setTimeout(() => {
        inputElement?.focus();
      }, 0);
    } catch (error: any) {
      // Check if error is a duplicate constraint violation (code 23505 for PostgreSQL unique_violation)
      const isDuplicateError = error?.code === '23505' || error?.message?.includes('duplicate') || error?.message?.includes('unique');

      if (isDuplicateError) {
        // Silent handling as per requirements - just clear the input
        newItemText = '';
        // Also refocus on duplicate error
        setTimeout(() => {
          inputElement?.focus();
        }, 0);
      } else {
        // Log other errors but still clear the input to unblock the UI
        console.error('Failed to add item:', error);
        newItemText = '';
        // Refocus even on error
        setTimeout(() => {
          inputElement?.focus();
        }, 0);
      }
    } finally {
      isAdding = false;
    }
  }
</script>

<Card class="list-card">
  <!-- Header (desktop only) -->
  <CardHeader class="card-header">
    <div class="header-left">
      <!-- List type icon -->
      {#if list.type === 'shopping'}
        <ShoppingCart size={20} class="list-icon" />
      {:else}
        <CheckCircle size={20} class="list-icon" />
      {/if}

      <!-- Title and count stacked -->
      <div class="header-title-section">
        <!-- List title -->
        <CardTitle class="list-title">{list.title}</CardTitle>

        <!-- Item count -->
        <span class="item-count">
          {#if totalCount === 0}
            0 items
          {:else}
            {checkedCount} of {totalCount} completed
          {/if}
        </span>
      </div>
    </div>

    <!-- Shared badge -->
    {#if list.is_shared && !isOwner()}
      <span class="shared-badge shared-with-me">Shared with you</span>
    {:else if list.is_shared}
      <span class="shared-badge">Shared</span>
    {/if}

    <!-- Add item form - Integrated input with button -->
    <form class="add-item-form" onsubmit={handleAddItem}>
      <div class="input-with-button">
        <Input
          type="text"
          class="add-item-input"
          placeholder="Add item..."
          bind:value={newItemText}
          bind:ref={inputElement}
          disabled={isAdding}
          aria-label="Add new item"
        />
        <Button
          type="submit"
          size="icon"
          variant="ghost"
          class="add-button-integrated"
          disabled={isAdding || !newItemText.trim()}
          aria-label="Add item"
        >
          <Plus size={20} />
        </Button>
      </div>
    </form>
  </CardHeader>

  <CardContent class="card-content">

    <!-- Items list -->
    <div class="items-container {totalCount === 0 ? 'no-items' : ''}" data-scroll-container>
      {#if uncheckedItems.length === 0 && checkedItems.length === 0}
        <!-- Empty state -->
        <div class="empty-state">
          <p class="empty-text">No items yet</p>
        </div>
      {:else}
        <!-- Unchecked items -->
        {#each uncheckedItems as item (item.id)}
          <ListItem
            {item}
            showActions={activeItemId === item.id}
            onToggle={onToggleItem}
            onEdit={onEditItem}
            onDelete={onDeleteItem}
            onActionToggle={(shouldShow) => handleItemActionToggle(item.id, shouldShow)}
          />
        {/each}

        <!-- Separator between unchecked and checked -->
        {#if uncheckedItems.length > 0 && checkedItems.length > 0}
          <div class="separator"></div>
        {/if}

        <!-- Checked items -->
        {#each checkedItems as item (item.id)}
          <ListItem
            {item}
            showActions={activeItemId === item.id}
            onToggle={onToggleItem}
            onEdit={onEditItem}
            onDelete={onDeleteItem}
            onActionToggle={(shouldShow) => handleItemActionToggle(item.id, shouldShow)}
          />
        {/each}
      {/if}
    </div>
  </CardContent>
</Card>

<style>
  :global(.list-card) {
    /* Layout */
    display: flex;
    flex-direction: column;
    flex-shrink: 0;

    /* Size */
    min-width: 300px;
    max-width: 600px;
    width: 100%;

    /* Overflow */
    overflow: hidden;
  }

  /* Desktop: fixed width to prevent shrinking during content changes */
  @media (min-width: 1024px) {
    :global(.list-card) {
      width: 600px;
      gap: var(--space-2) !important; /* Reduce gap between header and content */

      /* Semi-transparent background with subtle glass effect */
      background-color: rgba(26, 26, 26, 0.85) !important;
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);

      /* Enhanced border for glass effect */
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
  }

  /* Chrome desktop: remove backdrop-filter to avoid double-compositing with aurora */
  @media (min-width: 1024px) {
    :global(.chromium) :global(.list-card) {
      background-color: rgba(26, 26, 26, 0.95) !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
    }
  }

  /* Mobile: grid with sticky header */
  @media (max-width: 1023px) {
    :global(.list-card) {
      max-width: unset;
      border-radius: 0;
      border: none !important;
      box-shadow: none;

      /* Grid layout - header (auto) + content (fill remaining) */
      display: grid !important;
      grid-template-rows: auto minmax(0, 1fr);
      height: 100%;
      overflow: hidden;
      position: relative;

      /* Remove all padding and gap */
      padding: 0 !important;
      gap: 0 !important;
    }
  }

  /* Header */
  :global(.card-header) {
    /* Layout */
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
  }

  /* Mobile: sticky header with flex wrap layout */
  @media (max-width: 1023px) {
    :global(.card-header) {
      /* Sticky positioning at top of scroll container */
      position: sticky;
      top: 0;
      left: 0;
      right: 0;
      z-index: 100;

      /* Flex row with wrap - allows form to wrap to next line */
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);

      /* Background and padding */
      background-color: var(--bg-primary);
      padding: var(--space-4) var(--space-3);

      /* PREVENT SCROLLING ON HEADER - Modern CSS approach */
      touch-action: none; /* Prevents all touch gestures (pan, zoom) */
      -webkit-overflow-scrolling: auto; /* Disable momentum scrolling on iOS */
      overscroll-behavior: none; /* Prevent scroll chaining */

      /* Additional iOS compatibility */
      -webkit-touch-callout: none; /* Disable iOS callout */
      -webkit-user-select: none; /* Prevent text selection on touch */
      user-select: none;
    }
  }

  .header-left {
    /* Layout */
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
    flex: 1;
    min-width: 0; /* Allow text truncation */
  }

  @media (max-width: 1023px) {
    .header-left {
      order: 1;
    }
  }

  /* Class is applied to Lucide icon components */
  :global(.list-icon) {
    /* Color */
    color: var(--text-secondary);
    flex-shrink: 0;
    margin-top: 2px; /* Align with title text */
  }

  .header-title-section {
    /* Layout */
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    flex: 1;
    min-width: 0; /* Allow text truncation */
  }

  :global(.list-title) {
    /* Text handling */
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .item-count {
    /* Typography */
    font-size: var(--text-sm);
    color: var(--text-muted);
  }

  .shared-badge {
    /* Layout */
    flex-shrink: 0;

    /* Typography */
    font-size: var(--text-xs);
    color: var(--text-secondary);

    /* Style */
    background-color: var(--bg-tertiary);
    border-radius: var(--radius-sm);
    padding: var(--space-1) var(--space-2);
  }

  @media (max-width: 1023px) {
    .shared-badge {
      order: 2;
    }
  }

  :global(.card-content) {
    /* Layout */
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 0 var(--space-4) 0 !important;
  }

  @media (max-width: 1023px) {
    :global(.card-content) {
      padding: 0 var(--space-3) 0 !important;

      /* No extra top padding needed with sticky header */

      /* No grid needed - just contains items-container */
      display: flex !important;
      flex-direction: column;
      overflow: hidden;
      min-height: 0;
      height: 100%;

      /* Ensure it stays below header */
      position: relative;
      z-index: 1;
    }
  }

  /* Add item form */
  .add-item-form {
    /* Spacing */
    margin-bottom: var(--space-1);
  }

  /* Desktop: full width to wrap to next line below header info */
  @media (min-width: 1024px) {
    .add-item-form {
      width: 100%;
      flex-basis: 100%;
      order: 10; /* Ensure form appears after all header items */
    }
  }

  /* Mobile: inside fixed header, full width to wrap to next line */
  @media (max-width: 1023px) {
    .add-item-form {
      margin-bottom: 0;
      width: 100%;
      flex-basis: 100%;
      order: 3; /* Ensure form appears after header-left and badge */

      /* ALLOW TOUCH INTERACTION - Override parent's touch-action: none */
      touch-action: auto; /* Allow normal touch behavior on form */
    }
  }

  /* Integrated input with button */
  .input-with-button {
    /* Layout */
    position: relative;
    display: flex;
    align-items: center;
  }

  :global(.add-item-input) {
    /* Layout */
    flex: 1;
    padding-right: 48px !important;

    /* Size */
    height: 44px;
  }

  :global(.add-button-integrated) {
    /* Position */
    position: absolute;
    right: 4px;

    /* Size */
    width: 36px !important;
    height: 36px !important;
    min-width: 36px !important;
    min-height: 36px !important;

    /* Style - Button appearance */
    background-color: var(--accent-primary) !important;
    color: var(--text-inverse) !important;
    border-radius: var(--radius-md) !important;
    box-shadow: var(--shadow-sm) !important;
    transition: background-color var(--transition-fast),
                box-shadow var(--transition-fast),
                transform var(--transition-fast) !important;
  }

  :global(.add-button-integrated:hover:not(:disabled)) {
    background-color: var(--accent-hover) !important;
    box-shadow: var(--shadow-md) !important;
    transform: scale(1.05) !important;
  }

  :global(.add-button-integrated:active:not(:disabled)) {
    background-color: var(--accent-muted) !important;
    box-shadow: var(--shadow-sm) !important;
    transform: scale(0.98) !important;
  }

  :global(.add-button-integrated:disabled) {
    opacity: 0.5 !important;
    cursor: not-allowed !important;
    background-color: var(--bg-tertiary) !important;
    color: var(--text-muted) !important;
  }

  /* Items container */
  .items-container {
    /* Layout */
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;

    /* Background */
    background-color: var(--bg-primary);

    /* Spacing */
    margin: 0 calc(var(--space-4) * -1);

    /* Smooth scrolling on touch */
    -webkit-overflow-scrolling: touch;
  }

  /* Desktop: Semi-transparent items container to match card glass effect */
  @media (min-width: 1024px) {
    .items-container {
      background-color: rgba(10, 10, 10, 0.3);
    }
  }

  /* Custom scrollbar styling (both mobile and desktop) */
  .items-container::-webkit-scrollbar {
    width: 8px;
  }

  .items-container::-webkit-scrollbar-track {
    background: transparent;
    margin: var(--space-2) 0;
  }

  .items-container::-webkit-scrollbar-thumb {
    background-color: var(--border-default);
    border-radius: var(--radius-full);
    transition: background-color var(--transition-fast);
  }

  .items-container::-webkit-scrollbar-thumb:hover {
    background-color: var(--accent-primary);
  }

  /* Firefox scrollbar styling (both mobile and desktop) */
  .items-container {
    scrollbar-width: auto;
    scrollbar-color: var(--border-default) transparent;
  }

  /* Mobile: scrollable area fills remaining space */
  @media (max-width: 1023px) {
    .items-container {
      flex: 1;
      /* CRITICAL: Use 'scroll' not 'auto' - forces element to always be a scroll container
         even when content doesn't overflow. This ensures overscroll-behavior works. */
      overflow-y: scroll !important;
      overflow-x: hidden;
      min-height: 0;
      -webkit-overflow-scrolling: touch;

      /* Allow vertical scroll/pan within this container */
      touch-action: pan-y;

      /* PREVENT SCROLL BUBBLING - only works when element IS a scroll container */
      overscroll-behavior: contain;
      overscroll-behavior-y: contain;
    }
  }

  /* Desktop: fixed height to prevent resize when filtering */
  @media (min-width: 1024px) {
    .items-container {
      height: calc(100vh - 350px);
      max-height: calc(100vh - 350px);
      min-height: calc(100vh - 350px);
      flex-shrink: 0;
    }
  }

  @media (max-width: 1023px) {
    .items-container {
      margin: 0 calc(var(--space-3) * -1);
    }

    /* Prevent scrolling when there are no items */
    .items-container.no-items {
      overflow-y: hidden !important;
      -webkit-overflow-scrolling: auto;
      touch-action: none;
    }
  }

  /* Empty state */
  .empty-state {
    /* Layout */
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;

    /* Spacing */
    padding: var(--space-8) var(--space-4);
  }

  .empty-text {
    /* Typography */
    color: var(--text-muted);
    font-size: var(--text-base);

    /* Reset */
    margin: 0;
  }

  /* Separator - Gradient Fade Line */
  .separator {
    /* Position */
    position: relative;

    /* Size */
    height: var(--space-3);

    /* Layout */
    display: flex;
    align-items: center;

    /* Spacing */
    margin: var(--space-2) var(--space-4);
  }

  .separator::before {
    content: '';
    width: 100%;
    height: 2px;
    background: linear-gradient(
      to right,
      transparent 0%,
      var(--accent-primary) 15%,
      var(--accent-primary) 85%,
      transparent 100%
    );
    opacity: 0.6;
    border-radius: var(--radius-full);
  }

  @media (max-width: 1023px) {
    .separator {
      margin: var(--space-2) var(--space-3);
    }
  }

</style>
