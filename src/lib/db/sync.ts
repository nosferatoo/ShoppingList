// Sync logic (Last Write Wins)
// Implements offline-first sync between server and IndexedDB
// Always performs full sync for simplicity and reliability

import { browser } from '$app/environment';
import { db } from './local';
import { apiGet, apiPost } from '$lib/api/client';
import type { SyncItemsResponse, UserListsWithItemsResponse } from '$lib/types';

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
 * 1. Pushes local pending changes to server (with server-side LWW conflict resolution)
 * 2. Performs full sync from server (replaces local state with server state)
 */
export async function sync(userId: string): Promise<SyncResult> {
  const result: SyncResult = {
    pushed: 0,
    pulled: 0,
    conflicts: 0,
    hasRemoteChanges: false
  };

  try {
    // 1. Push local changes first
    result.pushed = await pushPendingChanges(userId);

    // 2. Push pending check logs
    await pushPendingCheckLogs(userId);

    // 3. Pull remote changes
    const pullResult = await fullSync(userId);
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
 * Uses the sync_items API endpoint for batch updates with LWW
 */
async function pushPendingChanges(userId: string): Promise<number> {

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

  // Call batch sync endpoint
  const syncResponse = await apiPost<SyncItemsResponse>('/api/sync/items', { p_items: itemsToSync });

  // Process results
  let successCount = 0;

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

/**
 * Push pending check logs to the server
 * Check logs are append-only, so no conflict resolution needed
 */
async function pushPendingCheckLogs(userId: string): Promise<number> {

  // Get all pending check logs
  const pendingLogs = await db.getPendingCheckLogs();

  if (pendingLogs.length === 0) {
    return 0;
  }

  // Prepare logs for insert (exclude _pending and id fields)
  const logsToInsert = pendingLogs.map(log => ({
    user_id: log.user_id,
    list_name: log.list_name,
    item_name: log.item_name,
    checked_at: log.checked_at,
    list_id: log.list_id,
    item_id: log.item_id
  }));

  // Insert all logs at once via API
  await apiPost('/api/sync/check-logs', logsToInsert);

  // Mark all logs as synced by clearing them from local DB
  // (We don't need to keep synced logs locally since they're append-only)
  for (const log of pendingLogs) {
    if (log.id) {
      await db.checkLogs.delete(log.id);
    }
  }

  return pendingLogs.length;
}

// ============================================================================
// FULL SYNC
// ============================================================================

/**
 * Perform full sync
 * Clears local database and loads all accessible lists and items
 */
async function fullSync(userId: string): Promise<{ count: number; hasChanges: boolean }> {
  const listsData = await apiGet<UserListsWithItemsResponse[]>('/api/sync');

  // Clear and repopulate in a transaction
  await db.transaction('rw', [db.lists, db.items, db.userListSettings], async () => {
    await db.lists.clear();
    await db.items.clear();
    await db.userListSettings.clear();

    for (const entry of listsData) {
      // Store list
      await db.lists.put(entry.list);

      // Store user's position for this list
      await db.userListSettings.add({
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
// MANUAL SYNC
// ============================================================================

/**
 * Manually trigger sync (called from settings menu)
 * Throws error if offline
 */
export async function manualSync(userId: string): Promise<SyncResult> {
  if (!navigator.onLine) {
    throw new Error('Cannot sync while offline');
  }
  return await sync(userId);
}

/**
 * Reset local database and perform full sync
 * Completely deletes and recreates the local database to fix any corruption
 * Used when user wants to force a complete refresh from server
 */
export async function clearCacheAndSync(userId: string): Promise<SyncResult> {
  if (!navigator.onLine) {
    throw new Error('Cannot sync while offline');
  }

  try {
    // Step 1: Completely delete the IndexedDB database (schema + data)
    // This fixes any schema corruption or migration issues
    await db.delete();

    // Step 2: Reopen the database with fresh schema
    // After delete(), the database connection is closed and must be reopened
    await db.open();

    // Step 3: Ensure database is ready by performing a simple check
    // This ensures all tables are properly created before we try to sync
    await db.lists.count();

    // Step 4: Perform full sync (which fetches all data from server)
    const result = await sync(userId);

    return result;
  } catch (error) {
    console.error('Database reset and sync failed:', error);
    throw error;
  }
}
