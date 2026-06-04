// Sync status state (Svelte 5 runes)
// Manages sync state, triggers, and SSE subscriptions

import { browser } from '$app/environment';
import { sync, manualSync, clearCacheAndSync, getLastSyncTime, type SyncResult } from '$lib/db/sync';
import { db } from '$lib/db/local';

// ============================================================================
// STATE
// ============================================================================

interface SyncState {
  isSyncing: boolean;
  isClearingCache: boolean;
  isOnline: boolean;
  lastSyncAt: Date | null;
  pendingCount: number;
  error: string | null;
  hasRemoteChanges: boolean;
}

let state = $state<SyncState>({
  isSyncing: false,
  isClearingCache: false,
  isOnline: browser ? navigator.onLine : true,
  lastSyncAt: null,
  pendingCount: 0,
  error: null,
  hasRemoteChanges: false
});

// EventSource and interval references
let eventSource: EventSource | null = null;
let safetyNetInterval: ReturnType<typeof setInterval> | null = null;
let currentUserId: string | null = null;

// Network listener references for cleanup
let onlineHandler: (() => void) | null = null;
let offlineHandler: (() => void) | null = null;

// ============================================================================
// SYNC STORE
// ============================================================================

/**
 * Sync store using Svelte 5 runes
 * Manages sync state, online/offline status, and SSE subscriptions
 */
export const syncStore = {
  // ============================================================================
  // GETTERS
  // ============================================================================

  get isSyncing() {
    return state.isSyncing;
  },

  get isOnline() {
    return state.isOnline;
  },

  get lastSyncAt() {
    return state.lastSyncAt;
  },

  get pendingCount() {
    return state.pendingCount;
  },

  get error() {
    return state.error;
  },

  get hasRemoteChanges() {
    return state.hasRemoteChanges;
  },

  get isClearingCache() {
    return state.isClearingCache;
  },

  // ============================================================================
  // ACTIONS
  // ============================================================================

  /**
   * Initialize sync system
   * Sets up online/offline listeners, EventSource, and safety-net interval
   */
  initialize(userId: string): void {
    if (!browser) return;

    currentUserId = userId;

    // Set up online/offline status listeners
    this.setupNetworkListeners();

    // Set up EventSource for SSE
    this.setupEventSource();

    // Set up 5-minute safety-net interval
    safetyNetInterval = setInterval(() => {
      if (state.isOnline && !state.isSyncing && currentUserId) {
        this.performSync().catch((error) => {
          console.error('Safety-net sync failed:', error);
        });
      }
    }, 5 * 60 * 1000);

    // Update pending count and last sync time
    this.updatePendingCount();
    this.updateLastSyncTime();
  },

  /**
   * Set up network status listeners
   */
  setupNetworkListeners(): void {
    if (!browser) return;

    // Set initial online status
    state.isOnline = navigator.onLine;

    // Create handlers we can remove later
    onlineHandler = () => {
      state.isOnline = true;
      state.error = null;
    };

    offlineHandler = () => {
      state.isOnline = false;
    };

    window.addEventListener('online', onlineHandler);
    window.addEventListener('offline', offlineHandler);
  },

  /**
   * Set up EventSource for server-sent events
   */
  setupEventSource(): void {
    if (!browser) return;

    // Close existing EventSource if any
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }

    eventSource = new EventSource('/api/events');

    eventSource.addEventListener('change', () => {
      state.hasRemoteChanges = true;
      // Sync fresh data from server into IndexedDB, then notify UI
      this.performSync().catch((error) => {
        console.error('SSE-triggered sync failed:', error);
      });
    });

    eventSource.onerror = () => {
      console.error('EventSource error, browser will auto-reconnect');
    };
  },

  /**
   * Perform manual sync
   */
  async performSync(): Promise<SyncResult | null> {
    if (state.isSyncing) {
      return null;
    }

    if (!state.isOnline) {
      state.error = 'Cannot sync while offline';
      throw new Error('Cannot sync while offline');
    }

    if (!currentUserId) {
      state.error = 'Not authenticated';
      throw new Error('Not authenticated');
    }

    state.isSyncing = true;
    state.error = null;

    try {
      const result = await manualSync(currentUserId);
      this.handleSyncComplete(result);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sync failed';
      state.error = message;
      console.error('Manual sync failed:', error);
      throw error;
    } finally {
      state.isSyncing = false;
    }
  },

  /**
   * Perform clear cache and sync operation
   */
  async performClearCacheAndSync(): Promise<SyncResult | null> {
    if (state.isSyncing || state.isClearingCache) {
      return null;
    }

    if (!state.isOnline) {
      state.error = 'Cannot sync while offline';
      throw new Error('Cannot sync while offline');
    }

    if (!currentUserId) {
      state.error = 'Not authenticated';
      throw new Error('Not authenticated');
    }

    state.isClearingCache = true;
    state.error = null;

    try {
      const result = await clearCacheAndSync(currentUserId);
      this.handleSyncComplete(result);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Clear cache and sync failed';
      state.error = message;
      console.error('Clear cache and sync failed:', error);
      throw error;
    } finally {
      state.isClearingCache = false;
    }
  },

  /**
   * Handle sync completion
   */
  handleSyncComplete(result: SyncResult): void {
    // Update state
    state.hasRemoteChanges = result.hasRemoteChanges;

    // Update last sync time and pending count
    this.updateLastSyncTime();
    this.updatePendingCount();

    // Dispatch event for UI updates
    if (browser) {
      window.dispatchEvent(new CustomEvent('sync-complete', { detail: result }));
    }
  },

  /**
   * Update pending items count
   */
  async updatePendingCount(): Promise<void> {
    try {
      const count = await db.getPendingCount();
      state.pendingCount = count;
    } catch (error) {
      console.error('Failed to update pending count:', error);
    }
  },

  /**
   * Update last sync timestamp
   */
  async updateLastSyncTime(): Promise<void> {
    try {
      const lastSync = await getLastSyncTime();
      state.lastSyncAt = lastSync ? new Date(lastSync) : null;
    } catch (error) {
      console.error('Failed to update last sync time:', error);
    }
  },

  /**
   * Clear error
   */
  clearError(): void {
    state.error = null;
  },

  /**
   * Clear remote changes flag
   */
  clearRemoteChanges(): void {
    state.hasRemoteChanges = false;
  },

  /**
   * Clean up subscriptions and listeners
   */
  cleanup(): void {
    // Close EventSource
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }

    // Clear safety-net interval
    if (safetyNetInterval) {
      clearInterval(safetyNetInterval);
      safetyNetInterval = null;
    }

    // Remove network listeners
    if (onlineHandler) {
      window.removeEventListener('online', onlineHandler);
      onlineHandler = null;
    }
    if (offlineHandler) {
      window.removeEventListener('offline', offlineHandler);
      offlineHandler = null;
    }

    currentUserId = null;
  }
};
