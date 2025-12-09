<script lang="ts">
  // App header with settings icon
  // Fixed top bar with title and settings access

  import { Settings, RefreshCw, ShoppingCart, CheckCircle, List, Layers } from 'lucide-svelte';
  import { Button } from '$lib/components/ui/button';
  import { Badge } from '$lib/components/ui/badge';
  import { syncStore } from '$lib/stores/sync.svelte';

  interface Props {
    title?: string;
    listType?: 'shopping' | 'todo';
    isShared?: boolean;
    totalCount?: number;
    checkedCount?: number;
    onSettingsClick?: () => void;
    isMasterMode?: boolean;
    onToggleMasterMode?: (enabled: boolean) => void;
  }

  let { title = 'Lists', listType, isShared = false, totalCount = 0, checkedCount = 0, onSettingsClick, isMasterMode = false, onToggleMasterMode }: Props = $props();

  // Sync status from store
  let isSyncing = $derived(syncStore.isSyncing);
  let isOnline = $derived(syncStore.isOnline);
  let lastSyncAt = $derived(syncStore.lastSyncAt);

  // Format last sync time for tooltip
  let lastSyncFormatted = $derived.by(() => {
    if (!lastSyncAt) return 'Never synced';

    const now = new Date();
    const diff = now.getTime() - lastSyncAt.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return 'Synced just now';
    if (minutes < 60) return `Synced ${minutes}m ago`;
    if (hours < 24) return `Synced ${hours}h ago`;

    return `Synced ${lastSyncAt.toLocaleDateString()}`;
  });

  // Sync status indicator state
  let syncStatus = $derived.by(() => {
    if (!isOnline) return 'offline';
    if (isSyncing) return 'syncing';
    return 'synced';
  });
</script>

<header
  class="header"
>
  <div class="header-content">
    <!-- Title/Logo with optional icon and shared badge -->
    <div class="header-left">
      {#if listType}
        {#if listType === 'shopping'}
          <ShoppingCart size={20} class="list-icon" />
        {:else}
          <CheckCircle size={20} class="list-icon" />
        {/if}
      {/if}

      <div class="header-title-section">
        <h1 class="header-title">
          {title}
        </h1>

        {#if totalCount > 0}
          <span class="item-count">
            {#if isMasterMode}
              {totalCount} {totalCount === 1 ? 'item' : 'items'} remaining
            {:else}
              {checkedCount} of {totalCount} completed
            {/if}
          </span>
        {/if}
      </div>
    </div>

    <!-- Right side: Master Toggle + Settings -->
    <div class="header-actions">
      <!-- Master List Toggle - Segmented Control -->
      <div class="segmented-control">
        <button
          type="button"
          class="segment"
          class:active={!isMasterMode}
          onclick={() => onToggleMasterMode?.(false)}
          aria-label="Normal list view"
          aria-pressed={!isMasterMode}
        >
          <List size={18} />
        </button>
        <button
          type="button"
          class="segment"
          class:active={isMasterMode}
          onclick={() => onToggleMasterMode?.(true)}
          aria-label="Master list view"
          aria-pressed={isMasterMode}
        >
          <Layers size={18} />
        </button>
      </div>

      <!-- Settings Button -->
      <Button
        variant="ghost"
        size="icon"
        class="settings-button-custom"
        onclick={onSettingsClick}
        aria-label="Open settings"
      >
        <Settings size={24} />
      </Button>
    </div>
  </div>
</header>

<style>
  .header {
    /* Position */
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 50;

    /* Size */
    height: 64px;

    /* Background */
    background-color: var(--bg-secondary);

    /* Border */
    border-bottom: 1px solid var(--border-subtle);
  }

  /* Desktop: Hide header completely */
  @media (min-width: 1024px) {
    .header {
      display: none;
    }
  }

  .header-content {
    /* Layout */
    display: flex;
    align-items: center;
    justify-content: space-between;

    /* Size */
    height: 100%;
    max-width: 1400px;
    margin: 0 auto;

    /* Spacing */
    padding: 0 var(--space-4);
  }

  .header-left {
    /* Layout */
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex: 1;
    min-width: 0; /* Allow text truncation */
  }

  /* Class is applied to Lucide icon components */
  :global(.list-icon) {
    /* Color */
    color: var(--text-secondary);
    flex-shrink: 0;
  }

  .header-title-section {
    /* Layout */
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 2px;
    flex: 1;
    min-width: 0; /* Allow text truncation */
  }

  .header-title {
    /* Typography */
    font-size: var(--text-lg);
    font-weight: var(--font-semibold);
    color: var(--text-primary);
    font-family: var(--font-heading);
    line-height: 1.2;

    /* Text handling */
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    /* Reset */
    margin: 0;
  }

  .item-count {
    /* Typography */
    font-size: var(--text-sm);
    color: var(--text-muted);
    line-height: 1.2;

    /* Reset */
    margin: 0;
  }

  /* Header Actions */
  .header-actions {
    /* Layout */
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  /* Segmented Control */
  .segmented-control {
    /* Layout */
    display: flex;
    align-items: center;
    gap: 2px;

    /* Style */
    background-color: var(--bg-tertiary);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-subtle);

    /* Spacing */
    padding: 2px;

    /* Transition */
    transition: background-color var(--transition-fast);
  }

  .segment {
    /* Layout */
    display: flex;
    align-items: center;
    justify-content: center;

    /* Size */
    width: 36px;
    height: 32px;

    /* Style */
    background-color: transparent;
    border: none;
    border-radius: calc(var(--radius-md) - 2px);
    color: var(--text-muted);
    cursor: pointer;

    /* Transition */
    transition: all var(--transition-fast);

    /* Reset */
    padding: 0;
    outline: none;
  }

  .segment:hover:not(.active) {
    background-color: var(--bg-secondary);
    color: var(--text-secondary);
  }

  .segment.active {
    background-color: var(--accent-primary);
    color: var(--text-on-accent);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  }

  .segment:focus-visible {
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
  }

  :global(.settings-button-custom) {
    color: var(--text-secondary) !important;
  }

  :global(.settings-button-custom:hover) {
    color: var(--text-primary) !important;
  }
</style>
