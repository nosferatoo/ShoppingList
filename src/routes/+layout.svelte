<script lang="ts">
  import { invalidate } from '$app/navigation';
  import { onMount } from 'svelte';
  import { authStore } from '$lib/stores/auth.svelte';
  import { syncStore } from '$lib/stores/sync.svelte';
  import { themeStore } from '$lib/stores/theme.svelte';
  import { registerServiceWorker, captureInstallPrompt } from '$lib/pwa/serviceWorkerHelper';
  import { setSupabaseContext } from '$lib/db/supabase.context.svelte';
  import { Toaster } from '$lib/components/ui/sonner';
  import '../app.css';

  // Props from layout load
  interface Props {
    children: import('svelte').Snippet;
    data: {
      supabase: import('@supabase/supabase-js').SupabaseClient;
      session: import('@supabase/supabase-js').Session | null;
    };
  }

  let { children, data }: Props = $props();

  // Set Supabase context for child components
  // This ensures all components use the properly-configured client from +layout.ts
  setSupabaseContext(data.supabase);

  // Watch for session changes and update auth store
  $effect(() => {
    // When session changes (e.g., after login/logout), update the auth store
    if (data.session) {
      // Force re-initialization by updating the state even if already initialized
      authStore.initialize(data.supabase, data.session).catch((error) => {
        console.error('Auth initialization failed:', error);
      });
    }
  });

  // Initialize app on mount
  onMount(() => {
    // Register service worker for PWA offline support
    registerServiceWorker();

    // Capture install prompt for "Add to Home Screen" functionality
    captureInstallPrompt();

    // Track current user ID to detect actual user changes vs token refreshes
    let currentUserId: string | null = null;

    // Set up auth state listener
    // Only respond to critical events: SIGNED_IN (new user) and SIGNED_OUT
    // Ignore TOKEN_REFRESHED and other events to avoid interfering with UI operations
    const {
      data: { subscription }
    } = data.supabase.auth.onAuthStateChange(async (event, session) => {
      // Only handle actual sign-in/sign-out, ignore token refreshes and other events
      if (event === 'SIGNED_IN' && session?.user?.id && session.user.id !== currentUserId) {
        // New user signed in (not a token refresh)
        currentUserId = session.user.id;

        // Invalidate data for new user
        await invalidate('supabase:auth');

        // Initialize theme with user preferences
        await themeStore.setUser(session.user.id, data.supabase);

        // Initialize sync system
        await syncStore.initialize(session.user.id, data.supabase);

        // Perform initial sync
        try {
          await syncStore.performSync();
        } catch (error) {
          console.error('Initial sync failed:', error);
        }
      } else if (event === 'SIGNED_OUT') {
        // User signed out, cleanup
        currentUserId = null;
        await invalidate('supabase:auth');
        await themeStore.setUser(null, null);
        syncStore.cleanup();
      }
      // Ignore all other events (TOKEN_REFRESHED, etc.) to prevent UI interference
    });

    // Initialize sync if user is already authenticated
    if (data.session) {
      data.supabase.auth.getUser()
        .then(({ data: { user } }) => {
          if (user) {
            currentUserId = user.id;
            // Initialize theme with user preferences
            themeStore.setUser(user.id, data.supabase).catch((error) => {
              console.error('Theme initialization failed:', error);
            });
            // Initialize sync
            syncStore.initialize(user.id, data.supabase).then(() => {
              syncStore.performSync().catch((error) => {
                console.error('Initial sync failed:', error);
              });
            });
          }
        })
        .catch((error) => {
          console.error('Error verifying existing session:', error);
        });
    }

    // Verify session when app regains focus (handles browser sleep/wake)
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && currentUserId) {
        try {
          const { data: { session }, error } = await data.supabase.auth.getSession();

          if (error || !session) {
            window.location.href = '/login';
            return;
          }

          // Session valid, trigger sync
          syncStore.performSync().catch((error) => {
            console.error('Sync after focus failed:', error);
          });
        } catch (error) {
          console.error('Session verification failed:', error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup on component destroy
    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      syncStore.cleanup();
    };
  });
</script>

<Toaster position="bottom-center" />
{@render children()}
