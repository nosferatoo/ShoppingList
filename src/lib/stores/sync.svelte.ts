// Sync status state (Svelte 5 runes)
// Manages sync state, triggers, and realtime subscriptions

import { browser } from '$app/environment';
import { sync, initSyncListeners, manualSync, clearCacheAndSync, subscribeToChanges, getLastSyncTime, type SyncResult } from '$lib/db/sync';
import { db } from '$lib/db/local';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types';

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
  supabase: SupabaseClient<Database> | null;
}

let state = $state<SyncState>({
  isSyncing: false,
  isClearingCache: false,
  isOnline: browser ? navigator.onLine : true,
  lastSyncAt: null,
  pendingCount: 0,
  error: null,
  hasRemoteChanges: false,
  supabase: null
});

// Realtime unsubscribe function
let realtimeUnsubscribe: (() => void) | null = null;

// ============================================================================
// SYNC STORE
// ============================================================================

/**
 * Sync store using Svelte 5 runes
 * Manages sync state, online/offline status, and realtime subscriptions
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
   * Sets up online/offline listeners and sync triggers
   *
   * @param userId - Current user's ID
   * @param supabase - Supabase client from +layout.ts (configured with SvelteKit fetch)
   */
  async initialize(userId: string, supabase: SupabaseClient<Database>): Promise<void> {
    if (!browser) return;

    // Store supabase client
    state.supabase = supabase;

    // Set up online/offline status listeners
    this.setupNetworkListeners();

    // Initialize automatic sync listeners (visibility change, online event)
    initSyncListeners((result) => {
      this.handleSyncComplete(result);
    });

    // Set up realtime subscriptions
    this.setupRealtimeSubscriptions(userId);

    // Update pending count
    await this.updatePendingCount();

    // Get last sync time
    await this.updateLastSyncTime();
  },

  /**
   * Set up network status listeners
   */
  setupNetworkListeners(): void {
    if (!browser) return;

    // Set initial online status
    state.isOnline = navigator.onLine;

    // Listen for online event
    window.addEventListener('online', () => {
      state.isOnline = true;
      state.error = null;
    });

    // Listen for offline event
    window.addEventListener('offline', () => {
      state.isOnline = false;
    });
  },

  /**
   * Set up realtime subscriptions for lists and items
   */
  setupRealtimeSubscriptions(userId: string): void {
    if (!browser || !state.supabase) return;

    // Unsubscribe from previous subscription if exists
    if (realtimeUnsubscribe) {
      realtimeUnsubscribe();
      realtimeUnsubscribe = null;
    }

    // Subscribe to changes
    realtimeUnsubscribe = subscribeToChanges(state.supabase, userId, () => {
      // Remote change detected
      state.hasRemoteChanges = true;

      // Trigger a callback or event that UI can listen to
      if (browser) {
        window.dispatchEvent(new CustomEvent('remote-change'));
      }
    });
  },

  /**
   * Unsubscribe from realtime changes
   */
  unsubscribeRealtime(): void {
    if (realtimeUnsubscribe) {
      realtimeUnsubscribe();
      realtimeUnsubscribe = null;
    }
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

    if (!state.supabase) {
      state.error = 'Supabase client not initialized';
      throw new Error('Supabase client not initialized');
    }

    state.isSyncing = true;
    state.error = null;

    try {
      const result = await manualSync(state.supabase);
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

    if (!state.supabase) {
      state.error = 'Supabase client not initialized';
      throw new Error('Supabase client not initialized');
    }

    state.isClearingCache = true;
    state.error = null;

    try {
      const result = await clearCacheAndSync(state.supabase);
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
    if (browser && result.hasRemoteChanges) {
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
    this.unsubscribeRealtime();
    state.supabase = null;
  }
};

// ============================================================================
// LEGACY EXPORT (for backwards compatibility)
// ============================================================================

/**
 * @deprecated Use syncStore instead
 */
export function createSyncStore() {
  return syncStore;
}
