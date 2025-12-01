<script lang="ts">
  // App header with settings icon
  // Fixed top bar with title and settings access

  import { Settings, RefreshCw, Cloud, CloudOff, Check, ShoppingCart, CheckCircle } from 'lucide-svelte';
  import { syncStore } from '$lib/stores/sync.svelte';

  interface Props {
    title?: string;
    listType?: 'shopping' | 'todo';
    isShared?: boolean;
    onSettingsClick?: () => void;
  }

  let { title = 'Lists', listType, isShared = false, onSettingsClick }: Props = $props();

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

      <h1 class="header-title">
        {title}
      </h1>

      {#if isShared}
        <span class="shared-badge">Shared</span>
      {/if}
    </div>

    <!-- Right side: Sync Status + Settings -->
    <div class="header-actions">
      <!-- Sync Status Indicator -->
      <div
        class="sync-indicator"
        class:syncing={syncStatus === 'syncing'}
        class:offline={syncStatus === 'offline'}
        class:synced={syncStatus === 'synced'}
        title={syncStatus === 'offline' ? 'Offline' : lastSyncFormatted}
      >
        <RefreshCw size={18} class="sync-icon {syncStatus === 'syncing' ? 'spinning' : ''}" />
        {#if syncStatus === 'syncing'}
          <span class="sync-text">Syncing</span>
        {:else if syncStatus === 'offline'}
          <span class="sync-text">Offline</span>
        {:else}
          <span class="sync-text">Synced</span>
        {/if}
      </div>

      <!-- Settings Button -->
      <button
        type="button"
        class="settings-button"
        onclick={onSettingsClick}
        aria-label="Open settings"
      >
        <Settings size={24} />
      </button>
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
    height: 56px;

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
  /* svelte-ignore css-unused-selector */
  .list-icon {
    /* Color */
    color: var(--text-secondary);
    flex-shrink: 0;
  }

  .header-title {
    /* Typography */
    font-size: var(--text-lg);
    font-weight: var(--font-semibold);
    color: var(--text-primary);
    font-family: var(--font-heading);

    /* Text handling */
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    /* Reset */
    margin: 0;
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

  /* Header Actions */
  .header-actions {
    /* Layout */
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  /* Sync Indicator */
  .sync-indicator {
    /* Layout */
    display: flex;
    align-items: center;
    gap: var(--space-2);

    /* Style */
    background-color: var(--bg-tertiary);
    border-radius: var(--radius-md);

    /* Spacing */
    padding: var(--space-2) var(--space-3);

    /* Typography */
    font-size: var(--text-sm);
    font-weight: var(--font-medium);

    /* Transition */
    transition: background-color var(--transition-fast);
  }

  .sync-indicator :global(.sync-icon) {
    flex-shrink: 0;
  }

  .sync-text {
    /* Typography */
    font-size: var(--text-sm);
    white-space: nowrap;
  }

  /* Desktop only text */
  .desktop-only {
    display: none;
  }

  @media (min-width: 768px) {
    .desktop-only {
      display: inline;
    }
  }

  /* Sync States */
  .sync-indicator.syncing {
    color: var(--accent-primary);
  }

  .sync-indicator.syncing :global(.sync-icon.spinning) {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .sync-indicator.offline {
    color: var(--text-muted);
    background-color: var(--bg-secondary);
  }

  .sync-indicator.synced {
    color: var(--success);
  }

  .settings-button {
    /* Layout */
    display: flex;
    align-items: center;
    justify-content: center;

    /* Size */
    width: 44px;
    height: 44px;
    min-width: 44px; /* Touch target */
    min-height: 44px;

    /* Style */
    background: none;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;

    /* Color */
    color: var(--text-secondary);

    /* Transition */
    transition: color var(--transition-fast), background-color var(--transition-fast);

    /* Reset */
    padding: 0;
  }

  .settings-button:hover {
    color: var(--text-primary);
    background-color: var(--bg-hover);
  }

  .settings-button:focus-visible {
    outline: 2px solid var(--border-focus);
    outline-offset: 2px;
  }

  .settings-button:active {
    background-color: var(--bg-tertiary);
  }
</style>
