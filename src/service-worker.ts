// PWA service worker for offline functionality
// Implements cache-first strategy for app assets, skips Supabase API calls

/// <reference types="@sveltejs/kit" />
/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

// Declare self as ServiceWorkerGlobalScope
declare let self: ServiceWorkerGlobalScope;

// ============================================================================
// CONFIGURATION
// ============================================================================

const CACHE_NAME = `lists-app-${version}`;
const ASSETS = [...build, ...files];

// ============================================================================
// INSTALL EVENT
// ============================================================================

/**
 * Install event: cache all static assets
 * This runs when the service worker is first installed
 */
self.addEventListener('install', (event: ExtendableEvent) => {
  console.log('[SW] Installing service worker version:', version);

  async function addFilesToCache() {
    try {
      const cache = await caches.open(CACHE_NAME);
      console.log('[SW] Caching app assets...');
      await cache.addAll(ASSETS);
      console.log('[SW] All assets cached successfully');
    } catch (error) {
      console.error('[SW] Failed to cache assets:', error);
      // Continue anyway - app will work online
    }
  }

  event.waitUntil(
    addFilesToCache().then(() => {
      // Skip waiting to activate immediately
      return self.skipWaiting();
    })
  );
});

// ============================================================================
// ACTIVATE EVENT
// ============================================================================

/**
 * Activate event: clean up old caches
 * This runs when the service worker becomes active
 */
self.addEventListener('activate', (event: ExtendableEvent) => {
  console.log('[SW] Activating service worker version:', version);

  async function deleteOldCaches() {
    const cacheKeys = await caches.keys();
    console.log('[SW] Found caches:', cacheKeys);

    const deletionPromises = cacheKeys
      .filter((key) => key !== CACHE_NAME)
      .map((key) => {
        console.log('[SW] Deleting old cache:', key);
        return caches.delete(key);
      });

    await Promise.all(deletionPromises);
    console.log('[SW] Old caches cleaned up');
  }

  event.waitUntil(
    deleteOldCaches().then(() => {
      // Claim all clients immediately
      return self.clients.claim();
    })
  );
});

// ============================================================================
// FETCH EVENT
// ============================================================================

/**
 * Fetch event: handle requests with appropriate caching strategy
 * - Cache-first for app assets
 * - Network-only for Supabase API calls (no caching)
 * - Network-first with cache fallback for everything else
 */
self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip Supabase API calls - never cache these
  if (url.hostname.includes('supabase')) {
    console.log('[SW] Skipping cache for Supabase API:', url.pathname);
    return; // Let browser handle it normally
  }

  // Skip chrome-extension and other special schemes
  if (!url.protocol.startsWith('http')) {
    return;
  }

  async function respond(): Promise<Response> {
    const cache = await caches.open(CACHE_NAME);

    // For app assets (build files and static files), use cache-first
    if (ASSETS.includes(url.pathname)) {
      const cached = await cache.match(request);
      if (cached) {
        console.log('[SW] Serving from cache:', url.pathname);
        return cached;
      }
    }

    // For everything else, try network first
    try {
      const response = await fetch(request);

      // Cache successful responses (but not redirects or errors)
      if (response.status === 200) {
        // Clone the response before caching (response can only be read once)
        cache.put(request, response.clone());
      }

      return response;
    } catch (error) {
      // Network failed, try cache
      console.log('[SW] Network failed, trying cache for:', url.pathname);
      const cached = await cache.match(request);

      if (cached) {
        console.log('[SW] Serving from cache (offline):', url.pathname);
        return cached;
      }

      // No cache available, return error
      console.error('[SW] No cache available for:', url.pathname, error);

      // Return a basic offline page response
      return new Response(
        JSON.stringify({
          error: 'Offline',
          message: 'You are offline and this resource is not cached'
        }),
        {
          status: 503,
          statusText: 'Service Unavailable',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }
  }

  event.respondWith(respond());
});

// ============================================================================
// MESSAGE EVENT
// ============================================================================

/**
 * Message event: handle messages from the app
 * Can be used to trigger cache updates, skip waiting, etc.
 */
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  console.log('[SW] Received message:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            console.log('[SW] Clearing cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      })
    );
  }
});

// ============================================================================
// SYNC EVENT (Background Sync API)
// ============================================================================

/**
 * Sync event: handle background sync
 * This allows queued operations to be retried when connection is restored
 */
self.addEventListener('sync', (event: any) => {
  console.log('[SW] Sync event:', event.tag);

  if (event.tag === 'sync-data') {
    event.waitUntil(
      // Notify the app to perform sync
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'BACKGROUND_SYNC',
            tag: event.tag
          });
        });
      })
    );
  }
});

// ============================================================================
// LOGGING
// ============================================================================

console.log('[SW] Service worker initialized. Version:', version);
console.log('[SW] Caching', ASSETS.length, 'assets');
