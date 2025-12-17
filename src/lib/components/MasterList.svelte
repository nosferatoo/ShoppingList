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

<div class="master-list-container" data-scroll-container>
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

  /* List divider - Pill Badge Style */
  .list-divider {
    /* Layout */
    display: flex;
    align-items: center;
    justify-content: center;

    /* Spacing */
    margin: var(--space-6) 0 var(--space-4) 0;
    gap: var(--space-3);
  }

  .list-divider:first-child {
    margin-top: var(--space-2);
  }

  .list-divider::before {
    content: '';
    flex: 1;
    height: 1px;
    background: linear-gradient(
      to left,
      var(--accent-primary) 0%,
      var(--accent-primary) 60%,
      transparent 100%
    );
  }

  .list-divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: linear-gradient(
      to right,
      var(--accent-primary) 0%,
      var(--accent-primary) 60%,
      transparent 100%
    );
  }

  .divider-text {
    /* Style - Pill Badge */
    background: var(--bg-secondary);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-full);
    box-shadow: var(--shadow-md);

    /* Spacing */
    padding: var(--space-2) var(--space-4);

    /* Typography */
    font-size: var(--text-xs);
    font-weight: var(--font-semibold);
    color: var(--accent-primary);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    white-space: nowrap;
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
