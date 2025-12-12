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
  id: number;
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

    // Version 3 schema - fix userListSettings to use auto-increment with proper migration
    this.version(3).stores({
      lists: 'id, owner_id, updated_at',
      items: 'id, list_id, updated_at, _pending',
      userListSettings: '++id, [user_id+list_id]',
      syncMeta: 'key'
    }).upgrade(async (trans) => {
      // Migrate userListSettings data
      try {
        const oldSettings = await trans.table('userListSettings').toArray();

        // Clear the table
        await trans.table('userListSettings').clear();

        // Re-add all settings (Dexie will auto-generate new IDs)
        for (const setting of oldSettings) {
          // Remove the old id field
          const { id, ...settingWithoutId } = setting;
          await trans.table('userListSettings').add(settingWithoutId);
        }
      } catch (error) {
        console.warn('Migration from v2 to v3 failed, clearing userListSettings:', error);
        // If migration fails, just clear the table - data will be resynced
        await trans.table('userListSettings').clear();
      }
    });

    // Version 4 schema - add checkLogs table for statistics
    this.version(4).stores({
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
 */
export async function initializeDatabase(): Promise<void> {
  // Check if already initialized
  const initialized = await db.isInitialized();
  if (initialized) {
    return;
  }

  // Database is empty - will be populated on first sync
  console.log('Local database initialized');
}

/**
 * Delete database (for testing or complete reset)
 */
export async function deleteDatabase(): Promise<void> {
  await db.delete();
  console.log('Local database deleted');
}
