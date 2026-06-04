// Authentication state management using Svelte 5 runes
// Handles user session, login, logout, and auth state

import { db } from '$lib/db/local';

// ============================================================================
// STATE
// ============================================================================

interface AuthState {
  userId: string | null;
  userEmail: string | null;
  isLoading: boolean;
  error: string | null;
}

let state = $state<AuthState>({
  userId: null,
  userEmail: null,
  isLoading: false,
  error: null
});

// ============================================================================
// DERIVED STATE
// ============================================================================

let isAuthenticated = $derived(state.userId !== null);

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

  get userId() {
    return state.userId;
  },

  get userEmail() {
    return state.userEmail;
  },

  get isLoading() {
    return state.isLoading;
  },

  get isAuthenticated() {
    return isAuthenticated;
  },

  get error() {
    return state.error;
  },

  // ============================================================================
  // ACTIONS
  // ============================================================================

  /**
   * Set user from server data (called from layout when server data arrives)
   */
  setUser(user: { id: string; email: string } | null): void {
    if (user) {
      state.userId = user.id;
      state.userEmail = user.email;
    } else {
      state.userId = null;
      state.userEmail = null;
    }
  },

  /**
   * Sign in with email and password
   */
  async signIn(credentials: { email: string; password: string }): Promise<{ success: boolean; error?: string }> {
    state.isLoading = true;
    state.error = null;

    try {
      const res = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Login failed' }));
        const message = data.error || `Login failed: ${res.status}`;
        state.error = message;
        return { success: false, error: message };
      }

      // Full page reload to get server data
      window.location.href = '/';
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
      await fetch('/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      state.isLoading = false;
      // Always redirect to login
      window.location.href = '/login';
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
