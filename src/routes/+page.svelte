<script lang="ts">
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import { RefreshCw, CloudOff, Check, User, LogOut, ListPlus, RotateCcw } from 'lucide-svelte';
  import Header from '$lib/components/Header.svelte';
  import ListCard from '$lib/components/ListCard.svelte';
  import Settings from '$lib/components/Settings.svelte';
  import SwipeHint from '$lib/components/SwipeHint.svelte';
  import EditItemDialog from '$lib/components/EditItemDialog.svelte';
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
  import EditListsModal from '$lib/components/EditListsModal.svelte';
  import { syncStore } from '$lib/stores/sync.svelte';
  import { authStore } from '$lib/stores/auth.svelte';
  import { db } from '$lib/db/local';
  import type { SyncResult } from '$lib/db/sync';
  import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious
  } from '$lib/components/ui/carousel';
  import type { ListWithItems, Item } from '$lib/types';

  // Props
  interface Props {
    data: {
      supabase: import('@supabase/supabase-js').SupabaseClient;
      lists: ListWithItems[];
    };
  }

  let { data }: Props = $props();

  // State
  let currentListIndex = $state(0);
  let currentCarouselIndex = $state(0);
  let carouselApi = $state<any>(null);
  let isSettingsOpen = $state(false);
  let isEditListsModalOpen = $state(false);
  let isUserDropdownOpen = $state(false);
  let listsData = $state<ListWithItems[]>(data.lists);
  let showSwipeHint = $state(false);
  let editingItem = $state<Item | null>(null);
  let editingItemListName = $state<string>('');
  let deletingItemId = $state<number | null>(null);
  let deletingItemName = $state<string>('');
  let deletingItemListName = $state<string>('');
  let isLandscape = $state(false);

  // Manual swipe detection
  let touchStartX = $state(0);
  let touchStartY = $state(0);
  let touchStartTime = $state(0);

  // Reset trigger for hiding item actions on swipe
  let resetActionsTrigger = $state(0);

  // Check if user has seen swipe hint before
  const SWIPE_HINT_KEY = 'swipe-hint-seen';

  $effect(() => {
    if (browser && listsData.length > 1) {
      const hasSeenHint = localStorage.getItem(SWIPE_HINT_KEY);
      if (!hasSeenHint) {
        // Show hint after a short delay
        const timeout = setTimeout(() => {
          showSwipeHint = true;
        }, 800);
        return () => clearTimeout(timeout);
      }
    }
  });

  // Detect landscape orientation on mobile
  $effect(() => {
    if (!browser) return;

    const checkOrientation = () => {
      const isMobile = window.matchMedia('(max-width: 1023px)').matches;
      const isLandscapeOrientation = window.matchMedia('(orientation: landscape)').matches;
      isLandscape = isMobile && isLandscapeOrientation;
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  });

  // Derived
  let currentList = $derived(listsData[currentListIndex]);
  let hasMultipleLists = $derived(listsData.length > 1);

  // Item counts for current list
  let currentListTotalCount = $derived.by(() => {
    if (!currentList) return 0;
    return currentList.items.filter(item => !item.deleted_at).length;
  });

  let currentListCheckedCount = $derived.by(() => {
    if (!currentList) return 0;
    return currentList.items.filter(item => !item.deleted_at && item.is_checked).length;
  });

  // Manual swipe detection handlers
  function handleTouchStart(e: TouchEvent) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchStartTime = Date.now();
  }

  function handleTouchEnd(e: TouchEvent) {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    const deltaTime = Date.now() - touchStartTime;

    // Swipe threshold: 50px horizontal, less than 100px vertical, within 1000ms
    if (Math.abs(deltaX) > 50 && Math.abs(deltaY) < 100 && deltaTime < 1000) {
      if (deltaX > 0) {
        // Swipe right = previous list
        if (currentListIndex > 0) {
          currentListIndex--;
          // Hide item actions on swipe
          resetActionsTrigger++;
        }
      } else {
        // Swipe left = next list
        if (currentListIndex < listsData.length - 1) {
          currentListIndex++;
          // Hide item actions on swipe
          resetActionsTrigger++;
        }
      }

      // Dismiss swipe hint on first swipe
      if (showSwipeHint) {
        handleDismissSwipeHint();
      }
    }
  }

  // Dismiss swipe hint
  function handleDismissSwipeHint() {
    showSwipeHint = false;
    if (browser) {
      localStorage.setItem(SWIPE_HINT_KEY, 'true');
    }
  }

  // Handle settings click
  function handleSettingsClick() {
    isSettingsOpen = true;
  }

  // Handle settings close
  function handleSettingsClose() {
    isSettingsOpen = false;
  }

  // Item actions
  async function handleAddItem(listId: number, text: string) {
    try {
      const { data: newItem, error } = await data.supabase
        .from('items')
        .insert({
          list_id: listId,
          text: text.trim(),
          is_checked: false
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding item:', error);
        throw error;
      }

      // Update local state
      listsData = listsData.map(list => {
        if (list.list.id === listId) {
          return {
            ...list,
            items: [...list.items, newItem]
          };
        }
        return list;
      });
    } catch (err) {
      console.error('Failed to add item:', err);
      throw err;
    }
  }

  async function handleToggleItem(itemId: number) {
    try {
      // Find the item to get its current state
      let currentItem: Item | undefined;
      for (const list of listsData) {
        const item = list.items.find(i => i.id === itemId);
        if (item) {
          currentItem = item;
          break;
        }
      }

      if (!currentItem) return;

      const { error } = await data.supabase
        .from('items')
        .update({
          is_checked: !currentItem.is_checked,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId);

      if (error) {
        console.error('Error toggling item:', error);
        throw error;
      }

      // Update local state
      listsData = listsData.map(list => ({
        ...list,
        items: list.items.map(item =>
          item.id === itemId
            ? { ...item, is_checked: !item.is_checked, updated_at: new Date().toISOString() }
            : item
        )
      }));
    } catch (err) {
      console.error('Failed to toggle item:', err);
    }
  }

  async function handleEditItem(itemId: number) {
    // Find the item to edit
    for (const list of listsData) {
      const item = list.items.find(i => i.id === itemId);
      if (item) {
        editingItem = item;
        editingItemListName = list.list.title;
        break;
      }
    }
  }

  async function handleSaveEdit(itemId: number, newText: string) {
    try {
      const { error } = await data.supabase
        .from('items')
        .update({
          text: newText,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId);

      if (error) {
        console.error('Error updating item:', error);
        throw error;
      }

      // Update local state
      listsData = listsData.map(list => ({
        ...list,
        items: list.items.map(item =>
          item.id === itemId
            ? { ...item, text: newText, updated_at: new Date().toISOString() }
            : item
        )
      }));
    } catch (err) {
      console.error('Failed to update item:', err);
    }
  }

  function handleCloseEditDialog() {
    editingItem = null;
    editingItemListName = '';
  }

  function handleDeleteItem(itemId: number) {
    // Find the item to get its name and list
    for (const list of listsData) {
      const item = list.items.find(i => i.id === itemId);
      if (item) {
        deletingItemId = itemId;
        deletingItemName = item.text;
        deletingItemListName = list.list.title;
        break;
      }
    }
  }

  async function confirmDeleteItem() {
    if (deletingItemId === null) return;

    try {
      const { error } = await data.supabase
        .from('items')
        .update({
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', deletingItemId);

      if (error) {
        console.error('Error deleting item:', error);
        throw error;
      }

      // Update local state
      listsData = listsData.map(list => ({
        ...list,
        items: list.items.filter(item => item.id !== deletingItemId)
      }));
    } catch (err) {
      console.error('Failed to delete item:', err);
    } finally {
      deletingItemId = null;
      deletingItemName = '';
      deletingItemListName = '';
    }
  }

  function cancelDeleteItem() {
    deletingItemId = null;
    deletingItemName = '';
    deletingItemListName = '';
  }

  // Navigate to list index
  function navigateToList(index: number) {
    currentListIndex = index;
  }

  // Handle user dropdown toggle
  function toggleUserDropdown() {
    isUserDropdownOpen = !isUserDropdownOpen;
  }

  // Handle click outside to close dropdown
  function handleClickOutside(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest('.user-info-floating')) {
      isUserDropdownOpen = false;
    }
  }

  // Handle logout
  async function handleLogout(e: MouseEvent) {
    e.stopPropagation();
    isUserDropdownOpen = false;
    try {
      await authStore.signOut();
      // Redirect to login
      setTimeout(() => {
        window.location.href = '/login';
      }, 1000);
    } catch (error) {
      console.error('Logout failed:', error);
      window.location.href = '/login';
    }
  }

  // Handle edit lists modal
  function handleEditLists() {
    isEditListsModalOpen = true;
  }

  // Handle edit lists modal close
  function handleEditListsModalClose() {
    isEditListsModalOpen = false;
  }

  // Handle lists updated from modal
  function handleListsUpdated(updatedLists: ListWithItems[]) {
    listsData = updatedLists;
  }

  // Handle sync button click
  async function handleSync() {
    if (!syncStore.isOnline || syncStore.isSyncing) return;
    try {
      await syncStore.performSync();
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }

  // Load lists from IndexedDB
  async function loadListsFromIndexedDB() {
    if (!browser || !authStore.userId) return;

    try {
      // Get all lists for the current user from IndexedDB
      const lists = await db.getUserLists(authStore.userId);

      // Get user list settings to determine order
      const userSettings = await db.userListSettings
        .where('user_id')
        .equals(authStore.userId)
        .toArray();

      // Build ListWithItems array
      const listsWithItems: ListWithItems[] = [];

      for (const list of lists) {
        // Get items for this list
        const items = await db.getListItems(list.id);

        // Get position from user settings
        const setting = userSettings.find(s => s.list_id === list.id);
        const position = setting?.position ?? 0;

        listsWithItems.push({
          list,
          position,
          items
        });
      }

      // Sort by position
      listsWithItems.sort((a, b) => a.position - b.position);

      // Update local state
      listsData = listsWithItems;

      console.log('Loaded lists from IndexedDB:', listsWithItems.length);
    } catch (error) {
      console.error('Failed to load lists from IndexedDB:', error);
    }
  }

  // Listen for sync completion and remote changes
  $effect(() => {
    if (!browser) return;

    const handleRemoteChange = () => {
      console.log('Remote change detected, reloading data...');
      loadListsFromIndexedDB();
    };

    const handleSyncComplete = (event: Event) => {
      const syncEvent = event as CustomEvent<SyncResult>;
      console.log('Sync complete:', syncEvent.detail);

      if (syncEvent.detail.hasRemoteChanges) {
        console.log('Sync pulled remote changes, reloading data...');
        loadListsFromIndexedDB();
      }
    };

    window.addEventListener('remote-change', handleRemoteChange);
    window.addEventListener('sync-complete', handleSyncComplete);

    return () => {
      window.removeEventListener('remote-change', handleRemoteChange);
      window.removeEventListener('sync-complete', handleSyncComplete);
    };
  });

  // Track carousel slide changes
  $effect(() => {
    if (!carouselApi) return;

    const updateIndex = () => {
      currentCarouselIndex = carouselApi.selectedScrollSnap();
    };

    carouselApi.on('select', updateIndex);
    updateIndex();

    return () => {
      carouselApi.off('select', updateIndex);
    };
  });

  // Navigate to specific carousel slide
  function navigateToCarouselSlide(index: number) {
    if (carouselApi) {
      carouselApi.scrollTo(index);
    }
  }
</script>

<svelte:head>
  <title>Lists</title>
</svelte:head>

<svelte:window onclick={handleClickOutside} />

<div class="app-container">
  <!-- Header -->
  <Header
    title={currentList?.list.title || 'Lists'}
    listType={currentList?.list.type}
    isShared={currentList?.list.is_shared}
    totalCount={currentListTotalCount}
    checkedCount={currentListCheckedCount}
    onSettingsClick={handleSettingsClick}
  />

  <!-- Main content -->
  <main class="main-content">
    {#if listsData.length === 0}
      <!-- Empty state -->
      <div class="empty-state">
        <p class="empty-text">No lists yet</p>
        <p class="empty-subtext">Create a list to get started</p>
      </div>
    {:else}
      <!-- Mobile: Swipeable single list view -->
      <div class="mobile-view">
        <div
          class="swipe-container"
          ontouchstart={handleTouchStart}
          ontouchend={handleTouchEnd}
        >
          <div
            class="lists-wrapper"
            style="transform: translateX(-{currentListIndex * 100}%)"
          >
            {#each listsData as listData (listData.list.id)}
              <div class="list-slide">
                <ListCard
                  list={listData.list}
                  items={listData.items}
                  userId={authStore.userId || ''}
                  resetActionsTrigger={resetActionsTrigger}
                  onAddItem={handleAddItem}
                  onToggleItem={handleToggleItem}
                  onEditItem={handleEditItem}
                  onDeleteItem={handleDeleteItem}
                />
              </div>
            {/each}
          </div>
        </div>

        <!-- Pagination dots -->
        {#if hasMultipleLists}
          <div class="pagination-dots">
            {#each listsData as _, index}
              <button
                class="dot"
                class:active={index === currentListIndex}
                onclick={() => navigateToList(index)}
                aria-label="View {listsData[index].list.title}"
              ></button>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Desktop: Carousel of lists -->
      <div class="desktop-view">
        <div class="carousel-wrapper">
          <Carousel
            bind:api={carouselApi}
            opts={{
              align: 'start',
              loop: false,
              slidesToScroll: 1
            }}
            class="carousel-container"
          >
            <CarouselContent class="carousel-content-wrapper">
              {#each listsData as listData (listData.list.id)}
                <CarouselItem class="carousel-item-wrapper">
                  <ListCard
                    list={listData.list}
                    items={listData.items}
                    userId={authStore.userId || ''}
                    onAddItem={handleAddItem}
                    onToggleItem={handleToggleItem}
                    onEditItem={handleEditItem}
                    onDeleteItem={handleDeleteItem}
                  />
                </CarouselItem>
              {/each}
            </CarouselContent>
            <div class="carousel-controls-bottom-left">
              <CarouselPrevious />
              <CarouselNext />
            </div>
          </Carousel>

          <!-- Pagination dots - Bottom Right -->
          {#if listsData.length > 1}
            <div class="carousel-dots-bottom-right">
              {#each listsData as _, index}
                <button
                  class="carousel-dot"
                  class:active={index === currentCarouselIndex}
                  onclick={() => navigateToCarouselSlide(index)}
                  aria-label="View {listsData[index].list.title}"
                ></button>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Floating controls - Top Left (User Info & Dropdown) -->
        <div class="floating-controls-left">
          <div class="user-info-floating">
            <div class="user-avatar-floating">
              <User size={16} />
            </div>
            <button
              type="button"
              class="user-details-floating"
              onclick={toggleUserDropdown}
              aria-label="User menu"
              aria-expanded={isUserDropdownOpen}
            >
              <p class="user-email-floating">{authStore.userEmail || 'No user'}</p>
            </button>

            <!-- User Dropdown Menu -->
            {#if isUserDropdownOpen}
              <div class="user-dropdown-menu">
                <button
                  type="button"
                  class="dropdown-item logout-item"
                  onclick={handleLogout}
                >
                  <LogOut size={16} />
                  <span>Log out</span>
                </button>
              </div>
            {/if}
          </div>
        </div>

        <!-- Floating controls - Top Right (Sync, Edit Lists, Settings) -->
        <div class="floating-controls-right">
          <!-- Sync Button -->
          <button
            type="button"
            class="sync-button-floating"
            class:syncing={syncStore.isSyncing}
            class:synced={syncStore.isOnline && !syncStore.isSyncing}
            class:offline={!syncStore.isOnline}
            onclick={handleSync}
            disabled={!syncStore.isOnline || syncStore.isSyncing}
            aria-label="Sync now"
            title={!syncStore.isOnline ? 'Offline' : syncStore.isSyncing ? 'Syncing...' : 'Sync now'}
          >
            <RefreshCw size={18} />
            <span class="sync-button-text">
              {#if syncStore.isSyncing}
                Syncing...
              {:else if !syncStore.isOnline}
                Offline
              {:else if syncStore.lastSyncAt}
                {(() => {
                  const now = new Date();
                  const diff = now.getTime() - syncStore.lastSyncAt.getTime();
                  const minutes = Math.floor(diff / 60000);
                  const hours = Math.floor(minutes / 60);

                  if (minutes < 1) return 'Just now';
                  if (minutes < 60) return `${minutes}m ago`;
                  if (hours < 24) return `${hours}h ago`;
                  return 'Long ago';
                })()}
              {:else}
                Never synced
              {/if}
            </span>
          </button>

          <!-- Edit Lists Button -->
          <button
            type="button"
            class="action-button-floating edit-lists-button"
            onclick={handleEditLists}
            aria-label="Edit lists"
            title="Edit lists"
          >
            <ListPlus size={18} />
            <span class="button-text">Edit lists</span>
          </button>
        </div>
      </div>
    {/if}
  </main>

  <!-- Settings Panel -->
  <Settings
    isOpen={isSettingsOpen}
    onClose={handleSettingsClose}
    onEditLists={handleEditLists}
  />

  <!-- Edit Item Dialog -->
  <EditItemDialog
    item={editingItem}
    listName={editingItemListName}
    isOpen={editingItem !== null}
    onSave={handleSaveEdit}
    onClose={handleCloseEditDialog}
  />

  <!-- Delete Confirmation Dialog -->
  <ConfirmDialog
    isOpen={deletingItemId !== null}
    title="Delete Item"
    message={deletingItemName && deletingItemListName ? `Are you sure you want to delete "${deletingItemName}" from the ${deletingItemListName} list? This action cannot be undone.` : 'Are you sure you want to delete this item? This action cannot be undone.'}
    itemName={deletingItemName || undefined}
    listName={deletingItemListName || undefined}
    confirmText="Delete"
    cancelText="Cancel"
    variant="danger"
    onConfirm={confirmDeleteItem}
    onCancel={cancelDeleteItem}
  />

  <!-- Swipe Hint (mobile only, first use) -->
  <SwipeHint isVisible={showSwipeHint} onDismiss={handleDismissSwipeHint} />

  <!-- Landscape Hint (mobile only) -->
  {#if isLandscape}
    <div class="landscape-hint">
      <RotateCcw size={20} />
      <span>Portrait mode recommended</span>
    </div>
  {/if}

  <!-- Edit Lists Modal -->
  <EditListsModal
    isOpen={isEditListsModalOpen}
    onClose={handleEditListsModalClose}
    supabase={data.supabase}
    userId={authStore.userId || ''}
    initialLists={listsData}
    onListsUpdated={handleListsUpdated}
  />
</div>

<style>
  .app-container {
    /* Layout */
    min-height: 100vh;
    display: flex;
    flex-direction: column;

    /* Background */
    background-color: var(--bg-primary);
  }

  .main-content {
    /* Layout */
    flex: 1;
    display: flex;
    flex-direction: column;

    /* Spacing - account for fixed header on mobile */
    margin-top: 64px;
  }

  @media (min-width: 1024px) {
    .main-content {
      /* No margin-top on desktop since header is hidden */
      margin-top: 0;
    }
  }

  /* Empty state */
  .empty-state {
    /* Layout */
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    gap: var(--space-2);

    /* Spacing */
    padding: var(--space-8);
  }

  .empty-text {
    /* Typography */
    font-size: var(--text-lg);
    color: var(--text-secondary);
    font-weight: var(--font-medium);

    /* Reset */
    margin: 0;
  }

  .empty-subtext {
    /* Typography */
    font-size: var(--text-base);
    color: var(--text-muted);

    /* Reset */
    margin: 0;
  }

  /* ============================================================================
     MOBILE VIEW - Swipeable lists
     ============================================================================ */

  .mobile-view {
    /* Layout */
    display: flex;
    flex-direction: column;
    flex: 1;

    /* Show only on mobile */
    display: flex;
  }

  @media (min-width: 1024px) {
    .mobile-view {
      display: none;
    }
  }

  .swipe-container {
    /* Layout */
    flex: 1;
    overflow: hidden;
    position: relative;

    /* Touch action handled by svelte-gestures configuration */
  }

  .lists-wrapper {
    /* Layout */
    display: flex;
    height: 100%;

    /* Smooth transitions */
    transition: transform var(--transition-normal);
    will-change: transform;
  }

  .list-slide {
    /* Layout */
    flex: 0 0 100%;
    width: 100%;
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;

    /* Smooth scrolling */
    -webkit-overflow-scrolling: touch;
  }

  /* Pagination dots */
  .pagination-dots {
    /* Position */
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 10;

    /* Layout */
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);

    /* Spacing - minimal padding */
    padding: var(--space-2) var(--space-4);
    padding-bottom: calc(var(--space-2) + env(safe-area-inset-bottom, 0px));

    /* Background for visibility - minimal gradient */
    background: linear-gradient(
      to top,
      var(--bg-primary) 80%,
      transparent 100%
    );
  }

  .dot {
    /* Size */
    width: 8px;
    height: 8px;

    /* Style */
    border-radius: var(--radius-full);
    background-color: var(--text-muted);
    border: none;
    padding: 0;
    cursor: pointer;

    /* Transition */
    transition: background-color var(--transition-fast), transform var(--transition-fast);
  }

  .dot:hover {
    background-color: var(--text-secondary);
    transform: scale(1.2);
  }

  .dot.active {
    background-color: var(--accent-primary);
    transform: scale(1.3);
  }

  .dot:focus-visible {
    outline: 2px solid var(--border-focus);
    outline-offset: 2px;
  }

  /* ============================================================================
     DESKTOP VIEW - Grid layout
     ============================================================================ */

  .desktop-view {
    /* Hide on mobile */
    display: none;
  }

  @media (min-width: 1024px) {
    .desktop-view {
      /* Layout */
      display: flex;
      flex: 1;
      align-items: center;
      justify-content: center;

      /* Spacing - extra top padding to avoid overlap with floating controls, minimal bottom */
      padding: calc(var(--space-6) * 3 + 12px) var(--space-6) calc(var(--space-6) + 60px);
      overflow: hidden;
    }

    .carousel-wrapper {
      width: 100%;
      position: relative;
    }

    /* Carousel container */
    :global(.carousel-container) {
      width: 100%;
      position: relative;
    }

    /* Carousel controls - Bottom Left */
    .carousel-controls-bottom-left {
      position: fixed;
      bottom: 28px;
      left: calc(var(--space-6) + 120px);
      z-index: 50;
      display: flex;
      gap: var(--space-2);
    }

    /* Override absolute positioning of carousel buttons */
    .carousel-controls-bottom-left :global(.carousel-button) {
      position: static !important;
      transform: none !important;
    }

    /* Carousel dots - Centered */
    .carousel-dots-bottom-right {
      position: fixed;
      bottom: 48px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 50;
      display: flex;
      gap: var(--space-2);
      align-items: center;
    }

    .carousel-dot {
      /* Size */
      width: 8px;
      height: 8px;

      /* Style */
      border-radius: var(--radius-full);
      background-color: var(--text-muted);
      border: none;
      padding: 0;
      cursor: pointer;

      /* Transition */
      transition: background-color var(--transition-fast), transform var(--transition-fast);
    }

    .carousel-dot:hover {
      background-color: var(--text-secondary);
      transform: scale(1.2);
    }

    .carousel-dot.active {
      background-color: var(--accent-primary);
      transform: scale(1.3);
    }

    .carousel-dot:focus-visible {
      outline: 2px solid var(--border-focus);
      outline-offset: 2px;
    }

    /* Carousel viewport */
    :global(.carousel-viewport) {
      overflow: hidden;
    }

    /* Carousel content */
    :global(.carousel-content-wrapper) {
      gap: 0; /* Option 2: No gap. For Option 1 (backup), change to: var(--space-4) */
      justify-content: flex-start;
    }

    /* Each carousel item - full viewport width for single slide view */
    :global(.carousel-item-wrapper) {
      flex: 0 0 100%;
      display: flex;
      justify-content: center;

      /* Option 2: Add horizontal padding for breathing room */
      padding: 0 var(--space-3);

      /* Option 1 (backup): If padding doesn't work, uncomment line below and remove padding above
         Then also change .carousel-content-wrapper gap from 0 to var(--space-4) */
    }

    /* ========================================================================
       FLOATING CONTROLS - TOP LEFT (User Info & Logout)
       ======================================================================== */

    .floating-controls-left {
      /* Position */
      position: fixed;
      top: var(--space-6);
      left: var(--space-6);
      z-index: 40;

      /* Ensure it's visible above carousel */
      pointer-events: auto;
    }

    .user-info-floating {
      /* Layout */
      display: flex;
      align-items: center;
      gap: var(--space-2);

      /* Position - for dropdown positioning */
      position: relative;

      /* Style */
      background-color: transparent;
      border: none;
      border-radius: var(--radius-md);
      box-shadow: none;

      /* Spacing - more compact */
      padding: var(--space-2) var(--space-3);

      /* Transition */
      transition: box-shadow var(--transition-fast);
    }

    .user-info-floating:hover {
      /* No shadow change needed for transparent background */
    }

    .user-avatar-floating {
      /* Layout */
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      /* Size - smaller */
      width: 32px;
      height: 32px;

      /* Style */
      background-color: var(--accent-primary);
      border-radius: var(--radius-full);
      color: var(--text-inverse);
    }

    .user-details-floating {
      /* Layout */
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;

      /* Style as button */
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
      text-align: left;

      /* Transition */
      transition: opacity var(--transition-fast);
    }

    .user-details-floating:hover {
      opacity: 0.8;
    }

    .user-details-floating:focus-visible {
      outline: 2px solid var(--border-focus);
      outline-offset: 2px;
      border-radius: var(--radius-sm);
    }

    .user-email-floating {
      /* Typography */
      font-size: var(--text-base);
      font-weight: var(--font-medium);
      color: var(--text-primary);
      line-height: 1.2;

      /* Text handling */
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;

      /* Reset */
      margin: 0;
    }

    /* User Dropdown Menu */
    .user-dropdown-menu {
      /* Position */
      position: absolute;
      top: calc(100% + var(--space-1));
      left: 0;
      z-index: 50;

      /* Size */
      min-width: 180px;

      /* Style */
      background-color: var(--bg-secondary);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-lg);

      /* Spacing */
      padding: var(--space-2);

      /* Animation */
      animation: dropdownFadeIn var(--transition-fast) ease-out;
    }

    @keyframes dropdownFadeIn {
      from {
        opacity: 0;
        transform: translateY(-4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .dropdown-item {
      /* Layout */
      display: flex;
      align-items: center;
      gap: var(--space-2);
      width: 100%;

      /* Style */
      background: none;
      border: none;
      border-radius: var(--radius-sm);
      cursor: pointer;
      text-align: left;

      /* Typography */
      font-size: var(--text-sm);
      font-weight: var(--font-medium);
      color: var(--text-primary);

      /* Spacing */
      padding: var(--space-2) var(--space-3);

      /* Transition */
      transition: background-color var(--transition-fast), color var(--transition-fast);
    }

    .dropdown-item:hover {
      background-color: var(--bg-hover);
    }

    .dropdown-item:focus-visible {
      outline: 2px solid var(--border-focus);
      outline-offset: 2px;
    }

    .dropdown-item:active {
      background-color: var(--bg-tertiary);
    }

    .logout-item {
      color: var(--error);
    }

    .logout-item:hover {
      background-color: rgba(239, 68, 68, 0.1);
      color: #dc2626;
    }

    .logout-item:active {
      background-color: rgba(239, 68, 68, 0.15);
    }

    /* ========================================================================
       FLOATING CONTROLS - TOP RIGHT (Sync, Edit Lists, Settings)
       ======================================================================== */

    .floating-controls-right {
      /* Position */
      position: fixed;
      top: var(--space-6);
      right: var(--space-6);
      z-index: 40;

      /* Layout */
      display: flex;
      align-items: center;
      gap: var(--space-3);

      /* Ensure it's visible above carousel */
      pointer-events: auto;
    }

    .action-button-floating {
      /* Layout */
      display: flex;
      align-items: center;
      justify-content: center;

      /* Size */
      width: 48px;
      height: 48px;

      /* Style */
      background-color: var(--bg-secondary);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      cursor: pointer;
      box-shadow: var(--shadow-lg);

      /* Color */
      color: var(--text-secondary);

      /* Transition */
      transition: color var(--transition-fast),
                  background-color var(--transition-fast),
                  box-shadow var(--transition-fast),
                  transform var(--transition-fast);
    }

    /* Edit Lists Button with text */
    .action-button-floating.edit-lists-button {
      /* Size - wider to accommodate text */
      width: auto;
      gap: var(--space-2);
      padding: 0 var(--space-4);
    }

    .button-text {
      font-size: var(--text-sm);
      font-weight: var(--font-medium);
      white-space: nowrap;
    }

    .action-button-floating:hover:not(:disabled) {
      color: var(--text-primary);
      background-color: var(--bg-hover);
      box-shadow: var(--shadow-xl);
      transform: translateY(-1px);
    }

    .action-button-floating:focus-visible {
      outline: 2px solid var(--border-focus);
      outline-offset: 2px;
    }

    .action-button-floating:active:not(:disabled) {
      background-color: var(--bg-tertiary);
      box-shadow: var(--shadow-md);
      transform: translateY(0);
    }

    .action-button-floating:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Spinning animation for sync button */
    .action-button-floating.spinning {
      color: var(--accent-primary);
    }

    .action-button-floating.spinning :global(svg) {
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

    /* ========================================================================
       SYNC BUTTON WITH TEXT
       ======================================================================== */

    .sync-button-floating {
      /* Layout */
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);

      /* Size - wider to accommodate text */
      height: 48px;
      padding: 0 var(--space-4);

      /* Style */
      background-color: var(--bg-secondary);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      cursor: pointer;
      box-shadow: var(--shadow-lg);

      /* Color */
      color: var(--text-secondary);

      /* Transition */
      transition: color var(--transition-fast),
                  background-color var(--transition-fast),
                  border-color var(--transition-fast),
                  box-shadow var(--transition-fast),
                  transform var(--transition-fast);
    }

    .sync-button-text {
      font-size: var(--text-sm);
      font-weight: var(--font-medium);
      white-space: nowrap;
    }

    /* Synced state - green */
    .sync-button-floating.synced {
      background-color: rgba(34, 197, 94, 0.1);
      border-color: var(--success);
      color: var(--success);
    }

    .sync-button-floating.synced:hover:not(:disabled) {
      background-color: rgba(34, 197, 94, 0.15);
      box-shadow: var(--shadow-xl);
      transform: translateY(-1px);
    }

    /* Syncing state - orange with spinning animation */
    .sync-button-floating.syncing {
      background-color: rgba(249, 115, 22, 0.1);
      border-color: var(--accent-primary);
      color: var(--accent-primary);
    }

    .sync-button-floating.syncing :global(svg) {
      animation: spin 1s linear infinite;
    }

    /* Offline state - muted */
    .sync-button-floating.offline {
      background-color: var(--bg-secondary);
      border-color: var(--border-subtle);
      color: var(--text-muted);
      opacity: 0.7;
    }

    .sync-button-floating:hover:not(:disabled):not(.syncing):not(.offline) {
      color: var(--text-primary);
      background-color: var(--bg-hover);
      box-shadow: var(--shadow-xl);
      transform: translateY(-1px);
    }

    .sync-button-floating:focus-visible {
      outline: 2px solid var(--border-focus);
      outline-offset: 2px;
    }

    .sync-button-floating:active:not(:disabled) {
      box-shadow: var(--shadow-md);
      transform: translateY(0);
    }

    .sync-button-floating:disabled {
      cursor: not-allowed;
    }
  }

  /* ============================================================================
     LANDSCAPE HINT - Mobile only
     ============================================================================ */

  .landscape-hint {
    /* Position */
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 100;

    /* Layout */
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-3);

    /* Size */
    padding: var(--space-8) var(--space-10);
    min-width: 280px;

    /* Style */
    background: linear-gradient(135deg, #f97316 0%, #fb923c 100%);
    border: 3px solid rgba(255, 255, 255, 0.3);
    border-radius: var(--radius-xl);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);

    /* Typography */
    color: #ffffff;
    font-size: var(--text-xl);
    font-weight: var(--font-bold);
    text-align: center;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);

    /* Animation */
    animation: fadeIn var(--transition-normal) ease-out;
  }

  .landscape-hint :global(svg) {
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
  }

  /* Hide on desktop */
  @media (min-width: 1024px) {
    .landscape-hint {
      display: none;
    }
  }
</style>
