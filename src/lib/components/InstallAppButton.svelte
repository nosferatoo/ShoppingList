<script lang="ts">
  /**
   * Install App Button Component
   * Shows a button to install the PWA when available
   * Automatically hides when app is already installed
   *
   * Usage:
   * ```svelte
   * <InstallAppButton />
   * ```
   */
  import { onMount } from 'svelte';
  import { showInstallPrompt, isInstalled } from '$lib/pwa/serviceWorkerHelper';

  let showButton = $state(false);
  let installing = $state(false);

  onMount(() => {
    // Don't show if already installed
    if (isInstalled()) {
      console.log('[PWA] App already installed');
      return;
    }

    // Listen for install prompt available
    const handleInstallAvailable = () => {
      console.log('[PWA] Install prompt available');
      showButton = true;
    };

    // Listen for app installed
    const handleInstalled = () => {
      console.log('[PWA] App installed');
      showButton = false;
    };

    window.addEventListener('pwa-install-available', handleInstallAvailable);
    window.addEventListener('pwa-installed', handleInstalled);

    return () => {
      window.removeEventListener('pwa-install-available', handleInstallAvailable);
      window.removeEventListener('pwa-installed', handleInstalled);
    };
  });

  async function handleInstall() {
    installing = true;

    try {
      const accepted = await showInstallPrompt();

      if (accepted) {
        console.log('[PWA] User accepted install');
        // Button will hide automatically via 'pwa-installed' event
      } else {
        console.log('[PWA] User dismissed install');
        // Keep button visible for later
      }
    } catch (error) {
      console.error('[PWA] Install failed:', error);
    } finally {
      installing = false;
    }
  }

  function handleDismiss() {
    showButton = false;
  }
</script>

{#if showButton}
  <div class="install-container">
    <button class="install-button" onclick={handleInstall} disabled={installing}>
      {#if installing}
        <span class="spinner"></span>
        <span>Installing...</span>
      {:else}
        <svg class="install-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        <span>Install App</span>
      {/if}
    </button>
    <button class="dismiss-button" onclick={handleDismiss} aria-label="Dismiss">
      ×
    </button>
  </div>
{/if}

<style>
  .install-container {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  .install-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: linear-gradient(to right, #3b82f6, #2563eb);
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-weight: 500;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
  }

  .install-button:hover:not(:disabled) {
    background: linear-gradient(to right, #2563eb, #1d4ed8);
    box-shadow: 0 4px 8px rgba(59, 130, 246, 0.4);
    transform: translateY(-1px);
  }

  .install-button:active:not(:disabled) {
    transform: translateY(0);
  }

  .install-button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .install-icon {
    width: 1.25rem;
    height: 1.25rem;
  }

  .spinner {
    width: 1rem;
    height: 1rem;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .dismiss-button {
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    border: 1px solid #e5e7eb;
    background: white;
    color: #6b7280;
    font-size: 1.5rem;
    line-height: 1;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .dismiss-button:hover {
    background: #f3f4f6;
    color: #374151;
  }

  /* Mobile responsive */
  @media (max-width: 640px) {
    .install-container {
      width: 100%;
    }

    .install-button {
      flex: 1;
    }
  }
</style>
