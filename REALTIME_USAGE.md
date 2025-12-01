# Realtime Subscriptions Usage Guide

This guide shows how to use the realtime subscriptions and sync features in your Svelte components.

## Overview

The sync system is automatically initialized in the root layout when a user is authenticated. It provides:

1. **Automatic sync** on visibility change and network reconnection
2. **Realtime subscriptions** to Supabase for instant updates
3. **Event-based notifications** for UI updates
4. **Online/offline status** tracking

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Root Layout                              │
│  - Initializes authStore                                         │
│  - Initializes syncStore when user authenticates                 │
│  - Sets up realtime subscriptions                                │
└────────────────────────┬────────────────────────────────────────┘
                         │
          ┌──────────────┴──────────────┐
          │                             │
┌─────────▼─────────┐         ┌─────────▼─────────┐
│   Sync Store      │         │  Realtime Subs    │
│  - isSyncing      │         │  - Lists changes  │
│  - isOnline       │         │  - Items changes  │
│  - pendingCount   │         └─────────┬─────────┘
│  - lastSyncAt     │                   │
└─────────┬─────────┘                   │
          │                             │
          └──────────────┬──────────────┘
                         │
                    Events
          ┌──────────────┴──────────────┐
          │                             │
  'remote-change'              'sync-complete'
          │                             │
          ▼                             ▼
    ┌─────────────────────────────────────┐
    │        Your UI Components           │
    │  - Listen to events                 │
    │  - Refresh data                     │
    │  - Show notifications               │
    └─────────────────────────────────────┘
```

## Using Sync Store in Components

### Access Sync State

```svelte
<script lang="ts">
  import { syncStore } from '$lib/stores/sync.svelte';

  // Read reactive state
  let isSyncing = $derived(syncStore.isSyncing);
  let isOnline = $derived(syncStore.isOnline);
  let pendingCount = $derived(syncStore.pendingCount);
  let lastSyncAt = $derived(syncStore.lastSyncAt);
</script>

<!-- Show sync status -->
{#if isSyncing}
  <div>Syncing...</div>
{/if}

{#if !isOnline}
  <div class="offline-banner">
    You're offline. Changes will sync when back online.
  </div>
{/if}

{#if pendingCount > 0}
  <div>{pendingCount} pending changes</div>
{/if}

{#if lastSyncAt}
  <div>Last synced: {lastSyncAt.toLocaleTimeString()}</div>
{/if}
```

### Manual Sync Button

```svelte
<script lang="ts">
  import { syncStore } from '$lib/stores/sync.svelte';

  async function handleManualSync() {
    try {
      const result = await syncStore.performSync();
      console.log('Sync result:', result);
      // Show success message
    } catch (error) {
      console.error('Sync failed:', error);
      // Show error message
    }
  }
</script>

<button
  onclick={handleManualSync}
  disabled={syncStore.isSyncing || !syncStore.isOnline}
>
  {syncStore.isSyncing ? 'Syncing...' : 'Sync Now'}
</button>
```

## Listening to Realtime Events

### Using Event Helpers (Recommended)

```svelte
<script lang="ts">
  import { onRemoteChange, onSyncComplete } from '$lib/db/syncEvents';
  import { db } from '$lib/db/local';

  let items = $state<any[]>([]);

  // Reload data when remote changes detected
  onRemoteChange(() => {
    console.log('Remote change detected, reloading items...');
    loadItems();
  });

  // Show notification when sync completes
  onSyncComplete((result) => {
    if (result.hasRemoteChanges) {
      console.log('Sync pulled remote changes:', result);
      // Show toast notification
      // showToast('New changes from other device');
    }
  });

  async function loadItems() {
    items = await db.items.toArray();
  }
</script>
```

### Using Window Events Directly

```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  let items = $state<any[]>([]);

  onMount(() => {
    // Listen for remote changes
    const handleRemoteChange = () => {
      console.log('Remote change detected');
      loadItems();
    };

    // Listen for sync completion
    const handleSyncComplete = (event: CustomEvent) => {
      console.log('Sync complete:', event.detail);
      if (event.detail.hasRemoteChanges) {
        // Show notification
      }
    };

    window.addEventListener('remote-change', handleRemoteChange);
    window.addEventListener('sync-complete', handleSyncComplete);

    return () => {
      window.removeEventListener('remote-change', handleRemoteChange);
      window.removeEventListener('sync-complete', handleSyncComplete);
    };
  });

  async function loadItems() {
    items = await db.items.toArray();
  }
</script>
```

## Complete Example: List Component

Here's a complete example showing how to build a reactive list component:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { onRemoteChange, onSyncComplete } from '$lib/db/syncEvents';
  import { syncStore } from '$lib/stores/sync.svelte';
  import { db } from '$lib/db/local';
  import type { LocalItem } from '$lib/db/local';

  // Props
  interface Props {
    listId: number;
  }
  let { listId }: Props = $props();

  // State
  let items = $state<LocalItem[]>([]);
  let isLoading = $state(true);
  let showNotification = $state(false);

  // Derived state from sync store
  let isOnline = $derived(syncStore.isOnline);
  let isSyncing = $derived(syncStore.isSyncing);

  // Load items on mount
  onMount(() => {
    loadItems();
  });

  // Reload when remote changes detected
  onRemoteChange(() => {
    console.log('Remote change detected, reloading...');
    loadItems();
    showNotification = true;
    setTimeout(() => showNotification = false, 3000);
  });

  // Handle sync completion
  onSyncComplete((result) => {
    if (result.hasRemoteChanges) {
      console.log('Sync brought new changes');
    }
  });

  // Load items from IndexedDB
  async function loadItems() {
    try {
      isLoading = true;
      items = await db.getListItems(listId);
    } catch (error) {
      console.error('Failed to load items:', error);
    } finally {
      isLoading = false;
    }
  }

  // Toggle item checked state
  async function toggleItem(item: LocalItem) {
    try {
      await db.updateItemWithPending(item.id, {
        is_checked: !item.is_checked
      });

      // Reload local items
      await loadItems();

      // Update pending count in sync store
      await syncStore.updatePendingCount();

      // If online, trigger sync
      if (isOnline && !isSyncing) {
        syncStore.performSync();
      }
    } catch (error) {
      console.error('Failed to toggle item:', error);
    }
  }
</script>

<!-- Offline banner -->
{#if !isOnline}
  <div class="offline-banner">
    Offline - changes will sync when back online
  </div>
{/if}

<!-- Remote change notification -->
{#if showNotification}
  <div class="notification">
    New changes from another device
  </div>
{/if}

<!-- Loading state -->
{#if isLoading}
  <div>Loading items...</div>
{:else}
  <!-- Items list -->
  <div class="items-list">
    {#each items as item}
      <div class="item">
        <input
          type="checkbox"
          checked={item.is_checked}
          onchange={() => toggleItem(item)}
        />
        <span class:checked={item.is_checked}>
          {item.text}
        </span>
        {#if item._pending}
          <span class="pending-badge">⏳</span>
        {/if}
      </div>
    {/each}
  </div>
{/if}

<style>
  .offline-banner {
    background: #fef3c7;
    border: 1px solid #f59e0b;
    padding: 0.5rem;
    border-radius: 0.25rem;
    margin-bottom: 1rem;
  }

  .notification {
    background: #dbeafe;
    border: 1px solid #3b82f6;
    padding: 0.5rem;
    border-radius: 0.25rem;
    margin-bottom: 1rem;
  }

  .pending-badge {
    font-size: 0.875rem;
    opacity: 0.6;
  }

  .checked {
    text-decoration: line-through;
    opacity: 0.6;
  }
</style>
```

## How Realtime Updates Work

### Flow Diagram

```
User A makes change          User B's device receives update
      │                               │
      ▼                               ▼
  Update local DB              Realtime subscription
      │                         triggers callback
      ▼                               │
  Mark as pending                     ▼
      │                        handleItemChange()
      ▼                               │
  Sync to server                      ▼
      │                         Update local DB
      ▼                          (if newer)
  Server broadcasts                   │
      │                               ▼
      └───────────────────────────────┤
                                      │
                                      ▼
                            Dispatch 'remote-change'
                                      │
                                      ▼
                              Component reloads data
```

### What Gets Synced Automatically

1. **On app visibility change**: When user switches back to the tab
2. **On network reconnection**: When device comes back online
3. **On sign in**: Initial full sync when user authenticates
4. **Realtime updates**: Instant updates when other users make changes

### What Requires Manual Trigger

- Creating new items/lists (requires online connection)
- Manual sync button click
- Explicit `syncStore.performSync()` call

## Best Practices

### 1. Always Check Online Status

```ts
async function createItem(text: string) {
  if (!syncStore.isOnline) {
    // Show warning
    alert('Cannot create items while offline');
    return;
  }

  // Create item on server...
}
```

### 2. Show Pending Changes

```svelte
{#if item._pending}
  <span class="badge">Pending sync</span>
{/if}
```

### 3. Reload After Remote Changes

```ts
onRemoteChange(() => {
  // Always reload to get latest data
  loadItems();
});
```

### 4. Debounce Frequent Updates

```ts
import { debounce } from '$lib/utils';

const debouncedLoadItems = debounce(loadItems, 300);

onRemoteChange(() => {
  debouncedLoadItems();
});
```

### 5. Handle Errors Gracefully

```ts
onRemoteChange(() => {
  loadItems().catch(error => {
    console.error('Failed to reload:', error);
    // Show error message to user
  });
});
```

## Debugging

### Enable Console Logging

The sync system logs to console:

```
Initializing sync system...
Setting up realtime subscriptions...
Realtime subscriptions active
Remote change detected via realtime
Sync complete: { pushed: 2, pulled: 1, ... }
```

### Check Sync Status

```ts
console.log('Sync state:', {
  isSyncing: syncStore.isSyncing,
  isOnline: syncStore.isOnline,
  pendingCount: syncStore.pendingCount,
  lastSyncAt: syncStore.lastSyncAt
});
```

### Monitor Realtime Events

```ts
window.addEventListener('remote-change', () => {
  console.log('Remote change event fired');
});

window.addEventListener('sync-complete', (e) => {
  console.log('Sync complete event:', e.detail);
});
```

## Troubleshooting

### Realtime updates not working

1. Check Supabase realtime is enabled for tables
2. Verify user is authenticated
3. Check console for subscription errors
4. Ensure RLS policies allow user to see changes

### Changes not syncing

1. Check `navigator.onLine` status
2. Verify pending count: `syncStore.pendingCount`
3. Check for sync errors in console
4. Manually trigger sync: `syncStore.performSync()`

### Performance issues

1. Debounce frequent reloads
2. Only load visible data
3. Use pagination for large lists
4. Batch updates instead of individual calls
