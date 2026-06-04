<script lang="ts">
  import { onMount } from 'svelte';
  import { authStore } from '$lib/stores/auth.svelte';
  import { syncStore } from '$lib/stores/sync.svelte';
  import { themeStore } from '$lib/stores/theme.svelte';
  import { registerServiceWorker, captureInstallPrompt } from '$lib/pwa/serviceWorkerHelper';
  import { Toaster } from '$lib/components/ui/sonner';
  import '../app.css';

  // Props from layout load
  interface Props {
    children: import('svelte').Snippet;
    data: {
      user: { id: string; email: string } | null;
    };
  }

  let { children, data }: Props = $props();

  // Initialize app on mount
  onMount(() => {
    // Detect Chromium browsers for performance optimizations
    // Chrome desktop has issues with backdrop-filter blur
    if (/Chrome|Chromium/.test(navigator.userAgent)) {
      document.body.classList.add('chromium');
    }

    // Register service worker for PWA offline support
    registerServiceWorker();

    // Capture install prompt for "Add to Home Screen" functionality
    captureInstallPrompt();

    // Initialize if user is authenticated
    if (data.user) {
      authStore.setUser(data.user);

      // Initialize theme with user preferences
      themeStore.setUser(data.user.id).catch((error) => {
        console.error('Theme initialization failed:', error);
      });

      // Initialize sync
      syncStore.initialize(data.user.id);
      syncStore.performSync().catch((error) => {
        console.error('Initial sync failed:', error);
      });
    }

    // Sync when app regains focus
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && authStore.userId) {
        syncStore.performSync().catch((error) => {
          console.error('Sync after focus failed:', error);
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup on component destroy
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      syncStore.cleanup();
    };
  });
</script>

<Toaster position="bottom-center" />
{@render children()}
