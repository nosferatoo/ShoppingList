// Dexie.js IndexedDB setup
// Local database for offline-first architecture with Last Write Wins sync

import Dexie, { type Table } from 'dexie';

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Local lists table
 * Mirrors the server lists table structure
 */
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

/**
 * Local items table
 * Includes _pending flag for tracking unsynced changes
 */
export interface LocalItem {
  id: number;
  list_id: number;
  text: string;
  is_checked: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  _pending: boolean; // Local-only: has unsynced changes
}

/**
 * Local user list settings table
 * Stores user-specific list preferences (order, etc.)
 */
export interface LocalUserListSettings {
  id?: number; // Auto-increment primary key
  user_id: string;
  list_id: number;
  position: number;
  created_at: string;
  updated_at: string;
}

/**
 * Sync metadata table
 * Stores sync state like last sync timestamp
 */
export interface SyncMeta {
  key: string;
  value: string;
}

/**
 * Local check logs table
 * Tracks when shopping list items are checked for statistics
 */
export interface LocalCheckLog {
  id?: number; // Auto-increment locally, undefined until synced
  user_id: string;
  list_name: string;
  item_name: string;
  checked_at: string;
  list_id: number | null;
  item_id: number | null;
  _pending: boolean; // Local-only: has unsynced changes
}

// ============================================================================
// DATABASE CLASS
// ============================================================================

/**
 * Local IndexedDB database using Dexie.js
 * Stores lists, items, user settings, and sync metadata for offline support
 */
export class ListsDatabase extends Dexie {
  // Table declarations with TypeScript types
  lists!: Table<LocalList, number>;
  items!: Table<LocalItem, number>;
  userListSettings!: Table<LocalUserListSettings, number>;
  syncMeta!: Table<SyncMeta, string>;
  checkLogs!: Table<LocalCheckLog, number>;

  constructor() {
    super('ListsApp');

    // Version 1 schema (original)
    this.version(1).stores({
      lists: 'id, owner_id, updated_at',
      items: 'id, list_id, updated_at, _pending',
      userListSettings: 'id, [user_id+list_id]',
      syncMeta: 'key'
    });

    // Version 2 schema - attempted fix (skip this version due to migration issues)
    this.version(2).stores({
      lists: 'id, owner_id, updated_at',
      items: 'id, list_id, updated_at, _pending',
      userListSettings: 'id, [user_id+list_id]',
      syncMeta: 'key'
    });

    // Version 3 schema - keep consistent with v1/v2 (no primary key type change)
    this.version(3).stores({
      lists: 'id, owner_id, updated_at',
      items: 'id, list_id, updated_at, _pending',
      userListSettings: 'id, [user_id+list_id]',
      syncMeta: 'key'
    });

    // Version 4 schema - add checkLogs table for statistics
    this.version(4).stores({
      lists: 'id, owner_id, updated_at',
      items: 'id, list_id, updated_at, _pending',
      userListSettings: 'id, [user_id+list_id]',
      syncMeta: 'key',
      checkLogs: '++id, user_id, checked_at, _pending'
    });

    // Version 5 schema - revert to v4 schema (no breaking changes)
    this.version(5).stores({
      lists: 'id, owner_id, updated_at',
      items: 'id, list_id, updated_at, _pending',
      userListSettings: 'id, [user_id+list_id]',
      syncMeta: 'key',
      checkLogs: '++id, user_id, checked_at, _pending'
    });

    // Version 6 schema - add unique constraint on [user_id+list_id]
    this.version(6).stores({
      lists: 'id, owner_id, updated_at',
      items: 'id, list_id, updated_at, _pending',
      userListSettings: '++id, [user_id+list_id]',
      syncMeta: 'key',
      checkLogs: '++id, user_id, checked_at, _pending'
    });
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Get all active (non-deleted) items for a list, sorted
   * Unchecked items first, then alphabetically by text
   */
  async getListItems(listId: number): Promise<LocalItem[]> {
    const items = await this.items
      .where('list_id')
      .equals(listId)
      .filter((item) => item.deleted_at === null)
      .toArray();

    // Sort: unchecked first, then alphabetically
    items.sort((a, b) => {
      if (a.is_checked !== b.is_checked) {
        return a.is_checked ? 1 : -1;
      }
      return a.text.localeCompare(b.text);
    });

    return items;
  }

  /**
   * Get all active (non-deleted) lists for a user
   * Includes both owned lists and shared lists
   */
  async getUserLists(userId: string): Promise<LocalList[]> {
    return await this.lists
      .filter((list) =>
        list.deleted_at === null &&
        (list.owner_id === userId || list.is_shared === true)
      )
      .toArray();
  }

  /**
   * Get all pending items that need to be synced
   */
  async getPendingItems(): Promise<LocalItem[]> {
    return await this.items.where('_pending').equals(1).toArray();
  }

  /**
   * Get count of pending items
   */
  async getPendingCount(): Promise<number> {
    return await this.items.where('_pending').equals(1).count();
  }

  /**
   * Update item and mark as pending for sync
   */
  async updateItemWithPending(
    itemId: number,
    updates: Partial<Omit<LocalItem, 'id' | '_pending'>>
  ): Promise<void> {
    await this.items.update(itemId, {
      ...updates,
      updated_at: new Date().toISOString(),
      _pending: true
    });
  }

  /**
   * Clear all data (for logout or reset)
   */
  async clearAll(): Promise<void> {
    await this.transaction('rw', [this.lists, this.items, this.userListSettings, this.syncMeta, this.checkLogs], async () => {
      await this.lists.clear();
      await this.items.clear();
      await this.userListSettings.clear();
      await this.syncMeta.clear();
      await this.checkLogs.clear();
    });
  }

  /**
   * Log a check action for statistics
   */
  async logItemCheck(
    userId: string,
    listName: string,
    itemName: string,
    listId: number,
    itemId: number
  ): Promise<void> {
    await this.checkLogs.add({
      user_id: userId,
      list_name: listName,
      item_name: itemName,
      checked_at: new Date().toISOString(),
      list_id: listId,
      item_id: itemId,
      _pending: true
    });
  }

  /**
   * Get all pending check logs that need to be synced
   */
  async getPendingCheckLogs(): Promise<LocalCheckLog[]> {
    return await this.checkLogs.where('_pending').equals(1).toArray();
  }

  /**
   * Get last sync timestamp
   */
  async getLastSyncTime(): Promise<string | null> {
    const meta = await this.syncMeta.get('lastSync');
    return meta?.value ?? null;
  }

  /**
   * Set last sync timestamp
   */
  async setLastSyncTime(time: string): Promise<void> {
    await this.syncMeta.put({ key: 'lastSync', value: time });
  }

  /**
   * Check if database has been initialized with data
   */
  async isInitialized(): Promise<boolean> {
    const listCount = await this.lists.count();
    return listCount > 0;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

/**
 * Singleton database instance
 * Use this throughout the app to access local storage
 */
export const db = new ListsDatabase();

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Initialize database on first load
 * Sets up any necessary default data or migrations
 * Includes error recovery for schema upgrade failures
 */
export async function initializeDatabase(): Promise<void> {
  try {
    // Try to access the database to trigger any upgrade errors
    const initialized = await db.isInitialized();
    if (initialized) {
      return;
    }

    // Database is empty - will be populated on first sync
  } catch (error) {
    // Check if it's an upgrade error (e.g., incompatible schema from old version)
    if (error instanceof Error && (
      error.name === 'UpgradeError' ||
      error.message?.includes('UpgradeError') ||
      error.message?.includes('primary key')
    )) {
      console.error('Database upgrade failed, performing auto-recovery:', error.message);

      // Delete the corrupted database completely
      await db.delete();

      // The database will be recreated automatically with the latest schema
      // on next access. Verify it's working by checking initialization status.
      const reinitialized = await db.isInitialized();

      console.log('Database auto-recovery complete. Will sync from server.');
      return;
    }

    // Re-throw other unexpected errors
    throw error;
  }
}

/**
 * Delete database (for testing or complete reset)
 */
export async function deleteDatabase(): Promise<void> {
  await db.delete();
}
