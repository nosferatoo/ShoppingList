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
    } catch (error: any) {
      // Check if error is a duplicate constraint violation (code 23505 for PostgreSQL unique_violation)
      const isDuplicateError = error?.code === '23505' || error?.message?.includes('duplicate') || error?.message?.includes('unique');

      if (isDuplicateError) {
        // Silent handling as per requirements - just clear the input
        newItemText = '';
      } else {
        // Log other errors but still clear the input to unblock the UI
        console.error('Failed to add item:', error);
        newItemText = '';
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
        {#if totalCount > 0}
          <span class="item-count">
            {checkedCount} of {totalCount} completed
          </span>
        {/if}
      </div>
    </div>

    <!-- Shared badge -->
    {#if list.is_shared && !isOwner()}
      <span class="shared-badge shared-with-me">Shared with you</span>
    {:else if list.is_shared}
      <span class="shared-badge">Shared</span>
    {/if}
  </CardHeader>

  <CardContent class="card-content">
    <!-- Add item form - Integrated input with button -->
    <form class="add-item-form" onsubmit={handleAddItem}>
      <div class="input-with-button">
        <Input
          type="text"
          class="add-item-input"
          placeholder="Add item..."
          bind:value={newItemText}
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

    <!-- Items list -->
    <div class="items-container">
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
    }
  }

  /* Mobile: full width, no max */
  @media (max-width: 1023px) {
    :global(.list-card) {
      max-width: unset;
      border-radius: 0;
      box-shadow: none;
    }
  }

  /* Header */
  :global(.card-header) {
    /* Layout */
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
  }

  /* Mobile: hide list header (shown in app header instead) */
  @media (max-width: 1023px) {
    :global(.card-header) {
      display: none;
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
    }
  }

  /* Add item form */
  .add-item-form {
    /* Spacing */
    margin-bottom: var(--space-4);
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
    scrollbar-width: thin;
    scrollbar-color: var(--border-default) transparent;
  }

  /* Mobile: constrain height to fill screen without browser scroll */
  @media (max-width: 1023px) {
    .items-container {
      height: calc(100vh - 208px);
      max-height: calc(100vh - 208px);
      min-height: calc(100vh - 208px);
      flex-shrink: 0;
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
  }

  /* Empty state */
  .empty-state {
    /* Layout */
    display: flex;
    align-items: center;
    justify-content: center;

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

  /* Separator */
  .separator {
    /* Position */
    position: relative;

    /* Size */
    height: var(--space-3);

    /* Background */
    background-color: var(--bg-secondary);

    /* Spacing */
    margin: var(--space-2) var(--space-4);
  }

  .separator::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    transform: translateY(-50%);
    border-top: 2px dashed var(--border-default);
  }

  @media (max-width: 1023px) {
    .separator {
      margin: var(--space-2) var(--space-3);
    }
  }

</style>
