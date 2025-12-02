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
  import { Download, X } from 'lucide-svelte';
  import { Button } from '$lib/components/ui/button';
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
    <Button
      variant="default"
      class="install-button"
      onclick={handleInstall}
      disabled={installing}
    >
      {#if installing}
        <span class="spinner"></span>
        <span>Installing...</span>
      {:else}
        <Download size={20} />
        <span>Install App</span>
      {/if}
    </Button>
    <Button
      variant="ghost"
      size="icon-sm"
      class="dismiss-button-icon"
      onclick={handleDismiss}
      aria-label="Dismiss"
    >
      <X size={20} />
    </Button>
  </div>
{/if}

<style>
  .install-container {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  :global(.install-button) {
    background: linear-gradient(to right, #3b82f6, #2563eb) !important;
    box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
  }

  :global(.install-button:hover:not(:disabled)) {
    background: linear-gradient(to right, #2563eb, #1d4ed8) !important;
    box-shadow: 0 4px 8px rgba(59, 130, 246, 0.4);
    transform: translateY(-1px);
  }

  :global(.install-button:active:not(:disabled)) {
    transform: translateY(0);
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

  :global(.dismiss-button-icon) {
    border: 1px solid var(--border-default);
  }

  /* Mobile responsive */
  @media (max-width: 640px) {
    .install-container {
      width: 100%;
    }

    :global(.install-button) {
      flex: 1;
    }
  }
</style>
