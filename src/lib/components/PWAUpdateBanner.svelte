<script lang="ts">
  /**
   * PWA Update Banner Component
   * Shows a notification when a new version is available
   * and allows users to update the app
   *
   * Usage:
   * ```svelte
   * <PWAUpdateBanner />
   * ```
   */
  import { onMount, onDestroy } from 'svelte';
  import { Button } from '$lib/components/ui/button';
  import { skipWaitingAndUpdate } from '$lib/pwa/serviceWorkerHelper';

  let showUpdateBanner = $state(false);

  onMount(() => {
    // Listen for service worker update available event
    const handleUpdateAvailable = () => {
      console.log('[PWA] Update available, showing banner');
      showUpdateBanner = true;
    };

    window.addEventListener('sw-update-available', handleUpdateAvailable);

    return () => {
      window.removeEventListener('sw-update-available', handleUpdateAvailable);
    };
  });

  async function handleUpdate() {
    console.log('[PWA] User clicked update, reloading...');
    await skipWaitingAndUpdate();
    // Page will reload automatically
  }

  function handleDismiss() {
    showUpdateBanner = false;
  }
</script>

{#if showUpdateBanner}
  <div class="update-banner">
    <div class="update-content">
      <div class="update-icon">🔄</div>
      <div class="update-text">
        <div class="update-title">Update Available</div>
        <div class="update-description">A new version of the app is ready</div>
      </div>
      <div class="update-actions">
        <Button variant="secondary" class="update-button" onclick={handleUpdate}>
          Update Now
        </Button>
        <Button variant="outline" class="dismiss-button" onclick={handleDismiss}>
          Later
        </Button>
      </div>
    </div>
  </div>
{/if}

<style>
  .update-banner {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(to right, #0ea5e9, #3b82f6);
    color: white;
    padding: 1rem;
    box-shadow: 0 -4px 6px -1px rgba(0, 0, 0, 0.1);
    z-index: 1000;
    animation: slideUp 0.3s ease-out;
  }

  @keyframes slideUp {
    from {
      transform: translateY(100%);
    }
    to {
      transform: translateY(0);
    }
  }

  .update-content {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .update-icon {
    font-size: 2rem;
    flex-shrink: 0;
  }

  .update-text {
    flex: 1;
  }

  .update-title {
    font-weight: 600;
    font-size: 1rem;
    margin-bottom: 0.25rem;
  }

  .update-description {
    font-size: 0.875rem;
    opacity: 0.9;
  }

  .update-actions {
    display: flex;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  :global(.update-button) {
    background: white !important;
    color: #0ea5e9 !important;
  }

  :global(.update-button:hover) {
    background: #f0f9ff !important;
  }

  :global(.dismiss-button) {
    background: transparent !important;
    color: white !important;
    border-color: rgba(255, 255, 255, 0.5) !important;
  }

  :global(.dismiss-button:hover) {
    background: rgba(255, 255, 255, 0.1) !important;
  }

  /* Mobile responsive */
  @media (max-width: 640px) {
    .update-content {
      flex-direction: column;
      text-align: center;
      gap: 0.75rem;
    }

    .update-actions {
      width: 100%;
      flex-direction: column;
    }

    :global(.update-button),
    :global(.dismiss-button) {
      width: 100%;
    }
  }
</style>
