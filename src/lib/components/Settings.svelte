<script lang="ts">
  // Settings panel/modal component
  // Full-screen on mobile, modal on desktop

  import { User, ListPlus, RefreshCw, LogOut, X, ChevronDown, Database } from 'lucide-svelte';
  import { Button } from '$lib/components/ui/button';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
  import { authStore } from '$lib/stores/auth.svelte';
  import { syncStore } from '$lib/stores/sync.svelte';
  import { toastStore } from '$lib/stores/toast.svelte';

  interface Props {
    isOpen?: boolean;
    onClose?: () => void;
    onEditLists?: () => void;
  }

  let { isOpen = false, onClose, onEditLists }: Props = $props();

  // Get user email from auth store
  let userEmail = $derived(authStore.userEmail);
  let isSyncing = $derived(syncStore.isSyncing);
  let isClearingCache = $derived(syncStore.isClearingCache);
  let isOnline = $derived(syncStore.isOnline);
  let lastSyncAt = $derived(syncStore.lastSyncAt);

  // Dropdown state
  let isDropdownOpen = $state(false);

  // Format last sync time (concise)
  let lastSyncFormatted = $derived.by(() => {
    if (!lastSyncAt) return 'Never';

    const now = new Date();
    const diff = now.getTime() - lastSyncAt.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return 'now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;

    return lastSyncAt.toLocaleDateString();
  });

  // Sync status for styling
  let syncStatus = $derived.by(() => {
    if (!isOnline) return 'offline';
    if (isSyncing) return 'syncing';
    return 'synced';
  });

  // Handle sync button click
  async function handleSync(e?: MouseEvent) {
    e?.preventDefault();
    e?.stopPropagation();

    if (!isOnline || isSyncing) return;

    try {
      await syncStore.performSync();
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }

  // Handle clear cache and sync
  async function handleClearCacheAndSync(e?: MouseEvent) {
    e?.preventDefault();
    e?.stopPropagation();

    if (!isOnline || isClearingCache) return;

    // Close dropdown immediately
    isDropdownOpen = false;

    try {
      await syncStore.performClearCacheAndSync();
      toastStore.success('Cache cleared and synced');
    } catch (error) {
      console.error('Clear cache and sync failed:', error);
      const message = error instanceof Error ? error.message : 'Clear cache and sync failed';
      toastStore.error(message);
    }
  }

  // Handle edit lists
  function handleEditLists() {
    onClose?.();
    // Use setTimeout to ensure modal closes first
    setTimeout(() => {
      onEditLists?.();
    }, 100);
  }

  // Handle logout
  async function handleLogout(e: MouseEvent) {
    e.stopPropagation(); // Prevent backdrop click
    console.log('Logout clicked');

    try {
      await authStore.signOut();
      console.log('Sign out completed');
      onClose?.();

      // Fallback redirect if auth listener doesn't handle it
      setTimeout(() => {
        console.log('Forcing redirect to /login');
        window.location.href = '/login';
      }, 1000);
    } catch (error) {
      console.error('Logout failed:', error);
      // Force redirect on error
      window.location.href = '/login';
    }
  }

  // Handle backdrop click (desktop only)
  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose?.();
    }
  }

  // Handle escape key
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose?.();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
  <!-- Backdrop (desktop only) -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="backdrop"
    onclick={handleBackdropClick}
    role="presentation"
  >
    <!-- Settings Panel -->
    <div
      class="settings-panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Header -->
      <header class="panel-header">
        <h2 id="settings-title" class="panel-title">Settings</h2>
        <Button
          variant="ghost"
          size="icon"
          class="close-button"
          onclick={onClose}
          aria-label="Close settings"
        >
          <X size={24} />
        </Button>
      </header>

      <!-- Content -->
      <div class="panel-content">
        <!-- User Info Section -->
        <section class="settings-section">
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            class="user-info"
            onclick={handleLogout}
            role="button"
            tabindex="0"
            aria-label="Log out"
          >
            <div class="user-avatar">
              <User size={20} />
            </div>
            <div class="user-details">
              <p class="user-email">{userEmail || 'No user'}</p>
              <p class="user-label">Tap to log out</p>
            </div>
          </div>
        </section>

        <!-- Lists Management Section -->
        <section class="settings-section">
          <Button
            variant="ghost"
            class="menu-item"
            onclick={handleEditLists}
          >
            <div class="menu-item-icon">
              <ListPlus size={20} />
            </div>
            <span class="menu-item-text">Edit Lists</span>
          </Button>
        </section>

        <!-- Sync Section -->
        <section class="settings-section">
          <div class="sync-button-container">
            <!-- Main Sync Button -->
            <button
              type="button"
              class="sync-button sync-button-main {syncStatus}"
              onclick={(e) => handleSync(e)}
              disabled={!isOnline || isSyncing || isClearingCache}
              aria-label="Sync now"
            >
              <div class="sync-icon" class:spinning={isSyncing || isClearingCache}>
                <RefreshCw size={20} />
              </div>
              <div class="sync-text-container">
                <span class="sync-text">
                  {#if isClearingCache}
                    Clearing...
                  {:else if isSyncing}
                    Syncing...
                  {:else if !isOnline}
                    Offline
                  {:else}
                    Sync
                  {/if}
                </span>
                <span class="sync-status">
                  {#if !isSyncing && !isClearingCache && isOnline}
                    Last: {lastSyncFormatted}
                  {/if}
                </span>
              </div>
            </button>

            <!-- Dropdown Menu -->
            <DropdownMenu.Root bind:open={isDropdownOpen}>
              <DropdownMenu.Trigger
                type="button"
                class={syncStatus}
                disabled={!isOnline || isSyncing || isClearingCache}
                aria-label="Sync options"
              >
                <ChevronDown size={18} />
              </DropdownMenu.Trigger>
              <DropdownMenu.Content class="sync-dropdown-content" align="end">
                <DropdownMenu.Item
                  class="sync-dropdown-item"
                  onclick={(e) => handleClearCacheAndSync(e)}
                  disabled={!isOnline || isClearingCache}
                >
                  <Database size={16} class="mr-2" />
                  Clear cache and sync
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          </div>
        </section>
      </div>
    </div>
  </div>
{/if}

<style>
  /* ============================================================================
     BACKDROP
     ============================================================================ */

  .backdrop {
    /* Position */
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 100;

    /* Layout - centered modal for both mobile and desktop */
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-4);

    /* Background - dimmed backdrop */
    background-color: rgba(0, 0, 0, 0.5);

    /* Blur effect */
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);

    /* Animation */
    animation: fadeIn var(--transition-normal) ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  /* ============================================================================
     SETTINGS PANEL
     ============================================================================ */

  .settings-panel {
    /* Layout */
    display: flex;
    flex-direction: column;

    /* Size - Modal style for both mobile and desktop */
    width: 100%;
    max-width: 480px;
    height: auto;
    max-height: 90vh;

    /* Background */
    background-color: var(--bg-primary);

    /* Border */
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-xl);

    /* Animation - scale in for both mobile and desktop */
    animation: scaleIn var(--transition-normal) ease-out;
  }

  @media (max-width: 1023px) {
    .settings-panel {
      /* Mobile: slightly smaller max width */
      max-width: calc(100% - var(--space-8));
    }
  }

  @keyframes slideInRight {
    from {
      transform: translateX(100%);
    }
    to {
      transform: translateX(0);
    }
  }

  @keyframes scaleIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  /* ============================================================================
     HEADER
     ============================================================================ */

  .panel-header {
    /* Layout */
    display: flex;
    align-items: center;
    justify-content: space-between;

    /* Spacing */
    padding: var(--space-4);

    /* Border */
    border-bottom: 1px solid var(--border-subtle);

    /* Ensure above content */
    position: relative;
    z-index: 1;
  }

  @media (min-width: 1024px) {
    .panel-header {
      padding: var(--space-5);
    }
  }

  .panel-title {
    /* Typography */
    font-size: var(--text-xl);
    font-weight: var(--font-semibold);
    color: var(--text-primary);
    font-family: var(--font-heading);

    /* Reset */
    margin: 0;
  }

  /* Custom styling for close button */
  :global(.close-button) {
    color: var(--text-secondary) !important;
  }

  :global(.close-button:hover) {
    color: var(--text-primary) !important;
  }

  /* ============================================================================
     CONTENT
     ============================================================================ */

  .panel-content {
    /* Layout */
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;

    /* Spacing */
    padding: var(--space-4);

    /* Smooth scrolling */
    -webkit-overflow-scrolling: touch;
  }

  /* Settings Section */
  .settings-section {
    /* Spacing */
    margin-bottom: var(--space-3);
  }

  .settings-section:last-child {
    margin-bottom: 0;
  }

  .section-title {
    /* Typography */
    font-size: var(--text-sm);
    font-weight: var(--font-semibold);
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;

    /* Spacing */
    margin: 0 0 var(--space-3) 0;
  }

  /* User Info */
  .user-info {
    /* Layout */
    display: flex;
    align-items: center;
    gap: var(--space-3);

    /* Spacing */
    padding: var(--space-3) var(--space-4);
    height: 64px; /* Fixed height to match other buttons */

    /* Style */
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    cursor: pointer;

    /* Transition */
    transition: background-color var(--transition-fast), border-color var(--transition-fast);
  }

  .user-info:hover {
    background-color: var(--bg-hover);
    border-color: var(--border-default);
  }

  .user-info:active {
    background-color: var(--bg-tertiary);
  }

  .user-info:focus-visible {
    outline: 2px solid var(--border-focus);
    outline-offset: 2px;
  }

  .user-avatar {
    /* Layout */
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    /* Size */
    width: 40px;
    height: 40px;

    /* Style */
    background-color: var(--accent-primary);
    border-radius: var(--radius-full);
    color: var(--text-inverse);
  }

  .user-details {
    /* Layout */
    flex: 1;
    min-width: 0; /* Allow text truncation */
  }

  .user-email {
    /* Typography */
    font-size: var(--text-base);
    font-weight: var(--font-medium);
    color: var(--text-primary);
    line-height: 1.4;

    /* Text handling */
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    /* Reset */
    margin: 0 0 2px 0;
  }

  .user-label {
    /* Typography */
    font-size: var(--text-sm);
    color: var(--text-muted);
    line-height: 1.4;

    /* Reset */
    margin: 0;
  }

  /* Custom styling for menu items */
  :global(.menu-item) {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    width: 100%;
    background-color: var(--bg-secondary) !important;
    padding: var(--space-3) var(--space-4) !important;
    height: 64px !important; /* Fixed height to match other buttons */
    justify-content: flex-start !important;
    border: 1px solid var(--border-subtle) !important;
    border-radius: var(--radius-md) !important;
    transition: background-color var(--transition-fast), border-color var(--transition-fast) !important;
  }

  :global(.menu-item:hover:not(:disabled)) {
    background-color: var(--bg-hover) !important;
    border-color: var(--border-default) !important;
  }

  :global(.menu-item:disabled) {
    opacity: 0.5 !important;
    cursor: not-allowed !important;
  }

  .menu-item-icon {
    /* Layout */
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    /* Size - match avatar width for alignment */
    width: 40px;

    /* Color */
    color: var(--text-secondary);
  }

  .menu-item-icon.spinning {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .menu-item-content {
    /* Layout */
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-1);
  }

  .menu-item-text {
    /* Typography */
    font-size: var(--text-base);
    font-weight: var(--font-medium);
    color: var(--text-primary);
    text-align: left;
  }

  .menu-item-subtitle {
    /* Typography */
    font-size: var(--text-sm);
    color: var(--text-muted);
    text-align: left;
  }

  /* Sync Button Styles - Match Desktop Floating Split Button */

  /* Split Button Container */
  .sync-button-container {
    position: relative;
    display: flex;
    align-items: stretch;
    width: 100%;
    min-height: 64px; /* Ensure consistent height */
  }

  .sync-button {
    /* Reset */
    all: unset;
    box-sizing: border-box;

    /* Layout */
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: var(--space-3);

    /* Spacing */
    padding: var(--space-3) var(--space-4);
    height: 64px; /* Fixed height to match other buttons */

    /* Style - matches menu-item */
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-subtle);
    cursor: pointer;

    /* Typography */
    font-family: var(--font-body);
    font-size: var(--text-base);
    font-weight: var(--font-medium);

    /* Transition */
    transition: background-color var(--transition-fast),
                border-color var(--transition-fast);
  }

  .sync-button-main {
    flex: 1;
    min-width: 0;
    border-right: 1px solid currentColor;
    border-top-left-radius: var(--radius-md);
    border-bottom-left-radius: var(--radius-md);
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
  }

  /* Arrow button - targets shadcn Trigger */
  .sync-button-container :global(button[data-slot="dropdown-menu-trigger"]) {
    /* Reset */
    all: unset;
    box-sizing: border-box;

    /* Position */
    position: relative;

    /* Layout */
    display: flex;
    align-items: center;
    justify-content: center;

    /* Size */
    width: 48px;
    height: 64px; /* Fixed height to match other buttons */
    flex-shrink: 0;
    padding: 0;

    /* Style - matches main button default */
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-subtle);
    border-top-right-radius: var(--radius-md);
    border-bottom-right-radius: var(--radius-md);
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
    border-left: none;
    cursor: pointer;

    /* Color */
    color: var(--text-primary);

    /* Transition - matches main button */
    transition: color var(--transition-fast),
                background-color var(--transition-fast),
                border-color var(--transition-fast);
  }

  /* Arrow button states - synced (no color change) */
  .sync-button-container :global(button[data-slot="dropdown-menu-trigger"].synced) {
    background-color: var(--bg-secondary);
    border-color: var(--border-subtle);
  }

  /* Arrow button hover when synced */
  .sync-button-container :global(button[data-slot="dropdown-menu-trigger"].synced:hover:not(:disabled)) {
    background-color: var(--bg-hover);
    border-color: var(--border-default);
  }

  /* Arrow button states - syncing (no color change) */
  .sync-button-container :global(button[data-slot="dropdown-menu-trigger"].syncing) {
    background-color: var(--bg-secondary);
    border-color: var(--border-subtle);
  }

  /* Arrow button states - offline (matches main) */
  .sync-button-container :global(button[data-slot="dropdown-menu-trigger"].offline) {
    background-color: var(--bg-secondary);
    border-color: var(--border-subtle);
    color: var(--text-muted);
    opacity: 0.7;
  }

  /* Hover state - default (not syncing/synced/offline) */
  .sync-button-container :global(button[data-slot="dropdown-menu-trigger"]:hover:not(:disabled):not(.syncing):not(.offline):not(.synced)) {
    color: var(--text-primary);
    background-color: var(--bg-hover);
    border-color: var(--border-default);
  }

  /* Focus state */
  .sync-button-container :global(button[data-slot="dropdown-menu-trigger"]:focus-visible) {
    outline: 2px solid var(--border-focus);
    outline-offset: 2px;
  }

  /* Disabled state */
  .sync-button-container :global(button[data-slot="dropdown-menu-trigger"]:disabled) {
    cursor: not-allowed;
  }

  .sync-icon {
    /* Layout */
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    /* Size - match other menu items */
    width: 40px;

    /* Color */
    color: var(--success);
  }

  .sync-icon.spinning {
    animation: spin 1s linear infinite;
  }

  .sync-text-container {
    /* Layout */
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }

  .sync-text {
    /* Typography */
    font-size: var(--text-base);
    font-weight: var(--font-medium);
    color: var(--text-primary);
    line-height: 1.4;
  }

  .sync-status {
    /* Typography */
    font-size: var(--text-sm);
    font-weight: var(--font-normal);
    color: var(--text-muted);
    line-height: 1.4;
  }

  /* Sync Button States - More Subtle */

  /* Synced state - no special styling */
  .sync-button.synced {
    background-color: var(--bg-secondary);
    border-color: var(--border-subtle);
  }

  .sync-button.synced:hover:not(:disabled) {
    background-color: var(--bg-hover);
    border-color: var(--border-default);
  }

  /* Syncing state - no special styling */
  .sync-button.syncing {
    background-color: var(--bg-secondary);
    border-color: var(--border-subtle);
  }

  /* Offline state - muted */
  .sync-button.offline {
    background-color: var(--bg-secondary);
    border-color: var(--border-subtle);
    opacity: 0.7;
  }

  .sync-button.offline .sync-icon,
  .sync-button.offline .sync-text {
    color: var(--text-muted);
  }

  .sync-button:hover:not(:disabled):not(.syncing):not(.offline) {
    background-color: var(--bg-hover);
    border-color: var(--border-default);
  }

  .sync-button:focus-visible {
    outline: 2px solid var(--border-focus);
    outline-offset: 2px;
  }

  .sync-button:disabled {
    cursor: not-allowed;
  }

  /* Dropdown Content Styling */
  :global(.sync-dropdown-content) {
    min-width: 200px;
    background-color: var(--bg-primary);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-xl);
    padding: var(--space-1);
    z-index: 110;
  }

  :global(.sync-dropdown-item) {
    display: flex;
    align-items: center;
    padding: var(--space-3) var(--space-4);
    color: var(--success);
    font-size: var(--text-sm);
    cursor: pointer;
    border-radius: var(--radius-sm);
    transition: background-color var(--transition-fast);
  }

  :global(.sync-dropdown-item svg) {
    color: var(--success);
  }

  :global(.sync-dropdown-item:hover:not([disabled])) {
    background-color: var(--bg-hover);
  }

  :global(.sync-dropdown-item[disabled]) {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
