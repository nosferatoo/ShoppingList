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
        <button class="update-button" onclick={handleUpdate}>Update Now</button>
        <button class="dismiss-button" onclick={handleDismiss}>Later</button>
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

  .update-button,
  .dismiss-button {
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
    font-size: 0.875rem;
  }

  .update-button {
    background: white;
    color: #0ea5e9;
  }

  .update-button:hover {
    background: #f0f9ff;
    transform: translateY(-1px);
  }

  .dismiss-button {
    background: transparent;
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.5);
  }

  .dismiss-button:hover {
    background: rgba(255, 255, 255, 0.1);
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

    .update-button,
    .dismiss-button {
      width: 100%;
    }
  }
</style>
