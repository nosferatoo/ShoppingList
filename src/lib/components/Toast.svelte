<script lang="ts">
  // Toast notification component
  // Displays toast messages at the bottom of the screen with optional undo action

  import { X } from 'lucide-svelte';
  import { Button } from '$lib/components/ui/button';
  import { toastStore } from '$lib/stores/toast.svelte';
  import type { ToastNotification } from '$lib/types';

  // Get toasts from store
  let toasts = $derived(toastStore.toasts);

  // Handle action button click
  function handleAction(toast: ToastNotification) {
    toast.action?.onClick();
    toastStore.dismiss(toast.id);
  }

  // Handle close button click
  function handleClose(toast: ToastNotification) {
    toastStore.dismiss(toast.id);
  }
</script>

<!-- Toast container -->
<div class="toast-container">
  {#each toasts as toast (toast.id)}
    <div class="toast" class:success={toast.type === 'success'} class:error={toast.type === 'error'} class:warning={toast.type === 'warning'}>
      <!-- Message -->
      <span class="toast-message">
        {toast.message}
      </span>

      <!-- Action button (e.g., UNDO) -->
      {#if toast.action}
        <Button
          variant="ghost"
          size="sm"
          class="toast-action"
          onclick={() => handleAction(toast)}
          aria-label={toast.action.label}
        >
          {toast.action.label}
        </Button>
      {/if}

      <!-- Close button -->
      <Button
        variant="ghost"
        size="icon-sm"
        class="toast-close"
        onclick={() => handleClose(toast)}
        aria-label="Close notification"
      >
        <X size={16} />
      </Button>
    </div>
  {/each}
</div>

<style>
  .toast-container {
    /* Position */
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 100;

    /* Layout */
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);

    /* Spacing */
    padding: var(--space-6);
    padding-bottom: calc(var(--space-6) + env(safe-area-inset-bottom));

    /* Pointer events */
    pointer-events: none;
  }

  .toast {
    /* Layout */
    display: flex;
    align-items: center;
    gap: var(--space-3);

    /* Size */
    min-width: 280px;
    max-width: 90vw;

    /* Style */
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);

    /* Spacing */
    padding: var(--space-3) var(--space-4);

    /* Pointer events */
    pointer-events: auto;

    /* Animation */
    animation: toast-in var(--transition-normal);
  }

  /* Toast type variants */
  .toast.success {
    border-color: var(--success);
  }

  .toast.error {
    border-color: var(--error);
  }

  .toast.warning {
    border-color: var(--warning);
  }

  /* Message */
  .toast-message {
    /* Layout */
    flex: 1;

    /* Typography */
    font-size: var(--text-sm);
    color: var(--text-primary);
    line-height: var(--leading-normal);

    /* Text handling */
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Action button - custom styling for shadcn Button */
  :global(.toast-action) {
    flex-shrink: 0;
    text-transform: uppercase;
    letter-spacing: 0.025em;
    color: var(--accent-primary) !important;
  }

  :global(.toast-action:hover) {
    color: var(--accent-hover) !important;
  }

  /* Close button - custom styling for shadcn Button */
  :global(.toast-close) {
    flex-shrink: 0;
    margin-left: var(--space-1);
    color: var(--text-secondary) !important;
  }

  :global(.toast-close:hover) {
    color: var(--text-primary) !important;
  }

  /* Desktop styles */
  @media (min-width: 1024px) {
    .toast {
      min-width: 320px;
      max-width: 480px;
    }
  }

  /* Animation */
  @keyframes toast-in {
    from {
      opacity: 0;
      transform: translateY(100%);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
