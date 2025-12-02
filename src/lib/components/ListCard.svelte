<script lang="ts">
  // List card component - displays a list with items and input
  // Shows list header, add item input, and sorted items

  import { ShoppingCart, CheckCircle, Plus } from 'lucide-svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import {
    Card,
    CardContent,
    CardFooter,
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
    onAddItem?: (listId: number, text: string) => void;
    onToggleItem?: (id: number) => void;
    onEditItem?: (id: number) => void;
    onDeleteItem?: (id: number) => void;
  }

  let {
    list,
    items,
    userId,
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

      <!-- List title -->
      <CardTitle class="list-title">{list.title}</CardTitle>
    </div>

    <!-- Shared badge -->
    {#if list.is_shared && !isOwner()}
      <span class="shared-badge shared-with-me">Shared with you</span>
    {:else if list.is_shared}
      <span class="shared-badge">Shared</span>
    {/if}
  </CardHeader>

  <CardContent class="card-content">
    <!-- Add item form -->
    <form class="add-item-form" onsubmit={handleAddItem}>
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
        size="icon-sm"
        class="add-button"
        disabled={isAdding || !newItemText.trim()}
        aria-label="Add item"
      >
        <Plus size={18} />
      </Button>
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
            onToggle={onToggleItem}
            onEdit={onEditItem}
            onDelete={onDeleteItem}
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
            onToggle={onToggleItem}
            onEdit={onEditItem}
            onDelete={onDeleteItem}
          />
        {/each}
      {/if}
    </div>
  </CardContent>

  <!-- Footer with count -->
  {#if totalCount > 0}
    <CardFooter class="card-footer">
      <span class="item-count">
        {checkedCount} of {totalCount} completed
      </span>
    </CardFooter>
  {/if}
</Card>

<style>
  :global(.list-card) {
    /* Layout */
    display: flex;
    flex-direction: column;

    /* Size */
    min-width: 300px;
    max-width: 600px;
    width: 100%;

    /* Overflow */
    overflow: hidden;
  }

  /* Mobile: full width, no max */
  @media (max-width: 1023px) {
    :global(.list-card) {
      min-width: unset;
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
    align-items: center;
    gap: var(--space-3);
    flex: 1;
    min-width: 0; /* Allow text truncation */
  }

  /* Class is applied to Lucide icon components */
  :global(.list-icon) {
    /* Color */
    color: var(--text-secondary);
    flex-shrink: 0;
  }

  :global(.list-title) {
    /* Text handling */
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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
    padding: var(--space-4) !important;
  }

  @media (max-width: 1023px) {
    :global(.card-content) {
      padding: var(--space-4) var(--space-3) !important;
    }
  }

  /* Add item form */
  .add-item-form {
    /* Layout */
    display: flex;
    gap: var(--space-2);

    /* Spacing */
    margin-bottom: var(--space-4);
  }

  :global(.add-item-input) {
    /* Layout */
    flex: 1;

    /* Size */
    height: 44px;
  }

  :global(.add-button) {
    flex-shrink: 0;
    flex-grow: 0;
    width: 32px !important;
    min-width: 32px !important;
  }

  /* Items container */
  .items-container {
    /* Layout */
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;

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
      max-height: calc(100vh - 238px);
      min-height: calc(100vh - 238px);
    }
  }

  @media (min-width: 1024px) {
    .items-container {
      max-height: calc(100vh - 350px);
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
    /* Size */
    height: 1px;

    /* Style */
    background: repeating-linear-gradient(
      to right,
      var(--border-subtle) 0,
      var(--border-subtle) 8px,
      transparent 8px,
      transparent 16px
    );

    /* Spacing */
    margin: var(--space-2) var(--space-4);
  }

  @media (max-width: 1023px) {
    .separator {
      margin: var(--space-2) var(--space-3);
    }
  }

  /* Footer */
  :global(.card-footer) {
    /* Layout */
    display: flex;
    align-items: center;
    justify-content: center;

    /* Spacing */
    margin: 0;
    padding: var(--space-2) var(--space-4);
  }

  .item-count {
    /* Typography */
    font-size: var(--text-sm);
    color: var(--text-muted);
  }
</style>
