<script lang="ts">
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import { RefreshCw, CloudOff, Check, User, LogOut, ListPlus, RotateCcw, Database, ChevronDown, Palette, UtensilsCrossed } from 'lucide-svelte';
  import Header from '$lib/components/Header.svelte';
  import ListCard from '$lib/components/ListCard.svelte';
  import MasterList from '$lib/components/MasterList.svelte';
  import Settings from '$lib/components/Settings.svelte';
  import SwipeHint from '$lib/components/SwipeHint.svelte';
  import EditItemDialog from '$lib/components/EditItemDialog.svelte';
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
  import EditListsModal from '$lib/components/EditListsModal.svelte';
  import DishesModal from '$lib/components/DishesModal.svelte';
  import MealPlannerModal from '$lib/components/MealPlannerModal.svelte';
  import MealPlannerContent from '$lib/components/MealPlannerContent.svelte';
  import MenuConfirmationDialog from '$lib/components/MenuConfirmationDialog.svelte';
  import { syncStore } from '$lib/stores/sync.svelte';
  import { authStore } from '$lib/stores/auth.svelte';
  import { toast } from 'svelte-sonner';
  import { themeStore, type ThemeColor } from '$lib/stores/theme.svelte';
  import { db } from '$lib/db/local';
  import type { SyncResult } from '$lib/db/sync';
  import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious
  } from '$lib/components/ui/carousel';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
  import { Button } from '$lib/components/ui/button';
  import type { ListWithItems, Item, MenuWithDetails } from '$lib/types';

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
  let isDishesModalOpen = $state(false);
  let isMealPlannerModalOpen = $state(false);
  let isMenuConfirmationDialogOpen = $state(false);
  let isMealsDropdownOpen = $state(false);
  let unconfirmedMenus = $state<MenuWithDetails[]>([]);
  let isUserDropdownOpen = $state(false);
  let isThemeDropdownOpen = $state(false);
  let listsData = $state<ListWithItems[]>(data.lists);
  let showSwipeHint = $state(false);
  let editingItem = $state<Item | null>(null);
  let editingItemListName = $state<string>('');
  let deletingItemId = $state<number | null>(null);
  let deletingItemName = $state<string>('');
  let deletingItemListName = $state<string>('');
  let isLandscape = $state(false);
  let viewMode = $state<'lists' | 'master' | 'meals'>('lists');

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

  // Master list data - aggregates all unchecked items from shopping lists
  let masterListData = $derived.by(() => {
    return listsData
      .filter(listWithItems => listWithItems.list.type === 'shopping') // Only shopping lists
      .map(listWithItems => {
        const uncheckedItems = listWithItems.items
          .filter(item => !item.deleted_at && !item.is_checked) // Only unchecked items
          .sort((a, b) => a.text.localeCompare(b.text)); // Sort alphabetically by item name

        return {
          listName: listWithItems.list.title,
          listId: listWithItems.list.id,
          items: uncheckedItems
        };
      })
      .filter(group => group.items.length > 0); // Only include lists with unchecked items
  });

  // Total count for master list
  let masterListTotalCount = $derived(
    masterListData.reduce((sum, group) => sum + group.items.length, 0)
  );

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

  // Handle view mode change
  function handleViewModeChange(mode: 'lists' | 'master' | 'meals') {
    viewMode = mode;

    // Close meal planner modal if it's open when switching to meals view on mobile
    if (mode === 'meals') {
      isMealPlannerModalOpen = false;
    }
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
      // Find the item and its list to get current state and list info
      let currentItem: Item | undefined;
      let currentList: ListWithItems | undefined;
      for (const list of listsData) {
        const item = list.items.find(i => i.id === itemId);
        if (item) {
          currentItem = item;
          currentList = list;
          break;
        }
      }

      if (!currentItem || !currentList) return;

      const newCheckedState = !currentItem.is_checked;

      const updateData: any = {
        is_checked: newCheckedState,
        updated_at: new Date().toISOString()
      };

      // Reset quantity when item is checked (bought)
      if (newCheckedState) {
        updateData.quantity = null;
      }

      const { error } = await data.supabase
        .from('items')
        .update(updateData)
        .eq('id', itemId);

      if (error) {
        console.error('Error toggling item:', error);
        throw error;
      }

      // Log check action for shopping lists (only when checking, not unchecking)
      if (newCheckedState && currentList.list.type === 'shopping' && authStore.userId) {
        try {
          // Insert to Supabase
          const { error: logError } = await data.supabase
            .from('item_check_logs')
            .insert({
              user_id: authStore.userId,
              list_name: currentList.list.title,
              item_name: currentItem.text,
              checked_at: new Date().toISOString(),
              list_id: currentList.list.id,
              item_id: itemId
            });

          if (logError) {
            console.error('Error logging check action:', logError);
          }

          // Also log to local DB for offline support
          await db.logItemCheck(
            authStore.userId,
            currentList.list.title,
            currentItem.text,
            currentList.list.id,
            itemId
          );
        } catch (logErr) {
          console.error('Failed to log check action:', logErr);
          // Don't throw - logging failure shouldn't prevent the check action
        }
      }

      // Update local state
      listsData = listsData.map(list => ({
        ...list,
        items: list.items.map(item =>
          item.id === itemId
            ? { ...item, is_checked: newCheckedState, updated_at: new Date().toISOString() }
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

  // Handle logout
  async function handleLogout(e: MouseEvent) {
    e.stopPropagation();
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

  // ============================================================================
  // MEAL PLANNING HANDLERS
  // ============================================================================

  function handleDishesModalOpen() {
    isDishesModalOpen = true;
    isMealsDropdownOpen = false;
  }

  function handleDishesModalClose() {
    isDishesModalOpen = false;
  }

  function handleMealPlannerModalOpen() {
    isMealPlannerModalOpen = true;
    isMealsDropdownOpen = false;
  }

  function handleMealPlannerModalClose() {
    isMealPlannerModalOpen = false;
  }

  async function handleConfirmMenuClick() {
    // Load unconfirmed menus
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + 10);

      const formatDateISO = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const { data: menusData, error } = await data.supabase.rpc('get_menus_with_dishes', {
        p_start_date: formatDateISO(today),
        p_end_date: formatDateISO(endDate)
      });

      if (error) {
        console.error('Error loading menus for confirmation:', error);
        throw error;
      }

      unconfirmedMenus = (menusData || []).filter((m: MenuWithDetails) => !m.menu.is_confirmed && m.menu.dish_id !== null);

      if (unconfirmedMenus.length > 0) {
        isMealPlannerModalOpen = false;
        isMenuConfirmationDialogOpen = true;
      }
    } catch (err) {
      console.error('Failed to load menus for confirmation:', err);
    }
  }

  function handleMenuConfirmationDialogClose() {
    isMenuConfirmationDialogOpen = false;
    unconfirmedMenus = [];
  }

  async function handleMenuConfirmed() {
    isMenuConfirmationDialogOpen = false;
    unconfirmedMenus = [];

    // Reload lists to show updated quantities
    await handleSync();
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

  // Handle clear cache and sync
  async function handleClearCacheAndSync() {
    if (!syncStore.isOnline || syncStore.isClearingCache) return;

    try {
      await syncStore.performClearCacheAndSync();
      await loadListsFromIndexedDB();
      toast.success('Cache cleared and synced');
    } catch (error) {
      console.error('Clear cache and sync failed:', error);
      const message = error instanceof Error ? error.message : 'Clear cache and sync failed';
      toast.error(message);
    }
  }

  // Theme options
  const themeColors: { value: ThemeColor; label: string; preview: string }[] = [
    { value: 'orange', label: 'Orange', preview: 'oklch(0.5939 0.1730 43.9251)' },
    { value: 'teal', label: 'Teal', preview: 'oklch(0.5939 0.1730 180)' },
    { value: 'blue', label: 'Blue', preview: 'oklch(0.5939 0.1730 250)' },
    { value: 'purple', label: 'Purple', preview: 'oklch(0.5939 0.1730 310)' }
  ];

  // Handle theme color change
  function handleThemeColorChange(color: ThemeColor) {
    themeStore.setColor(color);
    isThemeDropdownOpen = false;
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

      // Always reload (handles both normal sync and clear cache)
      console.log('Reloading lists from IndexedDB...');
      loadListsFromIndexedDB();
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



<div class="app-container">
  <!-- Header -->
  <Header
    title={viewMode === 'master' ? 'All Lists' : (currentList?.list.title || 'Lists')}
    listType={viewMode === 'master' ? 'shopping' : currentList?.list.type}
    isShared={false}
    totalCount={viewMode === 'master' ? masterListTotalCount : currentListTotalCount}
    checkedCount={0}
    onSettingsClick={handleSettingsClick}
    {viewMode}
    onViewModeChange={handleViewModeChange}
  />

  <!-- Main content -->
  <main class="main-content">
    <!-- Floating controls - Always visible on desktop -->
    <div class="desktop-floating-controls">
      <!-- Floating controls - Top Left (User Info & Dropdown) -->
      <div class="floating-controls-left">
        <DropdownMenu.Root bind:open={isUserDropdownOpen}>
          <div class="user-info-floating">
            <div class="user-avatar-floating">
              <User size={16} />
            </div>
            <DropdownMenu.Trigger
              type="button"
              class="user-details-floating"
              aria-label="User menu"
              aria-expanded={isUserDropdownOpen}
            >
              <p class="user-email-floating">{authStore.userEmail || 'No user'}</p>
              <ChevronDown size={14} class="dropdown-chevron" />
            </DropdownMenu.Trigger>
          </div>
          <DropdownMenu.Content align="start" class="w-48">
            <DropdownMenu.Item class="logout-item-custom" onclick={handleLogout}>
              <LogOut size={16} />
              <span>Log out</span>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </div>

      <!-- Floating controls - Top Right (Sync, Edit Lists) -->
      <div class="floating-controls-right">
        <!-- Sync Button (Split Button with shadcn dropdown) -->
        <div class="sync-button-container">
          <!-- Main Sync Button -->
          <Button
            class="sync-button-floating sync-button-main {syncStore.isSyncing || syncStore.isClearingCache ? 'syncing' : syncStore.isOnline && !syncStore.isSyncing && !syncStore.isClearingCache ? 'synced' : !syncStore.isOnline ? 'offline' : ''}"
            onclick={handleSync}
            disabled={!syncStore.isOnline || syncStore.isSyncing || syncStore.isClearingCache}
            aria-label="Sync now"
          >
            <div class="sync-icon" class:spinning={syncStore.isSyncing || syncStore.isClearingCache}>
              <RefreshCw size={20} />
            </div>
            <div class="sync-text-container">
              <span class="sync-status">
                {#if syncStore.isClearingCache}
                  Clearing...
                {:else if syncStore.isSyncing}
                  Syncing...
                {:else if !syncStore.isOnline}
                  Offline
                {:else}
                  Last: {(() => {
                    if (!syncStore.lastSyncAt) return 'Never';
                    const now = new Date();
                    const diff = now.getTime() - syncStore.lastSyncAt.getTime();
                    const seconds = Math.floor(diff / 1000);
                    const minutes = Math.floor(seconds / 60);
                    const hours = Math.floor(minutes / 60);

                    if (seconds < 60) return 'now';
                    if (minutes < 60) return `${minutes}m ago`;
                    if (hours < 24) return `${hours}h ago`;
                    return syncStore.lastSyncAt.toLocaleDateString();
                  })()}
                {/if}
              </span>
            </div>
          </Button>

          <!-- Dropdown Menu -->
          <DropdownMenu.Root>
            <DropdownMenu.Trigger
              type="button"
              class={syncStore.isSyncing || syncStore.isClearingCache ? 'syncing' : syncStore.isOnline && !syncStore.isSyncing && !syncStore.isClearingCache ? 'synced' : !syncStore.isOnline ? 'offline' : ''}
              disabled={!syncStore.isOnline || syncStore.isSyncing || syncStore.isClearingCache}
              aria-label="Sync options"
            >
              <ChevronDown size={18} />
            </DropdownMenu.Trigger>

            <DropdownMenu.Content align="end" class="sync-dropdown-content">
              <DropdownMenu.Item
                class="sync-dropdown-item"
                disabled={syncStore.isClearingCache}
                onSelect={handleClearCacheAndSync}
              >
                <Database size={16} class="mr-2" />
                Clear cache and sync
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </div>

        <!-- Edit Lists Button -->
        <Button
          class="action-button-floating edit-lists-button"
          onclick={handleEditLists}
          aria-label="Edit lists"
          title="Edit lists"
        >
          <ListPlus size={18} />
          <span class="button-text">Edit lists</span>
        </Button>

        <!-- Meals Button (Desktop only, Split Button with Dropdown) -->
        <div class="meals-button-container hidden lg:block">
          <!-- Main Meals Button -->
          <Button
            class="action-button-floating meals-button-main"
            onclick={handleMealPlannerModalOpen}
            aria-label="Meal planner"
            title="Meal planner"
          >
            <UtensilsCrossed size={18} />
            <span class="button-text">Meals</span>
          </Button>

          <!-- Dropdown Menu -->
          <DropdownMenu.Root bind:open={isMealsDropdownOpen}>
            <DropdownMenu.Trigger
              type="button"
              class="action-button-floating dropdown-trigger"
              aria-label="Meals options"
              title="Meals options"
            >
              <ChevronDown size={14} />
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="end" class="w-48">
              <DropdownMenu.Item onclick={handleMealPlannerModalOpen}>
                <span>Meal Planner</span>
              </DropdownMenu.Item>
              <DropdownMenu.Item onclick={handleDishesModalOpen}>
                <span>Dishes</span>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </div>

        <!-- Theme Button with Dropdown -->
        <div class="theme-button-container">
          <!-- Main Theme Button -->
          <Button
            class="action-button-floating theme-button-main"
            onclick={() => isThemeDropdownOpen = !isThemeDropdownOpen}
            aria-label="Change theme"
            title="Change theme"
          >
            <Palette size={18} />
            <span class="button-text">Theme</span>
          </Button>

          <!-- Dropdown Menu -->
          <DropdownMenu.Root bind:open={isThemeDropdownOpen}>
            <DropdownMenu.Trigger
              type="button"
              aria-label="Theme options"
            >
              <ChevronDown size={18} />
            </DropdownMenu.Trigger>

            <DropdownMenu.Content align="end" class="theme-dropdown-content">
              <div class="theme-dropdown-header">
                <span class="theme-dropdown-title">Theme Color</span>
              </div>
              {#each themeColors as color}
                <DropdownMenu.Item
                  class="theme-dropdown-item"
                  onSelect={() => handleThemeColorChange(color.value)}
                >
                  <div class="theme-color-indicator" style="background: {color.preview}"></div>
                  <span>{color.label}</span>
                  {#if themeStore.color === color.value}
                    <Check size={16} class="ml-auto" />
                  {/if}
                </DropdownMenu.Item>
              {/each}
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </div>
      </div>
    </div>

    {#if listsData.length === 0}
      <!-- Empty state -->
      <div class="empty-state">
        <p class="empty-text">No lists yet</p>
        <p class="empty-subtext">Create a list to get started</p>
      </div>
    {:else}
      <!-- Mobile: Three view modes -->
      <div class="mobile-view">
        {#if viewMode === 'master'}
          <!-- Master list view - all unchecked items from all shopping lists -->
          <MasterList
            groups={masterListData}
            onToggleItem={handleToggleItem}
          />
        {:else if viewMode === 'meals'}
          <!-- Meals view - inline meal planner -->
          <div class="mobile-meals-view">
            <MealPlannerContent
              supabase={data.supabase}
              userId={authStore.userId || ''}
              onConfirmMenu={handleConfirmMenuClick}
              showCloseButton={false}
            />
          </div>
        {:else}
          <!-- Normal list view - swipeable individual lists -->
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

  <!-- Dishes Modal -->
  <DishesModal
    isOpen={isDishesModalOpen}
    onClose={handleDishesModalClose}
    supabase={data.supabase}
    userId={authStore.userId || ''}
    lists={listsData}
  />

  <!-- Meal Planner Modal -->
  <MealPlannerModal
    isOpen={isMealPlannerModalOpen}
    onClose={handleMealPlannerModalClose}
    supabase={data.supabase}
    userId={authStore.userId || ''}
    onConfirmMenu={handleConfirmMenuClick}
  />

  <!-- Menu Confirmation Dialog -->
  <MenuConfirmationDialog
    isOpen={isMenuConfirmationDialogOpen}
    onClose={handleMenuConfirmationDialogClose}
    supabase={data.supabase}
    menus={unconfirmedMenus}
    onConfirmed={handleMenuConfirmed}
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

    /* Prevent text selection on desktop */
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
  }

  .main-content {
    /* Layout */
    flex: 1;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;

    /* Spacing - account for fixed header on mobile */
    margin-top: 64px;
  }

  /* Aurora background effect - desktop only */
  .main-content::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;

    /* No aurora on mobile - clean background */
    display: none;
  }

  @keyframes aurora-drift {
    0%, 100% {
      transform: translate(0, 0) scale(1);
    }
    25% {
      transform: translate(4%, -3%) scale(1.04);
    }
    50% {
      transform: translate(-3%, 3%) scale(0.97);
    }
    75% {
      transform: translate(2%, 1%) scale(1.03);
    }
  }

  /* Optional: CSS noise overlay for organic texture */
  .main-content.noise-css::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80' opacity='0.04'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /></filter><rect width='100%' height='100%' filter='url(%23n)' /></svg>");
    background-size: 300px;
    mix-blend-mode: overlay;
  }

  /* Ensure content appears above aurora */
  .main-content > * {
    position: relative;
    z-index: 1;
  }

  @media (min-width: 1024px) {
    .main-content {
      /* No margin-top on desktop since header is hidden */
      margin-top: 0;
    }

    /* Aurora background - desktop only with smooth transitions */
    .main-content::before {
      display: block;
      background:
        /* Primary orange orb - top left */
        radial-gradient(
          ellipse 60vw 50vh at 15% 25%,
          rgba(249, 115, 22, 0.20) 0%,
          rgba(249, 115, 22, 0.12) 25%,
          rgba(180, 70, 30, 0.08) 45%,
          rgba(120, 40, 40, 0.04) 65%,
          rgba(60, 20, 30, 0.02) 80%,
          transparent 100%
        ),
        /* Teal orb - bottom right */
        radial-gradient(
          ellipse 60vw 50vh at 85% 75%,
          rgba(20, 184, 166, 0.15) 0%,
          rgba(20, 184, 166, 0.09) 25%,
          rgba(15, 120, 130, 0.06) 45%,
          rgba(10, 70, 90, 0.03) 65%,
          rgba(5, 40, 60, 0.015) 80%,
          transparent 100%
        ),
        /* Purple orb - upper right */
        radial-gradient(
          ellipse 60vw 50vh at 60% 35%,
          rgba(168, 85, 247, 0.18) 0%,
          rgba(168, 85, 247, 0.11) 25%,
          rgba(120, 60, 180, 0.07) 45%,
          rgba(80, 40, 120, 0.04) 65%,
          rgba(50, 25, 80, 0.02) 80%,
          transparent 100%
        ),
        /* Blue orb - lower left */
        radial-gradient(
          ellipse 60vw 50vh at 35% 75%,
          rgba(59, 130, 246, 0.18) 0%,
          rgba(59, 130, 246, 0.11) 25%,
          rgba(40, 90, 180, 0.07) 45%,
          rgba(25, 60, 120, 0.04) 65%,
          rgba(15, 35, 80, 0.02) 80%,
          transparent 100%
        );

      /* Performance optimizations */
      will-change: transform, opacity;
      mix-blend-mode: screen;

      /* Increased blur for extremely smooth effect */
      filter: blur(var(--blur, 120px));

      /* Dynamic scale control */
      transform: scale(var(--scale, 1));

      /* Slow, subtle animation */
      animation: aurora-drift var(--duration, 18s) ease-in-out infinite alternate;
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

  /* Mobile meals view container */
  .mobile-meals-view {
    /* Layout */
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0; /* Critical for flex scrolling in nested containers */
    overflow: hidden;
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

  /* ========================================================================
     DESKTOP FLOATING CONTROLS WRAPPER
     ======================================================================== */

  /* Hide desktop controls on mobile by default */
  .desktop-floating-controls {
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

    /* Show desktop floating controls on desktop */
    .desktop-floating-controls {
      display: block;

      /* High z-index to ensure controls are clickable above all content */
      position: relative;
      z-index: 100;
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
      flex-direction: row;
      align-items: center;
      gap: var(--space-2);
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

    /* Dropdown Chevron Icon */
    .user-details-floating :global(.dropdown-chevron) {
      /* Color */
      color: var(--text-muted);

      /* Layout */
      flex-shrink: 0;

      /* Transition */
      transition: transform var(--transition-fast), color var(--transition-fast);
    }

    .user-details-floating:hover :global(.dropdown-chevron) {
      color: var(--text-secondary);
    }

    .user-details-floating[aria-expanded="true"] :global(.dropdown-chevron) {
      transform: rotate(180deg);
      color: var(--accent-primary);
    }

    /* Override shadcn DropdownMenu.Trigger defaults for custom user button */
    :global([data-slot="dropdown-menu-trigger"].user-details-floating) {
      display: flex !important;
      flex-direction: row !important;
      align-items: center !important;
      gap: var(--space-2) !important;
      background: none !important;
      border: none !important;
      padding: 0 !important;
      min-width: 0 !important;
    }

    /* User Dropdown Menu */
    .user-dropdown-menu {
      /* Position */
      position: absolute;
      top: calc(100% + var(--space-1));
      right: 0;
      z-index: 50;

      /* Size */
      min-width: 200px;

      /* Style */
      background-color: var(--bg-primary);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-xl);

      /* Spacing */
      padding: var(--space-1);

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
      color: var(--text-primary);

      /* Spacing */
      padding: var(--space-3) var(--space-4);

      /* Transition */
      transition: background-color var(--transition-fast);
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
      color: #ef4444;
    }

    .logout-item:hover {
      background-color: rgba(239, 68, 68, 0.1);
      color: #f87171;
    }

    .logout-item:active {
      background-color: rgba(239, 68, 68, 0.15);
    }

    /* Custom logout item styling for shadcn DropdownMenu.Item */
    :global([data-slot="dropdown-menu-item"].logout-item-custom) {
      color: #ef4444 !important;
    }

    :global([data-slot="dropdown-menu-item"].logout-item-custom[data-highlighted]) {
      background-color: rgba(239, 68, 68, 0.1) !important;
      color: #f87171 !important;
    }

    :global([data-slot="dropdown-menu-item"].logout-item-custom) :global(svg) {
      color: #ef4444 !important;
    }

    :global([data-slot="dropdown-menu-item"].logout-item-custom[data-highlighted]) :global(svg) {
      color: #f87171 !important;
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

    /* Override shadcn Button defaults for action-button-floating */
    :global(button.action-button-floating) {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 48px !important;
      height: 48px !important;
      background-color: var(--bg-secondary) !important;
      border: 1px solid var(--border-subtle) !important;
      border-radius: var(--radius-lg) !important;
      cursor: pointer !important;
      box-shadow: var(--shadow-lg) !important;
      color: var(--text-secondary) !important;
      transition: color var(--transition-fast),
                  background-color var(--transition-fast),
                  box-shadow var(--transition-fast),
                  transform var(--transition-fast) !important;
    }

    /* Edit Lists Button with text */
    .action-button-floating.edit-lists-button {
      /* Size - wider to accommodate text */
      width: auto;
      gap: var(--space-2);
      padding: 0 var(--space-4);
    }

    :global(button.action-button-floating.edit-lists-button) {
      width: auto !important;
      gap: var(--space-2) !important;
      padding: 0 var(--space-4) !important;
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
      height: 48px;

      /* Style - matches menu-item */
      background-color: var(--bg-secondary);
      border: 1px solid var(--border-subtle);
      cursor: pointer;
      box-shadow: var(--shadow-lg);

      /* Typography */
      font-family: var(--font-body);
      font-size: var(--text-base);
      font-weight: var(--font-medium);

      /* Transition */
      transition: background-color var(--transition-fast),
                  border-color var(--transition-fast),
                  box-shadow var(--transition-fast),
                  transform var(--transition-fast);
    }

    /* Override shadcn Button defaults for sync-button-floating */
    :global(button.sync-button-floating) {
      all: unset !important;
      box-sizing: border-box !important;
      display: flex !important;
      align-items: center !important;
      justify-content: flex-start !important;
      gap: var(--space-3) !important;
      padding: var(--space-3) var(--space-4) !important;
      height: 48px !important;
      background-color: var(--bg-secondary) !important;
      border: 1px solid var(--border-subtle) !important;
      cursor: pointer !important;
      box-shadow: var(--shadow-lg) !important;
      font-family: var(--font-body) !important;
      font-size: var(--text-base) !important;
      font-weight: var(--font-medium) !important;
      transition: background-color var(--transition-fast),
                  border-color var(--transition-fast),
                  box-shadow var(--transition-fast),
                  transform var(--transition-fast) !important;
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

    /* Sync Button States */

    /* Synced state - no special styling */
    .sync-button-floating.synced {
      background-color: var(--bg-secondary);
      border-color: var(--border-subtle);
    }

    .sync-button-floating.synced:hover:not(:disabled) {
      background-color: var(--bg-hover);
      border-color: var(--border-default);
      box-shadow: var(--shadow-xl);
      transform: translateY(-1px);
    }

    /* Syncing state - no special styling */
    .sync-button-floating.syncing {
      background-color: var(--bg-secondary);
      border-color: var(--border-subtle);
    }

    /* Offline state - muted */
    .sync-button-floating.offline {
      background-color: var(--bg-secondary);
      border-color: var(--border-subtle);
      opacity: 0.7;
    }

    .sync-button-floating.offline .sync-icon,
    .sync-button-floating.offline .sync-text {
      color: var(--text-muted);
    }

    .sync-button-floating:hover:not(:disabled):not(.syncing):not(.offline) {
      background-color: var(--bg-hover);
      border-color: var(--border-default);
      box-shadow: var(--shadow-xl);
      transform: translateY(-1px);
    }

    .sync-button-floating:focus-visible {
      outline: 2px solid var(--border-focus);
      outline-offset: 2px;
    }

    .sync-button-floating:disabled {
      cursor: not-allowed;
    }

    .sync-button-floating:active:not(:disabled) {
      box-shadow: var(--shadow-md);
      transform: translateY(0);
    }

    /* Split Button Container */
    .sync-button-container {
      position: relative;
      display: flex;
      align-items: stretch;
    }

    .sync-button-main {
      flex: 1;
      min-width: 0;
      border-right: 1px solid currentColor;
      border-top-left-radius: var(--radius-lg);
      border-bottom-left-radius: var(--radius-lg);
      border-top-right-radius: 0;
      border-bottom-right-radius: 0;
    }

    :global(button.sync-button-floating.sync-button-main) {
      flex: 1 !important;
      min-width: 0 !important;
      border-right: 1px solid currentColor !important;
      border-top-left-radius: var(--radius-lg) !important;
      border-bottom-left-radius: var(--radius-lg) !important;
      border-top-right-radius: 0 !important;
      border-bottom-right-radius: 0 !important;
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
      height: 48px;
      flex-shrink: 0;
      padding: 0;

      /* Style - matches main button default */
      background-color: var(--bg-secondary);
      border: 1px solid var(--border-subtle);
      border-top-right-radius: var(--radius-lg);
      border-bottom-right-radius: var(--radius-lg);
      border-top-left-radius: 0;
      border-bottom-left-radius: 0;
      border-left: none;
      cursor: pointer;
      box-shadow: var(--shadow-lg);

      /* Color */
      color: var(--text-primary);

      /* Transition - matches main button */
      transition: color var(--transition-fast),
                  background-color var(--transition-fast),
                  border-color var(--transition-fast),
                  box-shadow var(--transition-fast),
                  transform var(--transition-fast);
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
      box-shadow: var(--shadow-xl);
      transform: translateY(-1px);
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
      box-shadow: var(--shadow-xl);
      transform: translateY(-1px);
    }

    /* Active state */
    .sync-button-container :global(button[data-slot="dropdown-menu-trigger"]:active:not(:disabled)) {
      box-shadow: var(--shadow-md);
      transform: translateY(0);
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

    /* ========================================================================
       THEME BUTTON & DROPDOWN
       ======================================================================== */

    .theme-button-container {
      position: relative;
      display: flex;
      align-items: stretch;
    }

    .theme-button-main {
      /* Inherits from action-button-floating */
      /* Size - match edit-lists-button width */
      width: auto;
      gap: var(--space-2);
      padding: 0 var(--space-4);

      /* Split button styling */
      border-top-right-radius: 0;
      border-bottom-right-radius: 0;
      border-right: none;
    }

    :global(button.action-button-floating.theme-button-main) {
      width: auto !important;
      gap: var(--space-2) !important;
      padding: 0 var(--space-4) !important;
      border-top-right-radius: 0 !important;
      border-bottom-right-radius: 0 !important;
      border-right: none !important;
    }

    /* Arrow button - targets shadcn Trigger */
    .theme-button-container :global(button[data-slot="dropdown-menu-trigger"]) {
      /* Reset */
      all: unset;
      box-sizing: border-box;

      /* Layout */
      display: flex;
      align-items: center;
      justify-content: center;

      /* Size */
      width: 48px;
      height: 48px;
      flex-shrink: 0;
      padding: 0;

      /* Style - matches action-button-floating */
      background-color: var(--bg-secondary);
      border: 1px solid var(--border-subtle);
      border-top-right-radius: var(--radius-lg);
      border-bottom-right-radius: var(--radius-lg);
      border-top-left-radius: 0;
      border-bottom-left-radius: 0;
      border-left: 1px solid var(--border-subtle);
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

    .theme-button-container :global(button[data-slot="dropdown-menu-trigger"]:hover:not(:disabled)) {
      color: var(--text-primary);
      background-color: var(--bg-hover);
      box-shadow: var(--shadow-xl);
      transform: translateY(-1px);
    }

    .theme-button-container :global(button[data-slot="dropdown-menu-trigger"]:focus-visible) {
      outline: 2px solid var(--border-focus);
      outline-offset: 2px;
    }

    .theme-button-container :global(button[data-slot="dropdown-menu-trigger"]:active:not(:disabled)) {
      background-color: var(--bg-tertiary);
      box-shadow: var(--shadow-md);
      transform: translateY(0);
    }

    /* ------------------------------------------------------------------------
       Meals Button Container (Split Button, Desktop only)
       ------------------------------------------------------------------------ */

    .meals-button-container {
      position: relative;
      display: flex;
      align-items: stretch;
    }

    .meals-button-main {
      /* Inherits from action-button-floating */
      width: auto;
      gap: var(--space-2);
      padding: 0 var(--space-4);
      border-top-right-radius: 0;
      border-bottom-right-radius: 0;
      border-right: none;
    }

    :global(button.action-button-floating.meals-button-main) {
      width: auto !important;
      gap: var(--space-2) !important;
      padding: 0 var(--space-4) !important;
      border-top-right-radius: 0 !important;
      border-bottom-right-radius: 0 !important;
      border-right: none !important;
    }

    .meals-button-container :global(button[data-slot="dropdown-menu-trigger"]) {
      all: unset;
      box-sizing: border-box;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      flex-shrink: 0;
      padding: 0;
      background-color: var(--bg-secondary);
      border: 1px solid var(--border-subtle);
      border-top-right-radius: var(--radius-lg);
      border-bottom-right-radius: var(--radius-lg);
      border-top-left-radius: 0;
      border-bottom-left-radius: 0;
      border-left: 1px solid var(--border-subtle);
      cursor: pointer;
      box-shadow: var(--shadow-lg);
      color: var(--text-secondary);
      transition: color var(--transition-fast),
                  background-color var(--transition-fast),
                  box-shadow var(--transition-fast),
                  transform var(--transition-fast);
    }

    .meals-button-container :global(button[data-slot="dropdown-menu-trigger"]:hover:not(:disabled)) {
      color: var(--text-primary);
      background-color: var(--bg-hover);
      box-shadow: var(--shadow-xl);
      transform: translateY(-1px);
    }

    .meals-button-container :global(button[data-slot="dropdown-menu-trigger"]:focus-visible) {
      outline: 2px solid var(--border-focus);
      outline-offset: 2px;
    }

    .meals-button-container :global(button[data-slot="dropdown-menu-trigger"]:active:not(:disabled)) {
      background-color: var(--bg-tertiary);
      box-shadow: var(--shadow-md);
      transform: translateY(0);
    }

    :global(.theme-dropdown-content) {
      min-width: 200px;
      background-color: var(--bg-primary);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-xl);
      padding: var(--space-2);
      z-index: 110;
    }

    :global(.theme-dropdown-header) {
      padding: var(--space-2) var(--space-3);
      margin-bottom: var(--space-1);
    }

    :global(.theme-dropdown-title) {
      font-size: var(--text-xs);
      font-weight: var(--font-semibold);
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    :global(.theme-dropdown-item) {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-2) var(--space-3);
      color: var(--text-primary);
      font-size: var(--text-sm);
      cursor: pointer;
      border-radius: var(--radius-sm);
      transition: background-color var(--transition-fast);
    }

    :global(.theme-dropdown-item:hover) {
      background-color: var(--bg-hover);
    }

    :global(.theme-dropdown-separator) {
      height: 1px;
      background-color: var(--border-subtle);
      margin: var(--space-1) 0;
    }

    :global(.theme-color-indicator) {
      width: 16px;
      height: 16px;
      border-radius: var(--radius-full);
      border: 2px solid var(--border-default);
      flex-shrink: 0;
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

    /* Style - Uses theme color */
    background: linear-gradient(135deg,
      oklch(from var(--primary) calc(l * 0.95) c h) 0%,
      oklch(from var(--primary) calc(l * 1.10) c h) 100%
    );
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
