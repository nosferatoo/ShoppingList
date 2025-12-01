<script lang="ts">
  import { invalidate } from '$app/navigation';
  import { onMount } from 'svelte';
  import { authStore } from '$lib/stores/auth.svelte';
  import { syncStore } from '$lib/stores/sync.svelte';
  import { registerServiceWorker, captureInstallPrompt } from '$lib/pwa/serviceWorkerHelper';
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

  // Watch for session changes and update auth store
  $effect(() => {
    // When session changes (e.g., after login/logout), update the auth store
    if (data.session) {
      // Force re-initialization by updating the state even if already initialized
      authStore.initialize(data.session).catch((error) => {
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

        // Initialize sync system
        await syncStore.initialize(session.user.id);

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
            syncStore.initialize(user.id).then(() => {
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

{@render children()}
