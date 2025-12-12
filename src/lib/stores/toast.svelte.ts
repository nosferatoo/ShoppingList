// Toast notification store using Svelte 5 runes
// Manages toast notifications with auto-dismiss and undo actions

import type { ToastNotification } from '$lib/types';

// ============================================================================
// STATE
// ============================================================================

let toasts = $state<ToastNotification[]>([]);

// ============================================================================
// TOAST STORE
// ============================================================================

/**
 * Toast store using Svelte 5 runes
 * Manages global toast notifications with auto-dismiss
 */
export const toastStore = {
  // ============================================================================
  // GETTERS
  // ============================================================================

  get toasts() {
    return toasts;
  },

  // ============================================================================
  // ACTIONS
  // ============================================================================

  /**
   * Show a toast notification
   * @param message - The message to display
   * @param options - Toast options (type, duration, action)
   * @returns The toast ID
   */
  show(
    message: string,
    options: {
      type?: 'success' | 'error' | 'info' | 'warning';
      duration?: number;
      action?: {
        label: string;
        onClick: () => void;
      };
    } = {}
  ): string {
    const id = crypto.randomUUID();
    const duration = options.duration ?? 5000; // Default 5 seconds

    const toast: ToastNotification = {
      id,
      message,
      type: options.type ?? 'info',
      duration,
      action: options.action
    };

    // Add toast to array
    toasts = [...toasts, toast];

    // Auto-dismiss after duration
    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, duration);
    }

    return id;
  },

  /**
   * Show a success toast
   */
  success(message: string, action?: { label: string; onClick: () => void }): string {
    return this.show(message, { type: 'success', action });
  },

  /**
   * Show an error toast
   */
  error(message: string, action?: { label: string; onClick: () => void }): string {
    return this.show(message, { type: 'error', duration: 7000, action }); // Longer duration for errors
  },

  /**
   * Show an info toast
   */
  info(message: string, action?: { label: string; onClick: () => void }): string {
    return this.show(message, { type: 'info', action });
  },

  /**
   * Show a warning toast
   */
  warning(message: string, action?: { label: string; onClick: () => void }): string {
    return this.show(message, { type: 'warning', duration: 6000, action });
  },

  /**
   * Dismiss a toast by ID
   */
  dismiss(id: string): void {
    toasts = toasts.filter((t) => t.id !== id);
  },

  /**
   * Dismiss all toasts
   */
  dismissAll(): void {
    toasts = [];
  }
};
