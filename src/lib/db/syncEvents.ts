// Sync event helpers for components
// Provides easy-to-use event listeners for sync and realtime changes

import { browser } from '$app/environment';
import { onMount, onDestroy } from 'svelte';
import type { SyncResult } from './sync';

// ============================================================================
// EVENT TYPES
// ============================================================================

export interface RemoteChangeEvent extends CustomEvent {
  detail: void;
}

export interface SyncCompleteEvent extends CustomEvent {
  detail: SyncResult;
}

// ============================================================================
// EVENT LISTENERS FOR COMPONENTS
// ============================================================================

/**
 * Listen for remote changes (via realtime subscriptions)
 * Automatically cleans up on component destroy
 *
 * @example
 * ```ts
 * onRemoteChange(() => {
 *   console.log('Data changed on server');
 *   // Refresh UI, reload data, etc.
 * });
 * ```
 */
export function onRemoteChange(callback: () => void): void {
  if (!browser) return;

  const handler = () => callback();

  onMount(() => {
    window.addEventListener('remote-change', handler);
  });

  onDestroy(() => {
    window.removeEventListener('remote-change', handler);
  });
}

/**
 * Listen for sync completion events
 * Automatically cleans up on component destroy
 *
 * @example
 * ```ts
 * onSyncComplete((result) => {
 *   console.log('Sync completed:', result);
 *   if (result.hasRemoteChanges) {
 *     // Show notification
 *   }
 * });
 * ```
 */
export function onSyncComplete(callback: (result: SyncResult) => void): void {
  if (!browser) return;

  const handler = (event: Event) => {
    const syncEvent = event as SyncCompleteEvent;
    callback(syncEvent.detail);
  };

  onMount(() => {
    window.addEventListener('sync-complete', handler);
  });

  onDestroy(() => {
    window.removeEventListener('sync-complete', handler);
  });
}

// ============================================================================
// MANUAL EVENT DISPATCHERS
// ============================================================================

/**
 * Manually dispatch a remote change event
 * Useful for custom sync logic or testing
 */
export function dispatchRemoteChange(): void {
  if (!browser) return;
  window.dispatchEvent(new CustomEvent('remote-change'));
}

/**
 * Manually dispatch a sync complete event
 * Useful for custom sync logic or testing
 */
export function dispatchSyncComplete(result: SyncResult): void {
  if (!browser) return;
  window.dispatchEvent(new CustomEvent('sync-complete', { detail: result }));
}
