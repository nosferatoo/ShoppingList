// Authentication state management using Svelte 5 runes
// Handles user session, login, logout, and auth state

import { goto, invalidate } from '$app/navigation';
import { createSupabaseBrowserClient } from '$lib/db/supabase';
import { db } from '$lib/db/local';
import type { User, Session } from '@supabase/supabase-js';
import type { LoginFormData } from '$lib/types';

// ============================================================================
// STATE
// ============================================================================

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
}

let state = $state<AuthState>({
  user: null,
  session: null,
  isLoading: false,
  isInitialized: false,
  error: null
});

// ============================================================================
// DERIVED STATE
// ============================================================================

let isAuthenticated = $derived(state.session !== null && state.user !== null);
let userId = $derived(state.user?.id ?? null);
let userEmail = $derived(state.user?.email ?? null);

// ============================================================================
// SUPABASE CLIENT
// ============================================================================

const supabase = createSupabaseBrowserClient();

// ============================================================================
// AUTH STORE
// ============================================================================

/**
 * Authentication store using Svelte 5 runes
 * Manages user session, login, logout, and auth state changes
 */
export const authStore = {
  // ============================================================================
  // GETTERS
  // ============================================================================

  get user() {
    return state.user;
  },

  get session() {
    return state.session;
  },

  get isLoading() {
    return state.isLoading;
  },

  get isInitialized() {
    return state.isInitialized;
  },

  get isAuthenticated() {
    return isAuthenticated;
  },

  get userId() {
    return userId;
  },

  get userEmail() {
    return userEmail;
  },

  get error() {
    return state.error;
  },

  // ============================================================================
  // ACTIONS
  // ============================================================================

  /**
   * Initialize auth state from session
   * Call this once on app load
   * NOTE: Always verifies user with getUser() for security, even if initialSession is provided
   */
  async initialize(initialSession: Session | null): Promise<void> {
    if (state.isInitialized) return;

    state.isLoading = true;
    state.error = null;

    try {
      // Always verify the user with getUser() for security
      // Do NOT trust the user from initialSession as it comes from storage
      const {
        data: { user }
      } = await supabase.auth.getUser();

      // Get session data (tokens, etc.)
      const {
        data: { session }
      } = await supabase.auth.getSession();

      // Only use the session if the user is verified
      state.session = user ? session : null;
      state.user = user;

      // Set up auth state change listener
      this.setupAuthListener();

      state.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      state.error = error instanceof Error ? error.message : 'Failed to initialize auth';
    } finally {
      state.isLoading = false;
    }
  },

  /**
   * Set up listener for auth state changes
   * NOTE: ONLY handles SIGNED_OUT events. SIGNED_IN is handled during login flow.
   * Visibility-based auth checks are disabled to prevent UI freezing.
   */
  setupAuthListener(): void {
    supabase.auth.onAuthStateChange(async (event, session) => {
      // ONLY handle sign-out - ignore all other events to prevent UI issues
      if (event === 'SIGNED_OUT') {
        state.session = null;
        state.user = null;

        // Clear local data
        await this.clearLocalData();

        // Redirect to login page
        window.location.href = '/login';
      }
      // Ignore SIGNED_IN, TOKEN_REFRESHED, etc. - these were causing UI to freeze
    });
  },

  /**
   * Sign in with email and password
   */
  async signIn(credentials: LoginFormData): Promise<{ success: boolean; error?: string }> {
    state.isLoading = true;
    state.error = null;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      });

      if (error) {
        state.error = error.message;
        return { success: false, error: error.message };
      }

      if (!data.session) {
        state.error = 'No session returned';
        return { success: false, error: 'No session returned' };
      }

      state.session = data.session;
      state.user = data.user;

      // Invalidate and reload data
      await invalidate('supabase:auth');

      // Redirect to home
      await goto('/');

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign in failed';
      state.error = message;
      return { success: false, error: message };
    } finally {
      state.isLoading = false;
    }
  },

  /**
   * Sign out current user
   */
  async signOut(): Promise<void> {
    state.isLoading = true;
    state.error = null;

    try {
      // Sign out from Supabase
      // This will trigger the auth state listener which will handle the redirect
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('Supabase sign out error:', error);
        // If signOut fails, manually redirect
        window.location.href = '/login';
      }

      // The redirect will happen in the auth state listener
      // So we don't need to do anything else here
    } catch (error) {
      console.error('Sign out error:', error);
      state.error = error instanceof Error ? error.message : 'Sign out failed';

      // Force redirect on error
      window.location.href = '/login';
    } finally {
      state.isLoading = false;
    }
  },

  /**
   * Clear local database and cache
   */
  async clearLocalData(): Promise<void> {
    try {
      await db.clearAll();
    } catch (error) {
      console.error('Failed to clear local database:', error);
    }
  },

  /**
   * Check if user session is valid
   */
  async checkSession(): Promise<boolean> {
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!session || !user) {
        state.session = null;
        state.user = null;
        return false;
      }

      state.session = session;
      state.user = user;
      return true;
    } catch (error) {
      console.error('Session check failed:', error);
      return false;
    }
  },

  /**
   * Refresh the current session
   */
  async refreshSession(): Promise<void> {
    try {
      const {
        data: { session },
        error
      } = await supabase.auth.refreshSession();

      if (error) throw error;

      // Verify the user for security instead of trusting session.user
      const {
        data: { user }
      } = await supabase.auth.getUser();

      state.session = user ? session : null;
      state.user = user;
    } catch (error) {
      console.error('Failed to refresh session:', error);
      state.error = error instanceof Error ? error.message : 'Failed to refresh session';
    }
  },

  /**
   * Clear error message
   */
  clearError(): void {
    state.error = null;
  },

  /**
   * Set loading state manually (for form submissions, etc.)
   */
  setLoading(loading: boolean): void {
    state.isLoading = loading;
  }
};

// ============================================================================
// LEGACY EXPORT (for backwards compatibility)
// ============================================================================

/**
 * @deprecated Use authStore instead
 */
export function createAuthStore() {
  return authStore;
}
