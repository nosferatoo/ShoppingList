# SYNC.md — Offline Sync Architecture

## Overview

The app uses an offline-first architecture with IndexedDB for local storage and Last Write Wins (LWW) conflict resolution. Users can view and modify existing data while offline; creating new items/lists requires an online connection.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER DEVICE                                     │
│                                                                              │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────────┐ │
│  │                 │    │                 │    │                         │ │
│  │   Svelte UI     │◄──►│    Dexie.js     │◄──►│    Sync Manager         │ │
│  │   Components    │    │   (IndexedDB)   │    │                         │ │
│  │                 │    │                 │    │  - Queue pending ops    │ │
│  └─────────────────┘    └─────────────────┘    │  - LWW merge            │ │
│                                                 │  - Detect online        │ │
│                                                 └───────────┬─────────────┘ │
│                                                             │               │
└─────────────────────────────────────────────────────────────┼───────────────┘
                                                              │
                                                   ┌──────────▼──────────┐
                                                   │     Network?        │
                                                   └──────────┬──────────┘
                                                              │
                              ┌────────────────────────────────┼────────────────────────────────┐
                              │                                │                                │
                     ┌────────▼────────┐              ┌────────▼────────┐              ┌────────▼────────┐
                     │   ONLINE        │              │   OFFLINE       │              │   BACK ONLINE   │
                     │                 │              │                 │              │                 │
                     │ - Sync now      │              │ - Queue change  │              │ - Push queue    │
                     │ - Update local  │              │ - Update local  │              │ - Pull changes  │
                     │ - Subscribe RT  │              │ - Show pending  │              │ - Merge LWW     │
                     └────────┬────────┘              └─────────────────┘              └────────┬────────┘
                              │                                                                  │
                              ▼                                                                  ▼
                     ┌─────────────────────────────────────────────────────────────────────────────┐
                     │                                                                             │
                     │                           SUPABASE                                          │
                     │                                                                             │
                     │  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐    │
                     │  │   lists     │   │   items     │   │ list_shares │   │  user_list  │    │
                     │  │             │   │             │   │             │   │  _settings  │    │
                     │  └─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘    │
                     │                                                                             │
                     │  ┌─────────────────────────────────────────────────────────────────────┐   │
                     │  │                        REALTIME                                      │   │
                     │  │   Broadcasts INSERT/UPDATE/DELETE on lists and items tables         │   │
                     │  └─────────────────────────────────────────────────────────────────────┘   │
                     │                                                                             │
                     └─────────────────────────────────────────────────────────────────────────────┘
```

## Local Database (Dexie.js)

### Schema Definition

```typescript
// src/lib/db/local.ts
import Dexie, { type Table } from 'dexie';

export interface LocalList {
  id: number;
  title: string;
  type: 'shopping' | 'todo';
  owner_id: string;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface LocalItem {
  id: number;
  list_id: number;
  text: string;
  is_checked: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  _pending: boolean;  // Local-only: has unsynced changes
}

export interface LocalUserListSettings {
  id: number;
  user_id: string;
  list_id: number;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface SyncMeta {
  key: string;
  value: string;
}

class ListsDatabase extends Dexie {
  lists!: Table<LocalList, number>;
  items!: Table<LocalItem, number>;
  userListSettings!: Table<LocalUserListSettings, number>;
  syncMeta!: Table<SyncMeta, string>;

  constructor() {
    super('ListsApp');
    
    this.version(1).stores({
      lists: 'id, owner_id, updated_at',
      items: 'id, list_id, updated_at, _pending',
      userListSettings: 'id, [user_id+list_id]',
      syncMeta: 'key'
    });
  }
}

export const db = new ListsDatabase();
```

### Usage Examples

```typescript
// Get all items for a list (sorted)
const items = await db.items
  .where('list_id')
  .equals(listId)
  .filter(item => item.deleted_at === null)
  .toArray();

// Sort: unchecked first, then alphabetically
items.sort((a, b) => {
  if (a.is_checked !== b.is_checked) {
    return a.is_checked ? 1 : -1;
  }
  return a.text.localeCompare(b.text);
});

// Get pending items (need sync)
const pendingItems = await db.items
  .where('_pending')
  .equals(true)
  .toArray();

// Update item locally
await db.items.update(itemId, {
  is_checked: true,
  updated_at: new Date().toISOString(),
  _pending: true
});
```

---

## Sync Manager

### Core Module

```typescript
// src/lib/db/sync.ts
import { db } from './local';
import { supabase } from './supabase';

interface SyncResult {
  pushed: number;
  pulled: number;
  conflicts: number;
  hasRemoteChanges: boolean;
}

export async function getLastSyncTime(): Promise<string | null> {
  const meta = await db.syncMeta.get('lastSync');
  return meta?.value ?? null;
}

export async function setLastSyncTime(time: string): Promise<void> {
  await db.syncMeta.put({ key: 'lastSync', value: time });
}

export async function sync(): Promise<SyncResult> {
  const result: SyncResult = {
    pushed: 0,
    pulled: 0,
    conflicts: 0,
    hasRemoteChanges: false
  };

  try {
    // 1. Push local changes
    result.pushed = await pushPendingChanges();
    
    // 2. Pull remote changes
    const pullResult = await pullRemoteChanges();
    result.pulled = pullResult.count;
    result.hasRemoteChanges = pullResult.hasChanges;
    
    return result;
  } catch (error) {
    console.error('Sync failed:', error);
    throw error;
  }
}
```

### Push Pending Changes

```typescript
async function pushPendingChanges(): Promise<number> {
  const pendingItems = await db.items
    .where('_pending')
    .equals(true)
    .toArray();
  
  if (pendingItems.length === 0) return 0;
  
  // Use batch sync function for efficiency
  const { data, error } = await supabase.rpc('sync_items', {
    p_items: pendingItems.map(item => ({
      id: item.id,
      text: item.text,
      is_checked: item.is_checked,
      updated_at: item.updated_at,
      deleted_at: item.deleted_at
    }))
  });
  
  if (error) throw error;
  
  // Process results
  let successCount = 0;
  for (const result of data.results) {
    if (result.success) {
      // Clear pending flag
      await db.items.update(result.item.id, { _pending: false });
      successCount++;
    } else if (result.reason === 'outdated') {
      // Server has newer version, update local
      await db.items.put({ ...result.server_item, _pending: false });
    }
  }
  
  // Update sync time
  await setLastSyncTime(data.server_time);
  
  return successCount;
}
```

### Pull Remote Changes

```typescript
async function pullRemoteChanges(): Promise<{ count: number; hasChanges: boolean }> {
  const lastSync = await getLastSyncTime();
  
  // If first sync, do full load
  if (!lastSync) {
    return await fullSync();
  }
  
  // Incremental sync
  const { data, error } = await supabase.rpc('get_changes_since', {
    last_sync: lastSync
  });
  
  if (error) throw error;
  
  let changeCount = 0;
  
  // Merge lists
  for (const list of data.lists) {
    const local = await db.lists.get(list.id);
    if (!local || new Date(list.updated_at) > new Date(local.updated_at)) {
      await db.lists.put(list);
      changeCount++;
    }
  }
  
  // Merge items (LWW)
  for (const item of data.items) {
    const local = await db.items.get(item.id);
    if (!local || new Date(item.updated_at) > new Date(local.updated_at)) {
      await db.items.put({ ...item, _pending: false });
      changeCount++;
    }
  }
  
  await setLastSyncTime(data.server_time);
  
  return {
    count: changeCount,
    hasChanges: changeCount > 0
  };
}

async function fullSync(): Promise<{ count: number; hasChanges: boolean }> {
  const { data, error } = await supabase.rpc('get_user_lists_with_items');
  
  if (error) throw error;
  
  // Clear and repopulate
  await db.transaction('rw', [db.lists, db.items, db.userListSettings], async () => {
    await db.lists.clear();
    await db.items.clear();
    
    for (const entry of data) {
      await db.lists.put(entry.list);
      
      // Store position
      await db.userListSettings.put({
        id: 0, // Will be replaced
        user_id: '', // Will be set from auth
        list_id: entry.list.id,
        position: entry.position,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      for (const item of entry.items) {
        await db.items.put({ ...item, _pending: false });
      }
    }
  });
  
  await setLastSyncTime(new Date().toISOString());
  
  return {
    count: data.length,
    hasChanges: data.length > 0
  };
}
```

---

## Sync Triggers

### Initialize Listeners

```typescript
// src/lib/db/sync.ts
import { browser } from '$app/environment';

export function initSyncListeners(onSyncComplete?: (result: SyncResult) => void) {
  if (!browser) return;
  
  // 1. Sync when app becomes visible
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      const result = await sync();
      onSyncComplete?.(result);
    }
  });
  
  // 2. Sync when coming back online
  window.addEventListener('online', async () => {
    const result = await sync();
    onSyncComplete?.(result);
  });
}
```

### Manual Sync

```typescript
// Called from settings menu
export async function manualSync(): Promise<SyncResult> {
  if (!navigator.onLine) {
    throw new Error('Cannot sync while offline');
  }
  return await sync();
}
```

---

## Real-time Subscriptions

### Setup

```typescript
// src/lib/db/realtime.ts
import { supabase } from './supabase';
import { db } from './local';

export function subscribeToChanges(
  userId: string,
  onRemoteChange: () => void
) {
  // Subscribe to items changes
  const itemsChannel = supabase
    .channel('items-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'items'
      },
      async (payload) => {
        // Only process if not from current user's recent action
        // (avoid duplicate updates)
        await handleItemChange(payload);
        onRemoteChange();
      }
    )
    .subscribe();
  
  // Subscribe to lists changes
  const listsChannel = supabase
    .channel('lists-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'lists'
      },
      async (payload) => {
        await handleListChange(payload);
        onRemoteChange();
      }
    )
    .subscribe();
  
  // Return unsubscribe function
  return () => {
    itemsChannel.unsubscribe();
    listsChannel.unsubscribe();
  };
}

async function handleItemChange(payload: any) {
  const item = payload.new || payload.old;
  
  switch (payload.eventType) {
    case 'INSERT':
    case 'UPDATE':
      const local = await db.items.get(item.id);
      // Only update if remote is newer or local doesn't exist
      if (!local || new Date(item.updated_at) > new Date(local.updated_at)) {
        await db.items.put({ ...item, _pending: false });
      }
      break;
      
    case 'DELETE':
      await db.items.delete(item.id);
      break;
  }
}

async function handleListChange(payload: any) {
  const list = payload.new || payload.old;
  
  switch (payload.eventType) {
    case 'INSERT':
    case 'UPDATE':
      const local = await db.lists.get(list.id);
      if (!local || new Date(list.updated_at) > new Date(local.updated_at)) {
        await db.lists.put(list);
      }
      break;
      
    case 'DELETE':
      await db.lists.delete(list.id);
      // Also delete associated items locally
      await db.items.where('list_id').equals(list.id).delete();
      break;
  }
}
```

---

## Conflict Resolution: Last Write Wins

### Algorithm

```
When merging local and remote records:

1. Compare updated_at timestamps
2. Record with more recent timestamp wins
3. Winning record replaces losing record entirely

Example:
  Local:  { id: 1, text: "Milk", is_checked: true,  updated_at: "2024-01-15T10:00:00Z" }
  Remote: { id: 1, text: "Milk", is_checked: false, updated_at: "2024-01-15T10:00:05Z" }
  
  Result: Remote wins (5 seconds newer)
  Final:  { id: 1, text: "Milk", is_checked: false, updated_at: "2024-01-15T10:00:05Z" }
```

### Implementation

```typescript
function shouldUseRemote(local: { updated_at: string }, remote: { updated_at: string }): boolean {
  return new Date(remote.updated_at) > new Date(local.updated_at);
}

async function mergeItem(remoteItem: Item): Promise<void> {
  const localItem = await db.items.get(remoteItem.id);
  
  if (!localItem) {
    // New item from remote
    await db.items.put({ ...remoteItem, _pending: false });
    return;
  }
  
  if (localItem._pending) {
    // Local has pending changes, compare timestamps
    if (shouldUseRemote(localItem, remoteItem)) {
      // Remote wins, discard local changes
      await db.items.put({ ...remoteItem, _pending: false });
    }
    // else: local wins, keep pending flag for next sync
  } else {
    // No local changes, just update
    if (shouldUseRemote(localItem, remoteItem)) {
      await db.items.put({ ...remoteItem, _pending: false });
    }
  }
}
```

---

## Offline Behavior

### Capability Matrix

| Action | Online | Offline | Notes |
|--------|--------|---------|-------|
| View lists | ✅ | ✅ | From IndexedDB |
| View items | ✅ | ✅ | From IndexedDB |
| Check/uncheck item | ✅ Immediate | ✅ Queued | `_pending = true` |
| Edit item text | ✅ Immediate | ✅ Queued | `_pending = true` |
| Delete item | ✅ Immediate | ✅ Queued | Sets `deleted_at` |
| Reorder lists | ✅ Immediate | ✅ Queued | Local only until sync |
| **Create item** | ✅ Server assigns ID | ❌ Blocked | Show toast |
| **Create list** | ✅ Server assigns ID | ❌ Blocked | Show toast |

### Handling Blocked Actions

```typescript
// src/lib/stores/lists.svelte.ts
export async function addItem(listId: number, text: string): Promise<boolean> {
  if (!navigator.onLine) {
    // Show toast notification
    toast.show({
      message: "You're offline. Item will be added when back online.",
      type: 'warning'
    });
    
    // Queue the creation for later
    // Note: This is a simplified approach. Full implementation would
    // need a separate queue table for pending creates.
    return false;
  }
  
  // Online: create on server
  const { data, error } = await supabase
    .from('items')
    .insert({ list_id: listId, text })
    .select()
    .single();
  
  if (error) {
    toast.show({ message: 'Failed to add item', type: 'error' });
    return false;
  }
  
  // Add to local DB
  await db.items.put({ ...data, _pending: false });
  
  return true;
}
```

---

## Sync Status Store

```typescript
// src/lib/stores/sync.svelte.ts
import { sync, getLastSyncTime } from '$lib/db/sync';

interface SyncState {
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: string | null;
  error: string | null;
}

let state = $state<SyncState>({
  isSyncing: false,
  pendingCount: 0,
  lastSyncTime: null,
  error: null
});

export const syncStore = {
  get isSyncing() { return state.isSyncing; },
  get pendingCount() { return state.pendingCount; },
  get lastSyncTime() { return state.lastSyncTime; },
  get error() { return state.error; },
  
  async updatePendingCount() {
    const count = await db.items.where('_pending').equals(true).count();
    state.pendingCount = count;
  },
  
  async performSync() {
    if (state.isSyncing) return;
    
    state.isSyncing = true;
    state.error = null;
    
    try {
      const result = await sync();
      state.lastSyncTime = await getLastSyncTime();
      await this.updatePendingCount();
      
      return result;
    } catch (error) {
      state.error = error instanceof Error ? error.message : 'Sync failed';
      throw error;
    } finally {
      state.isSyncing = false;
    }
  }
};
```

---

## Service Worker (PWA)

```typescript
// src/service-worker.ts
/// <reference types="@sveltejs/kit" />
import { build, files, version } from '$service-worker';

const CACHE_NAME = `lists-app-${version}`;
const ASSETS = [...build, ...files];

// Install: cache all static assets
self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch: cache-first for assets, skip API calls
self.addEventListener('fetch', (event: FetchEvent) => {
  const url = new URL(event.request.url);
  
  // Don't cache Supabase API calls
  if (url.hostname.includes('supabase')) {
    return;
  }
  
  // Cache-first for app assets
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request))
  );
});
```

---

## Testing Offline Mode

### Chrome DevTools

1. Open DevTools (F12)
2. Go to Network tab
3. Check "Offline" checkbox
4. Test app functionality

### Programmatic Check

```typescript
// Check online status
if (navigator.onLine) {
  // Online
} else {
  // Offline
}

// Listen for changes
window.addEventListener('online', () => console.log('Back online'));
window.addEventListener('offline', () => console.log('Gone offline'));
```

### Test Scenarios

1. **View while offline**: Should show all cached data
2. **Check item while offline**: Should update UI, mark as pending
3. **Come back online**: Should auto-sync, clear pending flags
4. **Create while offline**: Should show warning toast
5. **Conflict**: Edit same item on two devices offline, sync both → LWW resolves
