<script lang="ts">
  // Master list component - displays all unchecked items from all shopping lists
  // grouped by list name with dividers

  import ListItem from '$lib/components/ListItem.svelte';
  import type { Item } from '$lib/types';

  interface MasterListGroup {
    listName: string;
    listId: number;
    items: Item[];
  }

  interface Props {
    groups: MasterListGroup[];
    onToggleItem?: (itemId: number) => void;
  }

  let { groups, onToggleItem }: Props = $props();
</script>

<div class="master-list-container">
  {#if groups.length === 0}
    <!-- Empty state -->
    <div class="empty-state">
      <p class="empty-text">All items done</p>
    </div>
  {:else}
    {#each groups as group (group.listId)}
      <!-- List divider -->
      <div class="list-divider">
        <span class="divider-text">{group.listName}</span>
      </div>

      <!-- Items from this list -->
      {#each group.items as item (item.id)}
        <ListItem
          {item}
          showActions={false}
          onToggle={onToggleItem}
        />
      {/each}
    {/each}
  {/if}
</div>

<style>
  .master-list-container {
    /* Layout */
    display: flex;
    flex-direction: column;
    flex: 1;
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;

    /* Background */
    background-color: var(--bg-primary);

    /* Spacing */
    padding: var(--space-2) var(--space-3);

    /* Smooth scrolling on mobile */
    -webkit-overflow-scrolling: touch;
  }

  /* Custom scrollbar styling */
  .master-list-container::-webkit-scrollbar {
    width: 8px;
  }

  .master-list-container::-webkit-scrollbar-track {
    background: transparent;
    margin: var(--space-2) 0;
  }

  .master-list-container::-webkit-scrollbar-thumb {
    background-color: var(--border-default);
    border-radius: var(--radius-full);
    transition: background-color var(--transition-fast);
  }

  .master-list-container::-webkit-scrollbar-thumb:hover {
    background-color: var(--accent-primary);
  }

  /* Firefox scrollbar styling */
  .master-list-container {
    scrollbar-width: thin;
    scrollbar-color: var(--border-default) transparent;
  }

  /* List divider */
  .list-divider {
    /* Layout */
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;

    /* Spacing */
    margin: var(--space-6) 0 var(--space-4) 0;
    padding: 0 var(--space-2);
  }

  .list-divider:first-child {
    margin-top: var(--space-2);
  }

  .list-divider::before,
  .list-divider::after {
    content: '';
    flex: 1;
    height: 2px;
    background: linear-gradient(
      to right,
      transparent,
      var(--accent-primary),
      transparent
    );
    opacity: 0.3;
  }

  .divider-text {
    /* Typography */
    font-size: var(--text-sm);
    font-weight: var(--font-semibold);
    color: var(--accent-primary);
    text-transform: uppercase;
    letter-spacing: 0.05em;

    /* Spacing */
    padding: 0 var(--space-3);

    /* Background */
    background-color: var(--bg-primary);

    /* Position */
    position: relative;
    z-index: 1;
  }

  /* Empty state */
  .empty-state {
    /* Layout */
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;

    /* Text */
    text-align: center;
  }

  .empty-text {
    /* Typography */
    font-size: var(--text-lg);
    color: var(--text-muted);

    /* Reset */
    margin: 0;
  }
</style>
