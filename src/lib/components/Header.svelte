<script lang="ts">
  // App header with settings icon
  // Fixed top bar with title and settings access

  import { Settings, RefreshCw, ShoppingCart, CheckCircle, List, Layers, UtensilsCrossed } from 'lucide-svelte';
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
    viewMode?: 'lists' | 'master' | 'meals';
    onViewModeChange?: (mode: 'lists' | 'master' | 'meals') => void;
  }

  let { title = 'Lists', listType, isShared = false, totalCount = 0, checkedCount = 0, onSettingsClick, viewMode = 'lists', onViewModeChange }: Props = $props();

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
    <!-- Left side: View Toggle - Segmented Control -->
    <div class="header-left">
      <div class="segmented-control">
        <button
          type="button"
          class="segment"
          class:active={viewMode === 'lists'}
          onclick={() => onViewModeChange?.('lists')}
          aria-label="Normal list view"
          aria-pressed={viewMode === 'lists'}
        >
          <List size={18} />
          <span class="segment-label">Lists</span>
        </button>
        <button
          type="button"
          class="segment"
          class:active={viewMode === 'master'}
          onclick={() => onViewModeChange?.('master')}
          aria-label="Master list view"
          aria-pressed={viewMode === 'master'}
        >
          <Layers size={18} />
          <span class="segment-label">Master</span>
        </button>
        <button
          type="button"
          class="segment"
          class:active={viewMode === 'meals'}
          onclick={() => onViewModeChange?.('meals')}
          aria-label="Meal planner"
          aria-pressed={viewMode === 'meals'}
        >
          <UtensilsCrossed size={18} />
          <span class="segment-label">Meals</span>
        </button>
      </div>
    </div>

    <!-- Right side: Settings -->
    <div class="header-actions">
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
    flex: 1;
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
    gap: var(--space-1-5);

    /* Size */
    min-width: 52px;
    height: 32px;
    padding: 0 var(--space-3);

    /* Style */
    background-color: transparent;
    border: none;
    border-radius: calc(var(--radius-md) - 2px);
    color: var(--text-muted);
    cursor: pointer;

    /* Transition */
    transition: all var(--transition-fast);

    /* Reset */
    outline: none;
  }

  .segment-label {
    /* Typography */
    font-size: var(--text-xs);
    font-weight: var(--font-medium);
    white-space: nowrap;
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
