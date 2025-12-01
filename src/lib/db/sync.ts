// Sync logic (Last Write Wins)
// Implements offline-first sync between Supabase and IndexedDB with LWW conflict resolution

import { browser } from '$app/environment';
import { createSupabaseBrowserClient } from './supabase';
import { db } from './local';
import type { Item, List, ChangesSinceResponse, SyncItemsResponse, UserListsWithItemsResponse } from '$lib/types';

// ============================================================================
// TYPES
// ============================================================================

export interface SyncResult {
  pushed: number;
  pulled: number;
  conflicts: number;
  hasRemoteChanges: boolean;
}

// ============================================================================
// SYNC METADATA
// ============================================================================

/**
 * Get the timestamp of the last successful sync
 */
export async function getLastSyncTime(): Promise<string | null> {
  const meta = await db.syncMeta.get('lastSync');
  return meta?.value ?? null;
}

/**
 * Update the last sync timestamp
 */
export async function setLastSyncTime(time: string): Promise<void> {
  await db.syncMeta.put({ key: 'lastSync', value: time });
}

// ============================================================================
// MAIN SYNC FUNCTION
// ============================================================================

/**
 * Main synchronization function
 * 1. Pushes local pending changes to server
 * 2. Pulls remote changes from server
 * 3. Resolves conflicts using Last Write Wins (LWW)
 */
export async function sync(): Promise<SyncResult> {
  const result: SyncResult = {
    pushed: 0,
    pulled: 0,
    conflicts: 0,
    hasRemoteChanges: false
  };

  try {
    // 1. Push local changes first
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

// ============================================================================
// PUSH PENDING CHANGES
// ============================================================================

/**
 * Push pending local changes to the server
 * Uses the sync_items RPC function for batch updates with LWW
 */
async function pushPendingChanges(): Promise<number> {
  const supabase = createSupabaseBrowserClient();

  // Get all pending items
  const pendingItems = await db.items
    .where('_pending')
    .equals(1)
    .toArray();

  if (pendingItems.length === 0) {
    return 0;
  }

  // Prepare items for sync (exclude _pending flag)
  const itemsToSync = pendingItems.map(item => ({
    id: item.id,
    text: item.text,
    is_checked: item.is_checked,
    updated_at: item.updated_at,
    deleted_at: item.deleted_at
  }));

  // Call batch sync function
  const { data, error } = await supabase.rpc('sync_items', {
    p_items: itemsToSync as any
  });

  if (error) {
    console.error('Push failed:', error);
    throw error;
  }

  // Process results
  let successCount = 0;
  const syncResponse = data as SyncItemsResponse;

  for (const result of syncResponse.results) {
    if (result.success) {
      // Server accepted our change, clear pending flag
      if (result.item) {
        await db.items.update(result.item.id, { _pending: false });
        successCount++;
      }
    } else if (result.reason === 'outdated') {
      // Server has newer version, update local with server data
      if (result.server_item) {
        await db.items.put({
          ...result.server_item,
          _pending: false
        });
      }
    }
  }

  // Update sync time
  await setLastSyncTime(syncResponse.server_time);

  return successCount;
}

// ============================================================================
// PULL REMOTE CHANGES
// ============================================================================

/**
 * Pull remote changes from server
 * Performs incremental sync if lastSync exists, otherwise does full sync
 */
async function pullRemoteChanges(): Promise<{ count: number; hasChanges: boolean }> {
  const lastSync = await getLastSyncTime();

  // If first sync, do full load
  if (!lastSync) {
    return await fullSync();
  }

  // Incremental sync
  const supabase = createSupabaseBrowserClient();

  const { data, error } = await supabase.rpc('get_changes_since', {
    last_sync: lastSync
  });

  if (error) {
    console.error('Pull failed:', error);
    throw error;
  }

  const changes = data as ChangesSinceResponse;
  let changeCount = 0;

  // Merge lists using LWW
  for (const list of changes.lists) {
    const local = await db.lists.get(list.id);
    if (!local || shouldUseRemote(local, list)) {
      await db.lists.put(list);
      changeCount++;
    }
  }

  // Merge items using LWW
  for (const item of changes.items) {
    await mergeItem(item);
    changeCount++;
  }

  await setLastSyncTime(changes.server_time);

  return {
    count: changeCount,
    hasChanges: changeCount > 0
  };
}

// ============================================================================
// FULL SYNC
// ============================================================================

/**
 * Perform full sync on first load
 * Clears local database and loads all accessible lists and items
 */
async function fullSync(): Promise<{ count: number; hasChanges: boolean }> {
  const supabase = createSupabaseBrowserClient();

  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('No authenticated user for full sync');
  }

  const userId = user.id;

  const { data, error } = await supabase.rpc('get_user_lists_with_items');

  if (error) {
    console.error('Full sync failed:', error);
    throw error;
  }

  const listsData = data as UserListsWithItemsResponse[];

  // Clear and repopulate in a transaction
  await db.transaction('rw', [db.lists, db.items, db.userListSettings], async () => {
    await db.lists.clear();
    await db.items.clear();
    await db.userListSettings.clear();

    for (const entry of listsData) {
      // Store list
      await db.lists.put(entry.list);

      // Store user's position for this list
      await db.userListSettings.put({
        id: 0, // Auto-generated
        user_id: userId,
        list_id: entry.list.id,
        position: entry.position,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      // Store items
      for (const item of entry.items) {
        await db.items.put({ ...item, _pending: false });
      }
    }
  });

  await setLastSyncTime(new Date().toISOString());

  return {
    count: listsData.length,
    hasChanges: listsData.length > 0
  };
}

// ============================================================================
// CONFLICT RESOLUTION (LWW)
// ============================================================================

/**
 * Determine if remote record should replace local based on timestamps
 * Last Write Wins: more recent updated_at wins
 */
function shouldUseRemote(
  local: { updated_at: string },
  remote: { updated_at: string }
): boolean {
  return new Date(remote.updated_at) > new Date(local.updated_at);
}

/**
 * Merge a remote item with local item using LWW strategy
 * Handles pending local changes appropriately
 */
async function mergeItem(remoteItem: Item): Promise<void> {
  const localItem = await db.items.get(remoteItem.id);

  if (!localItem) {
    // New item from remote, just add it
    await db.items.put({ ...remoteItem, _pending: false });
    return;
  }

  if (localItem._pending) {
    // Local has pending changes, compare timestamps
    if (shouldUseRemote(localItem, remoteItem)) {
      // Remote is newer, discard local changes
      await db.items.put({ ...remoteItem, _pending: false });
    }
    // else: local wins, keep pending flag for next sync
  } else {
    // No local changes, just update if remote is newer
    if (shouldUseRemote(localItem, remoteItem)) {
      await db.items.put({ ...remoteItem, _pending: false });
    }
  }
}

// ============================================================================
// SYNC LISTENERS
// ============================================================================

/**
 * Initialize automatic sync listeners
 * Triggers sync on:
 * - App visibility change (user returns to tab)
 * - Network status change (coming back online)
 */
export function initSyncListeners(onSyncComplete?: (result: SyncResult) => void): void {
  if (!browser) return;

  // 1. Sync when app becomes visible
  // TEMPORARILY DISABLED - This was causing UI to become unresponsive
  // document.addEventListener('visibilitychange', async () => {
  //   if (document.visibilityState === 'visible' && navigator.onLine) {
  //     try {
  //       const result = await sync();
  //       onSyncComplete?.(result);
  //     } catch (error) {
  //       console.error('Auto-sync on visibility change failed:', error);
  //     }
  //   }
  // });

  // 2. Sync when coming back online
  window.addEventListener('online', async () => {
    try {
      const result = await sync();
      onSyncComplete?.(result);
    } catch (error) {
      console.error('Auto-sync on online event failed:', error);
    }
  });
}

// ============================================================================
// MANUAL SYNC
// ============================================================================

/**
 * Manually trigger sync (called from settings menu)
 * Throws error if offline
 */
export async function manualSync(): Promise<SyncResult> {
  if (!navigator.onLine) {
    throw new Error('Cannot sync while offline');
  }
  return await sync();
}

// ============================================================================
// REALTIME SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to real-time changes from Supabase
 * Updates local database when other users make changes
 *
 * @param userId - Current user's ID
 * @param onRemoteChange - Callback when remote change detected
 * @returns Unsubscribe function
 */
export function subscribeToChanges(
  userId: string,
  onRemoteChange: () => void
): () => void {
  const supabase = createSupabaseBrowserClient();

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

/**
 * Handle real-time item change event
 */
async function handleItemChange(payload: any): Promise<void> {
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

/**
 * Handle real-time list change event
 */
async function handleListChange(payload: any): Promise<void> {
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
