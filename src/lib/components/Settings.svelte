<script lang="ts">
  // Settings panel/modal component
  // Full-screen on mobile, modal on desktop

  import { User, ListPlus, RefreshCw, LogOut, X } from 'lucide-svelte';
  import { authStore } from '$lib/stores/auth.svelte';
  import { syncStore } from '$lib/stores/sync.svelte';

  interface Props {
    isOpen?: boolean;
    onClose?: () => void;
    onEditLists?: () => void;
  }

  let { isOpen = false, onClose, onEditLists }: Props = $props();

  // Get user email from auth store
  let userEmail = $derived(authStore.userEmail);
  let isSyncing = $derived(syncStore.isSyncing);
  let isOnline = $derived(syncStore.isOnline);
  let lastSyncAt = $derived(syncStore.lastSyncAt);

  // Format last sync time
  let lastSyncFormatted = $derived.by(() => {
    if (!lastSyncAt) return 'Never';

    const now = new Date();
    const diff = now.getTime() - lastSyncAt.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;

    return lastSyncAt.toLocaleDateString();
  });

  // Handle sync button click
  async function handleSync() {
    if (!isOnline || isSyncing) return;

    try {
      await syncStore.performSync();
    } catch (error) {
      console.error('Sync failed:', error);
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
        <button
          type="button"
          class="close-button"
          onclick={onClose}
          aria-label="Close settings"
        >
          <X size={24} />
        </button>
      </header>

      <!-- Content -->
      <div class="panel-content">
        <!-- User Info Section -->
        <section class="settings-section">
          <div class="user-info">
            <div class="user-avatar">
              <User size={24} />
            </div>
            <div class="user-details">
              <p class="user-email">{userEmail || 'No user'}</p>
              <p class="user-label">Signed in</p>
            </div>
            <button
              type="button"
              class="logout-icon-button"
              onclick={handleLogout}
              aria-label="Log out"
            >
              <LogOut size={20} />
            </button>
          </div>
        </section>

        <!-- Lists Management Section -->
        <section class="settings-section">
          <button
            type="button"
            class="menu-item"
            onclick={handleEditLists}
          >
            <div class="menu-item-icon">
              <ListPlus size={20} />
            </div>
            <span class="menu-item-text">Edit Lists</span>
          </button>
        </section>

        <!-- Sync Section -->
        <section class="settings-section">
          <button
            type="button"
            class="menu-item"
            onclick={handleSync}
            disabled={!isOnline || isSyncing}
          >
            <div class="menu-item-icon" class:spinning={isSyncing}>
              <RefreshCw size={20} />
            </div>
            <div class="menu-item-content">
              <span class="menu-item-text">Sync Now</span>
              <span class="menu-item-subtitle">
                {#if !isOnline}
                  Offline
                {:else if isSyncing}
                  Syncing...
                {:else}
                  Last synced: {lastSyncFormatted}
                {/if}
              </span>
            </div>
          </button>
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

    /* Background - transparent on mobile, dimmed on desktop */
    background-color: rgba(0, 0, 0, 0.2);

    /* Blur effect */
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);

    /* Animation */
    animation: fadeIn var(--transition-normal) ease-out;
  }

  @media (min-width: 1024px) {
    .backdrop {
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-4);
    }
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

    /* Size - Full screen on mobile */
    width: 100%;
    height: 100%;

    /* Background */
    background-color: var(--bg-primary);

    /* Animation - slide in from right on mobile */
    animation: slideInRight var(--transition-normal) ease-out;
  }

  @media (min-width: 1024px) {
    .settings-panel {
      /* Desktop: Modal style */
      width: 100%;
      max-width: 480px;
      height: auto;
      max-height: 80vh;

      /* Border */
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-xl);

      /* Animation - fade in and scale up */
      animation: scaleIn var(--transition-normal) ease-out;
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

  .close-button {
    /* Layout */
    display: flex;
    align-items: center;
    justify-content: center;

    /* Size */
    width: 44px;
    height: 44px;

    /* Style */
    background: none;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;

    /* Color */
    color: var(--text-secondary);

    /* Transition */
    transition: color var(--transition-fast), background-color var(--transition-fast);

    /* Reset */
    padding: 0;
  }

  .close-button:hover {
    color: var(--text-primary);
    background-color: var(--bg-hover);
  }

  .close-button:focus-visible {
    outline: 2px solid var(--border-focus);
    outline-offset: 2px;
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

  @media (min-width: 1024px) {
    .panel-content {
      padding: var(--space-5);
    }
  }

  /* Settings Section */
  .settings-section {
    /* Spacing */
    margin-bottom: var(--space-6);
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

    /* Style */
    background-color: var(--bg-secondary);
    border-radius: var(--radius-md);

    /* Spacing */
    padding: var(--space-4);
  }

  .logout-icon-button {
    /* Layout */
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    /* Size */
    width: 40px;
    height: 40px;

    /* Style */
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    cursor: pointer;

    /* Color */
    color: var(--text-danger);

    /* Transition */
    transition: background-color var(--transition-fast),
                border-color var(--transition-fast),
                transform var(--transition-fast);

    /* Reset */
    padding: 0;
  }

  .logout-icon-button:hover {
    background-color: var(--bg-danger-hover);
    border-color: var(--text-danger);
    transform: scale(1.05);
  }

  .logout-icon-button:focus-visible {
    outline: 2px solid var(--border-focus);
    outline-offset: 2px;
  }

  .logout-icon-button:active {
    background-color: var(--bg-tertiary);
    transform: scale(0.95);
  }

  .user-avatar {
    /* Layout */
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    /* Size */
    width: 48px;
    height: 48px;

    /* Style */
    background-color: var(--accent-muted);
    border-radius: var(--radius-full);
    color: var(--accent-primary);
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

    /* Text handling */
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    /* Reset */
    margin: 0 0 var(--space-1) 0;
  }

  .user-label {
    /* Typography */
    font-size: var(--text-sm);
    color: var(--text-muted);

    /* Reset */
    margin: 0;
  }

  /* Menu Items */
  .menu-item {
    /* Layout */
    display: flex;
    align-items: center;
    gap: var(--space-3);
    width: 100%;

    /* Style */
    background-color: var(--bg-secondary);
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;

    /* Spacing */
    padding: var(--space-4);

    /* Transition */
    transition: background-color var(--transition-fast);

    /* Text align */
    text-align: left;
  }

  .menu-item:hover:not(:disabled) {
    background-color: var(--bg-hover);
  }

  .menu-item:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .menu-item:focus-visible {
    outline: 2px solid var(--border-focus);
    outline-offset: 2px;
  }

  .menu-item-icon {
    /* Layout */
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    /* Size */
    width: 40px;
    height: 40px;

    /* Style */
    background-color: var(--bg-tertiary);
    border-radius: var(--radius-md);
    color: var(--text-secondary);

    /* Transition */
    transition: transform var(--transition-fast);
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
    gap: var(--space-1);
  }

  .menu-item-text {
    /* Typography */
    font-size: var(--text-base);
    font-weight: var(--font-medium);
    color: var(--text-primary);
  }

  .menu-item-subtitle {
    /* Typography */
    font-size: var(--text-sm);
    color: var(--text-muted);
  }
</style>
