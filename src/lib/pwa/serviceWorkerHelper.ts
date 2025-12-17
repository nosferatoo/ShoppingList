// Service worker helper utilities
// Provides easy registration, update handling, and communication with the service worker

import { browser } from '$app/environment';

// ============================================================================
// TYPES
// ============================================================================

export interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isUpdateAvailable: boolean;
  registration: ServiceWorkerRegistration | null;
}

// ============================================================================
// STATE
// ============================================================================

let state: ServiceWorkerState = {
  isSupported: browser && 'serviceWorker' in navigator,
  isRegistered: false,
  isUpdateAvailable: false,
  registration: null
};

// ============================================================================
// REGISTRATION
// ============================================================================

/**
 * Register the service worker
 * Call this once on app initialization (in root layout)
 *
 * @example
 * ```ts
 * onMount(() => {
 *   registerServiceWorker();
 * });
 * ```
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!state.isSupported) {
    return null;
  }

  // Skip service worker registration in development
  // Service worker only works properly in production build
  if (import.meta.env.DEV) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js');

    state.isRegistered = true;
    state.registration = registration;

    // Check for updates
    setupUpdateHandler(registration);

    // Listen for controller change (new SW activated)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // Optionally reload the page to use the new service worker
      // window.location.reload();
    });

    return registration;
  } catch (error) {
    console.error('[PWA] Service worker registration failed:', error);
    return null;
  }
}

/**
 * Unregister the service worker
 * Useful for debugging or disabling PWA features
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!state.registration) {
    return false;
  }

  try {
    const result = await state.registration.unregister();
    state.isRegistered = false;
    state.registration = null;
    return result;
  } catch (error) {
    console.error('[PWA] Failed to unregister service worker:', error);
    return false;
  }
}

// ============================================================================
// UPDATE HANDLING
// ============================================================================

/**
 * Set up handler for service worker updates
 */
function setupUpdateHandler(registration: ServiceWorkerRegistration): void {
  // Check for updates on page load
  registration.update();

  // Check for updates periodically (every hour)
  setInterval(
    () => {
      registration.update();
    },
    60 * 60 * 1000
  ); // 1 hour

  // Listen for new service worker installing
  registration.addEventListener('updatefound', () => {
    const newWorker = registration.installing;

    if (!newWorker) return;

    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        // New service worker installed and waiting to activate
        state.isUpdateAvailable = true;

        // Dispatch event so UI can show update notification
        window.dispatchEvent(new CustomEvent('sw-update-available'));
      }
    });
  });
}

/**
 * Skip waiting and activate new service worker
 * Call this when user clicks "Update now" button
 */
export async function skipWaitingAndUpdate(): Promise<void> {
  if (!state.registration || !state.registration.waiting) {
    return;
  }

  // Tell the waiting service worker to skip waiting
  state.registration.waiting.postMessage({ type: 'SKIP_WAITING' });

  // Reload the page to use the new service worker
  window.location.reload();
}

/**
 * Check if update is available
 */
export function isUpdateAvailable(): boolean {
  return state.isUpdateAvailable;
}

// ============================================================================
// COMMUNICATION
// ============================================================================

/**
 * Send a message to the service worker
 *
 * @example
 * ```ts
 * sendMessageToServiceWorker({ type: 'CLEAR_CACHE' });
 * ```
 */
export async function sendMessageToServiceWorker(message: any): Promise<void> {
  if (!state.registration || !state.registration.active) {
    console.warn('[PWA] No active service worker to send message to');
    return;
  }

  state.registration.active.postMessage(message);
}

/**
 * Clear all caches
 * Useful for debugging or forcing fresh data
 */
export async function clearAllCaches(): Promise<void> {
  try {
    const cacheNames = await caches.keys();

    await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));

    // Also tell service worker to clear its caches
    await sendMessageToServiceWorker({ type: 'CLEAR_CACHE' });
  } catch (error) {
    console.error('[PWA] Failed to clear caches:', error);
  }
}

/**
 * Unregister ALL service workers and clear ALL caches
 * Use this to fix service worker errors during development
 *
 * **NUCLEAR OPTION** - Only use when service workers are causing issues
 */
export async function nukeCacheAndServiceWorkers(): Promise<void> {
  try {
    // 1. Unregister all service workers
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((reg) => reg.unregister()));

    // 2. Clear all caches
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));

    // 3. Reload page
    window.location.reload();
  } catch (error) {
    console.error('[PWA] ❌ Failed to nuke cache:', error);
  }
}

// Expose cleanup utility to window for easy console access during development
if (import.meta.env.DEV && browser) {
  (window as any).__nukePWA = nukeCacheAndServiceWorkers;
}

// ============================================================================
// BACKGROUND SYNC
// ============================================================================

/**
 * Register a background sync
 * This will trigger when the device comes back online
 *
 * @param tag - Unique identifier for this sync operation
 */
export async function registerBackgroundSync(tag: string): Promise<void> {
  if (!state.registration) {
    console.warn('[PWA] No service worker registered for background sync');
    return;
  }

  // Check if Background Sync API is supported
  if (!('sync' in state.registration)) {
    console.warn('[PWA] Background Sync API not supported');
    return;
  }

  try {
    await (state.registration as any).sync.register(tag);
  } catch (error) {
    console.error('[PWA] Failed to register background sync:', error);
  }
}

/**
 * Listen for background sync messages from service worker
 */
export function onBackgroundSync(callback: (tag: string) => void): void {
  if (!browser) return;

  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'BACKGROUND_SYNC') {
      callback(event.data.tag);
    }
  });
}

// ============================================================================
// INSTALL PROMPT
// ============================================================================

let deferredPrompt: any = null;

/**
 * Capture the install prompt event
 * Call this in root layout to enable install button
 */
export function captureInstallPrompt(): void {
  if (!browser) return;

  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();

    // Stash the event so it can be triggered later
    deferredPrompt = e;

    // Dispatch event so UI can show install button
    window.dispatchEvent(new CustomEvent('pwa-install-available'));
  });

  // Listen for app installed event
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;

    // Dispatch event so UI can hide install button
    window.dispatchEvent(new CustomEvent('pwa-installed'));
  });
}

/**
 * Show the install prompt
 * Call this when user clicks "Install app" button
 */
export async function showInstallPrompt(): Promise<boolean> {
  if (!deferredPrompt) {
    return false;
  }

  // Show the install prompt
  deferredPrompt.prompt();

  // Wait for the user to respond to the prompt
  const { outcome } = await deferredPrompt.userChoice;

  // Clear the deferred prompt
  deferredPrompt = null;

  return outcome === 'accepted';
}

/**
 * Check if app can be installed
 */
export function canInstall(): boolean {
  return deferredPrompt !== null;
}

/**
 * Check if app is installed (running in standalone mode)
 */
export function isInstalled(): boolean {
  if (!browser) return false;

  // Check if running in standalone mode
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

  // iOS Safari standalone check
  const isIOSStandalone = (navigator as any).standalone === true;

  return isStandalone || isIOSStandalone;
}

// ============================================================================
// EXPORTS
// ============================================================================

export function getServiceWorkerState(): ServiceWorkerState {
  return state;
}
