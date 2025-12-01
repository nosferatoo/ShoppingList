# PWA (Progressive Web App) Guide

Complete guide for the PWA implementation including service worker, offline support, and installation.

## Overview

This app is a fully functional PWA with:

- **Offline-first architecture**: Works without internet connection
- **App-like experience**: Installable on iOS and Android devices
- **Automatic updates**: New versions install seamlessly
- **Background sync**: Queued changes sync when online
- **Fast loading**: Assets cached for instant load times

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser/Device                           │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Service Worker (SW)                       │ │
│  │  ┌──────────────────────────────────────────────────┐ │ │
│  │  │  Cache Strategy:                                 │ │ │
│  │  │  - Cache-first for app assets                    │ │ │
│  │  │  - Network-only for Supabase API                 │ │ │
│  │  │  - Network-first with fallback for other         │ │ │
│  │  └──────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────┘ │
│                          │                                   │
│                          ▼                                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                 Cache Storage                          │ │
│  │  - HTML pages                                          │ │
│  │  - JavaScript bundles                                  │ │
│  │  - CSS stylesheets                                     │ │
│  │  - Fonts, images, icons                                │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                   IndexedDB                            │ │
│  │  - Lists data                                          │ │
│  │  - Items data                                          │ │
│  │  - Sync metadata                                       │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Service Worker

### Location
- **Source**: `src/service-worker.ts`
- **Built**: `build/service-worker.js` (generated during build)

### Cache Strategy

#### Cache-First (App Assets)
```
Request for app asset
    ↓
Check cache
    ↓
Found? → Return from cache ✅
    ↓
Not found? → Fetch from network → Cache → Return
```

**Used for:**
- HTML pages (`/`, `/login`, etc.)
- JavaScript bundles
- CSS files
- Static assets (fonts, images)

#### Network-Only (Supabase API)
```
Request to *.supabase.co
    ↓
Skip cache completely
    ↓
Fetch from network directly
```

**Used for:**
- All Supabase API calls
- Authentication requests
- Database queries

**Why:** API responses should never be cached - they change frequently and caching would cause stale data issues.

#### Network-First with Fallback (Everything Else)
```
Request
    ↓
Try network
    ↓
Success? → Cache response → Return ✅
    ↓
Failed? → Try cache
    ↓
Found? → Return from cache ✅
    ↓
Not found? → Return 503 error
```

**Used for:**
- External resources
- CDN assets
- Third-party scripts

### Events Handled

1. **Install** - Cache all app assets
2. **Activate** - Clean up old caches
3. **Fetch** - Intercept network requests
4. **Message** - Handle messages from app
5. **Sync** - Background sync when online

## PWA Helper Utilities

### Location
`src/lib/pwa/serviceWorkerHelper.ts`

### Key Functions

#### Register Service Worker
```ts
import { registerServiceWorker } from '$lib/pwa/serviceWorkerHelper';

// In root layout
onMount(() => {
  registerServiceWorker();
});
```

#### Handle Updates
```ts
import { skipWaitingAndUpdate } from '$lib/pwa/serviceWorkerHelper';

// Listen for update available
window.addEventListener('sw-update-available', () => {
  // Show update notification to user
  showUpdateNotification();
});

// When user clicks "Update now"
async function updateApp() {
  await skipWaitingAndUpdate(); // This will reload the page
}
```

#### Install App
```ts
import { showInstallPrompt, canInstall } from '$lib/pwa/serviceWorkerHelper';

// Check if app can be installed
let showInstallButton = $derived(canInstall());

// Show install prompt
async function installApp() {
  const accepted = await showInstallPrompt();
  if (accepted) {
    console.log('App installed!');
  }
}
```

#### Clear Caches (Debugging)
```ts
import { clearAllCaches } from '$lib/pwa/serviceWorkerHelper';

async function resetApp() {
  await clearAllCaches();
  window.location.reload();
}
```

## Manifest Configuration

### Location
`static/manifest.json`

### Key Settings

```json
{
  "name": "Shopping & To-Do Lists",
  "short_name": "Lists",
  "display": "standalone",
  "start_url": "/",
  "theme_color": "#0a0a0a",
  "background_color": "#0a0a0a",
  "icons": [...],
  "shortcuts": [...]
}
```

### App Shortcuts

The app provides two shortcuts that appear when long-pressing the app icon:

1. **Shopping List** - Opens directly to shopping lists
2. **To-Do List** - Opens directly to to-do lists

## Icons Setup

### Required Icons

You need to create two PNG icons in `static/icons/`:

1. **icon-192.png** (192x192 pixels)
2. **icon-512.png** (512x512 pixels)

### Design Guidelines

- **Safe area**: Keep important content within 80% of canvas
- **Maskable**: Design works with various shapes (circle, rounded square)
- **Simple**: Clear, recognizable icon at small sizes
- **Brand**: Use app colors (dark background #0a0a0a)

### Creating Icons

**Option 1: Design Tool**
```
1. Create 512x512 artboard
2. Design icon with 10% padding
3. Export as PNG
4. Resize to create 192x192 version
```

**Option 2: Icon Generator**
- Use [PWA Asset Generator](https://www.pwabuilder.com/imageGenerator)
- Upload a single large icon
- Download all required sizes

**Option 3: Simple Placeholder**
```bash
# For development, create simple colored squares
# (Replace with proper icons for production)
```

### Testing Icons

1. Install app on device
2. Check home screen icon
3. Check app switcher/task manager
4. Check notification icons (if applicable)

## Testing PWA Features

### Test Offline Functionality

1. **Chrome DevTools**
   ```
   F12 → Network tab → Throttling → Offline
   ```

2. **Lighthouse Audit**
   ```
   F12 → Lighthouse tab → Generate report
   ```
   Check:
   - ✅ Installable
   - ✅ Works offline
   - ✅ Fast load times

3. **Manual Testing**
   ```
   1. Load app while online
   2. Turn off WiFi/data
   3. Navigate around app
   4. Check items still load
   5. Make changes (should queue)
   6. Turn WiFi/data back on
   7. Changes should sync
   ```

### Test Installation

#### Desktop (Chrome/Edge)
1. Visit app
2. Look for install icon in address bar
3. Click to install
4. App opens in standalone window

#### iOS Safari
1. Visit app in Safari
2. Tap Share button
3. Scroll down, tap "Add to Home Screen"
4. Icon appears on home screen

#### Android Chrome
1. Visit app
2. Banner appears or tap menu
3. Select "Install app"
4. App appears in app drawer

### Test Updates

1. **Deploy new version**
   ```bash
   npm run build
   # Deploy to hosting
   ```

2. **Client receives update**
   - Service worker downloads in background
   - `sw-update-available` event fires
   - User sees update notification

3. **User accepts update**
   - Clicks "Update now"
   - `skipWaitingAndUpdate()` called
   - Page reloads with new version

## Debugging

### Service Worker Console

```js
// Check registration
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('SW registration:', reg);
  console.log('Active:', reg.active);
  console.log('Waiting:', reg.waiting);
  console.log('Installing:', reg.installing);
});

// Check caches
caches.keys().then(names => {
  console.log('Cache names:', names);
});

caches.open('lists-app-v1').then(cache => {
  cache.keys().then(keys => {
    console.log('Cached items:', keys.length);
  });
});
```

### Chrome DevTools

1. **Application Tab**
   - Service Workers: Status, update, unregister
   - Cache Storage: Inspect cached files
   - Manifest: Validate manifest.json

2. **Network Tab**
   - Filter by "Service Worker"
   - See which requests served from cache

3. **Console**
   - Service worker logs prefixed with `[SW]`
   - PWA helper logs prefixed with `[PWA]`

### Common Issues

#### Service Worker Not Registering
```
✓ Check browser support: 'serviceWorker' in navigator
✓ Check HTTPS (required except localhost)
✓ Check console for registration errors
✓ Verify service-worker.js is accessible
```

#### Assets Not Caching
```
✓ Check cache size limits (varies by browser)
✓ Verify assets in ASSETS array
✓ Check network tab for failed requests
✓ Clear cache and hard reload
```

#### Update Not Applying
```
✓ Check if new SW is waiting: reg.waiting
✓ Call skipWaiting() from new SW
✓ Reload page after activation
✓ Close all tabs and reopen
```

## Best Practices

### 1. Version Management
```ts
// Service worker automatically versions cache
const CACHE_NAME = `lists-app-${version}`;
// version changes on every build
```

### 2. Update Strategy
```ts
// Don't force updates - let user choose
window.addEventListener('sw-update-available', () => {
  // Show non-intrusive notification
  showToast({
    message: 'New version available',
    action: {
      label: 'Update',
      onClick: () => skipWaitingAndUpdate()
    }
  });
});
```

### 3. Cache Size
```ts
// Keep cache size reasonable
// Don't cache:
// - Large videos
// - User-uploaded files
// - API responses
```

### 4. Offline UX
```ts
// Show clear offline state
if (!navigator.onLine) {
  showBanner('You are offline');
}

// Disable create actions
<button disabled={!isOnline}>
  Add Item (requires connection)
</button>
```

### 5. Testing
```ts
// Test all three states:
// 1. First visit (no cache)
// 2. Offline (cache only)
// 3. Update available (cache + new version)
```

## Performance Metrics

### Target Metrics

- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3.5s
- **Lighthouse PWA Score**: > 90
- **Offline**: Fully functional

### Optimization

1. **Precache critical assets**
   - HTML shell
   - Critical CSS
   - Core JavaScript

2. **Lazy load non-critical**
   - Route-level code splitting
   - Image lazy loading
   - Deferred scripts

3. **Minimize cache**
   - Only cache what's needed
   - Clean up old versions
   - Set reasonable expiration

## Resources

- [SvelteKit Service Workers](https://kit.svelte.dev/docs/service-workers)
- [PWA Checklist](https://web.dev/pwa-checklist/)
- [Workbox (advanced)](https://developers.google.com/web/tools/workbox)
- [MDN Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
