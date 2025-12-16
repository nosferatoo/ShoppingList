<script lang="ts">
  // Reusable meal planner content component
  // Used in both desktop modal and mobile inline view

  import { Trash2, ChevronDown, Plus, Check } from 'lucide-svelte';
  import { Button } from '$lib/components/ui/button';
  import * as Popover from '$lib/components/ui/popover';
  import * as Command from '$lib/components/ui/command';
  import type { Menu, MenuWithDetails, Dish, DishWithIngredients } from '$lib/types';
  import { isActiveDish } from '$lib/types';

  // Props
  interface Props {
    supabase: import('@supabase/supabase-js').SupabaseClient;
    userId: string;
    onConfirmMenu?: () => void;
    onClose?: () => void;
    showCloseButton?: boolean;
  }

  let { supabase, userId, onConfirmMenu, onClose, showCloseButton = false }: Props = $props();

  // State
  let menus = $state<MenuWithDetails[]>([]);
  let dishes = $state<Dish[]>([]);
  let isLoading = $state(false);
  let isSaving = $state(false);
  let openDropdownDate = $state<string | null>(null);
  let contentRef = $state<HTMLDivElement | null>(null);
  let footerRef = $state<HTMLDivElement | null>(null);
  let additionalDays = $state(0); // Extra days beyond default 7

  // Derived state - all dates to display (history + upcoming)
  let allDates = $derived.by(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const dates: { date: Date; isPast: boolean }[] = [];

    // Add history dates from existing menus (including today)
    const historyMenuDates = menus
      .filter(m => new Date(m.menu.planned_date) < tomorrow)
      .map(m => ({
        date: new Date(m.menu.planned_date),
        isPast: true
      }));

    dates.push(...historyMenuDates);

    // Add upcoming dates (tomorrow + 7 days + additional days)
    const totalDays = 7 + additionalDays;
    for (let i = 1; i <= totalDays; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push({ date, isPast: false });
    }

    // Sort by date ascending (oldest first)
    return dates.sort((a, b) => a.date.getTime() - b.date.getTime());
  });

  // Derived state - menus map by date string
  let menusMap = $derived.by(() => {
    const map = new Map<string, MenuWithDetails>();

    for (const menu of menus) {
      const menuDate = new Date(menu.menu.planned_date);
      menuDate.setHours(0, 0, 0, 0);
      map.set(formatDateISO(menuDate), menu);
    }

    return map;
  });

  // Derived state - has unconfirmed menus
  let hasUnconfirmedMenus = $derived.by(() => {
    return menus.some(m => !m.menu.is_confirmed && m.menu.dish_id !== null);
  });

  // Load data on mount
  $effect(() => {
    loadData();
  });

  // Scroll to bottom (show footer with buttons) when data is loaded
  $effect(() => {
    if (!isLoading && contentRef && footerRef && allDates.length > 0) {
      // Use different scroll methods for mobile vs desktop
      const isMobile = window.innerWidth < 1024;

      if (isMobile) {
        // Mobile: scrollIntoView works reliably
        footerRef.scrollIntoView({ behavior: 'auto', block: 'end' });
      } else {
        // Desktop: manual scroll works reliably
        queueMicrotask(() => {
          if (contentRef) {
            contentRef.scrollTop = contentRef.scrollHeight;
          }
        });
      }
    }
  });

  // ============================================================================
  // DATE FORMATTING
  // ============================================================================

  function formatDateISO(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function formatDateDisplay(date: Date): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    if (targetDate.getTime() === today.getTime()) {
      return 'Today';
    } else if (targetDate.getTime() === tomorrow.getTime()) {
      return 'Tomorrow';
    } else {
      // Format as "Dec 15" (without year)
      const options: Intl.DateTimeFormatOptions = {
        month: 'short',
        day: 'numeric'
      };
      return targetDate.toLocaleDateString('en-US', options);
    }
  }

  function formatDayName(date: Date): string {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long' };
    return date.toLocaleDateString('en-US', options);
  }

  // ============================================================================
  // LOAD DATA
  // ============================================================================

  async function loadData() {
    isLoading = true;
    try {
      // Load dishes (active only)
      const { data: dishesData, error: dishesError } = await supabase.rpc('get_dishes_with_ingredients');

      if (dishesError) {
        console.error('Error loading dishes:', dishesError);
        throw dishesError;
      }

      const allDishes: DishWithIngredients[] = dishesData || [];
      dishes = allDishes
        .filter(d => isActiveDish(d.dish))
        .map(d => d.dish)
        .sort((a, b) => a.name.localeCompare(b.name));

      // Load menus for date range (30 days history + 30 days ahead to capture all planned meals)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const startDate = new Date(today);
      startDate.setDate(today.getDate() - 30);

      const endDate = new Date(today);
      endDate.setDate(today.getDate() + 30);

      const { data: menusData, error: menusError } = await supabase.rpc('get_menus_with_dishes', {
        p_start_date: formatDateISO(startDate),
        p_end_date: formatDateISO(endDate)
      });

      if (menusError) {
        console.error('Error loading menus:', menusError);
        throw menusError;
      }

      menus = menusData || [];

      // Calculate additional days needed based on furthest planned menu
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      // Find the furthest future menu date
      let maxDaysAhead = 0;
      for (const menuData of menus) {
        const menuDate = new Date(menuData.menu.planned_date);
        menuDate.setHours(0, 0, 0, 0);

        if (menuDate >= tomorrow) {
          const daysAhead = Math.floor((menuDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (daysAhead > maxDaysAhead) {
            maxDaysAhead = daysAhead;
          }
        }
      }

      // Set additional days if we have menus beyond the default 7 days
      additionalDays = Math.max(0, maxDaysAhead - 7);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      isLoading = false;
    }
  }

  // ============================================================================
  // MENU CRUD
  // ============================================================================

  async function handleSelectDish(date: Date, dishId: number | null) {
    const dateISO = formatDateISO(date);
    const existingMenu = menusMap.get(dateISO);

    isSaving = true;

    try {
      if (dishId === null) {
        // Remove menu if exists
        if (existingMenu) {
          const { error } = await supabase
            .from('menus')
            .delete()
            .eq('id', existingMenu.menu.id);

          if (error) {
            console.error('Error deleting menu:', error);
            throw error;
          }

          // Update local state
          menus = menus.filter(m => m.menu.id !== existingMenu.menu.id);
        }
      } else {
        // Find dish
        const dish = dishes.find(d => d.id === dishId);
        if (!dish) return;

        if (existingMenu) {
          // Update existing menu
          const { error } = await supabase
            .from('menus')
            .update({
              dish_id: dishId,
              dish_name: dish.name,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingMenu.menu.id);

          if (error) {
            console.error('Error updating menu:', error);
            throw error;
          }

          // Update local state
          menus = menus.map(m => {
            if (m.menu.id === existingMenu.menu.id) {
              return {
                ...m,
                menu: {
                  ...m.menu,
                  dish_id: dishId,
                  dish_name: dish.name,
                  updated_at: new Date().toISOString()
                },
                dish
              };
            }
            return m;
          });
        } else {
          // Create new menu
          const { data: newMenu, error } = await supabase
            .from('menus')
            .insert({
              planned_date: dateISO,
              dish_id: dishId,
              dish_name: dish.name
            })
            .select()
            .single();

          if (error) {
            console.error('Error creating menu:', error);
            throw error;
          }

          // Add to local state
          menus = [
            ...menus,
            {
              menu: newMenu,
              dish,
              ingredients: []
            }
          ];
        }
      }
    } catch (err) {
      console.error('Failed to update menu:', err);
    } finally {
      isSaving = false;
    }
  }

  async function handleDeleteMenu(menuId: number) {
    isSaving = true;

    try {
      const { error } = await supabase
        .from('menus')
        .delete()
        .eq('id', menuId);

      if (error) {
        console.error('Error deleting menu:', error);
        throw error;
      }

      // Update local state
      menus = menus.filter(m => m.menu.id !== menuId);
    } catch (err) {
      console.error('Failed to delete menu:', err);
    } finally {
      isSaving = false;
    }
  }

  // ============================================================================
  // CONFIRM MENU
  // ============================================================================

  function handleConfirmMenuClick() {
    onConfirmMenu?.();
  }

  // ============================================================================
  // ADD NEW DAY
  // ============================================================================

  function handleAddNewDay() {
    additionalDays++;

    // Scroll to bottom after new day is added
    const isMobile = window.innerWidth < 1024;

    if (isMobile && footerRef) {
      footerRef.scrollIntoView({ behavior: 'smooth', block: 'end' });
    } else if (contentRef) {
      queueMicrotask(() => {
        if (contentRef) {
          contentRef.scrollTop = contentRef.scrollHeight;
        }
      });
    }
  }
</script>

<!-- Wrapper container for proper flex layout -->
<div class="meal-planner-wrapper">
  <!-- Content -->
  <div bind:this={contentRef} class="meal-planner-content">
    {#if isLoading}
      <div class="flex items-center justify-center p-8">
        <p class="text-muted-foreground">Loading meal planner...</p>
      </div>
    {:else}
      <div class="flex flex-col gap-2">
        {#each allDates as { date, isPast }, index (formatDateISO(date))}
          {@const dateISO = formatDateISO(date)}
          {@const menu = menusMap.get(dateISO)}
          {@const isDropdownOpen = openDropdownDate === dateISO}
          {@const isConfirmed = menu?.menu.is_confirmed ?? false}
          {@const prevIsPast = index > 0 ? allDates[index - 1].isPast : true}
          {@const showSeparator = !isPast && prevIsPast}

          {#if showSeparator}
            <!-- Separator between history and planned meals -->
            <div class="meal-planner-divider">
              <span class="divider-text">Planned Meals</span>
            </div>
          {/if}

          {#if isPast && menu}
            <!-- History item (read-only) -->
            <div
              class="flex min-h-[48px] items-center gap-[2px] rounded-md border border-border bg-muted p-1.5 px-2 lg:p-2 lg:px-3 opacity-60"
            >
              <!-- Date -->
              <div class="flex w-16 lg:w-20 flex-shrink-0 flex-col">
                <span class="text-xs lg:text-sm font-medium">{formatDateDisplay(date)}</span>
                <span class="text-[10px] lg:text-xs text-muted-foreground">{formatDayName(date)}</span>
              </div>

              <!-- Dish name -->
              <div class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-xs lg:text-sm">
                {#if menu.dish}
                  {menu.dish.name}
                {:else}
                  <span class="text-muted-foreground">(Deleted) {menu.menu.dish_name}</span>
                {/if}
              </div>

              <!-- Confirmed icon -->
              {#if menu.menu.is_confirmed}
                <div class="action-button-confirmed-mobile lg:action-button-confirmed flex-shrink-0 flex items-center justify-center">
                  <Check size={16} class="lg:hidden" />
                  <Check size={18} class="hidden lg:block" />
                </div>
              {/if}
            </div>
          {:else if !isPast}
            <!-- Upcoming item (editable or confirmed) -->
            <div class="flex min-h-[48px] items-center gap-[2px] rounded-md border border-border bg-muted p-1.5 px-2 lg:p-2 lg:px-3 {isConfirmed ? 'opacity-60' : 'transition-colors hover:border-input hover:bg-accent'}">
              <!-- Date -->
              <div class="flex w-16 lg:w-20 flex-shrink-0 flex-col">
                <span class="text-xs lg:text-sm font-medium">{formatDateDisplay(date)}</span>
                <span class="text-[10px] lg:text-xs text-muted-foreground">{formatDayName(date)}</span>
              </div>

              {#if isConfirmed && menu}
                <!-- Confirmed: Plain text display (like history) -->
                <div class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-sm text-left px-4 py-2">
                  {#if menu.dish}
                    {menu.dish.name}
                  {:else}
                    <span class="text-muted-foreground">(Deleted) {menu.menu.dish_name}</span>
                  {/if}
                </div>
              {:else}
                <!-- Not confirmed: Dish combobox -->
                <Popover.Root
                  open={isDropdownOpen}
                  onOpenChange={(open) => {
                    openDropdownDate = open ? dateISO : null;
                  }}
                >
                  <Popover.Trigger class="w-full">
                    <Button
                      variant="ghost"
                      class="w-full justify-start"
                      disabled={isSaving}
                      role="combobox"
                      aria-expanded={isDropdownOpen}
                    >
                      <span class="truncate text-left">
                        {menu?.dish?.name || menu?.menu.dish_name || 'No dish planned'}
                      </span>
                      <ChevronDown size={16} class="ml-auto flex-shrink-0 opacity-50" />
                    </Button>
                  </Popover.Trigger>
                  <Popover.Content class="dish-selector-popover w-[450px] p-0" align="start">
                    <Command.Root class="dish-selector-command">
                      <Command.Input placeholder="Search dishes..." class="h-10 border-b" />
                      <Command.List class="max-h-[450px]">
                        <Command.Empty class="py-6 text-center text-sm">No dishes found</Command.Empty>
                        <Command.Group>
                          <Command.Item
                            value="none"
                            class="dish-selector-item"
                            onSelect={() => {
                              handleSelectDish(date, null);
                              openDropdownDate = null;
                            }}
                          >
                            No dish planned
                          </Command.Item>
                          {#each dishes as dish (dish.id)}
                            <Command.Item
                              value={dish.name}
                              class="dish-selector-item {menu?.menu.dish_id === dish.id ? 'dish-selector-item-selected' : ''}"
                              onSelect={() => {
                                handleSelectDish(date, dish.id);
                                openDropdownDate = null;
                              }}
                            >
                              {dish.name}
                            </Command.Item>
                          {/each}
                        </Command.Group>
                      </Command.List>
                    </Command.Root>
                  </Popover.Content>
                </Popover.Root>
              {/if}

              <!-- Confirmed icon or Delete button -->
              {#if menu}
                {#if isConfirmed}
                  <div class="action-button-confirmed flex-shrink-0 flex items-center justify-center">
                    <Check size={18} />
                  </div>
                {:else}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    class="action-button-delete flex-shrink-0"
                    onclick={() => handleDeleteMenu(menu.menu.id)}
                    disabled={isSaving}
                    aria-label="Delete menu for {formatDateDisplay(date)}"
                  >
                    <Trash2 size={18} />
                  </Button>
                {/if}
              {/if}
            </div>
          {/if}
        {/each}
      </div>
    {/if}
  </div>

  <!-- Footer -->
  <div bind:this={footerRef} class="meal-planner-footer">
    <Button
      variant="outline"
      size="sm"
      class="h-9"
      onclick={handleAddNewDay}
      disabled={isLoading || isSaving}
    >
      <Plus size={16} class="mr-1" />
      Add new day
    </Button>
    <div class="flex items-center gap-2">
      <Button
        variant="default"
        size="sm"
        class="h-9"
        onclick={handleConfirmMenuClick}
        disabled={!hasUnconfirmedMenus || isLoading || isSaving}
      >
        Confirm Menu
      </Button>
      {#if showCloseButton}
        <Button variant="outline" size="sm" class="h-9" onclick={onClose}>
          Close
        </Button>
      {/if}
    </div>
  </div>
</div>

<style>
  .meal-planner-wrapper {
    /* Layout - flex container to constrain children */
    display: flex;
    flex-direction: column;
    flex: 1; /* Use flex instead of height: 100% for mobile compatibility */
    min-height: 0; /* Important for proper flex shrinking */
  }

  .meal-planner-content {
    /* Layout */
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: var(--space-3) var(--space-3);
    min-height: 0; /* Important for proper scrolling in flex container */
  }

  @media (min-width: 1024px) {
    .meal-planner-wrapper {
      /* Desktop needs explicit height when inside dialog */
      height: 100%;
      flex: unset;
    }
  }

  @media (min-width: 1024px) {
    .meal-planner-content {
      padding: var(--space-5) var(--space-5);
    }
  }

  .meal-planner-footer {
    /* Layout */
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;

    /* Spacing */
    padding: var(--space-3) var(--space-3);

    /* Border */
    border-top: 1px solid var(--border-subtle);
  }

  @media (min-width: 1024px) {
    .meal-planner-footer {
      padding: var(--space-5) var(--space-5);
    }
  }

  /* Meal planner divider - matches master list separator */
  .meal-planner-divider {
    /* Layout */
    display: flex;
    align-items: center;
    justify-content: center;

    /* Spacing */
    margin: var(--space-6) 0 var(--space-4) 0;
    gap: var(--space-3);
  }

  .meal-planner-divider::before {
    content: '';
    flex: 1;
    height: 1px;
    background: linear-gradient(
      to left,
      var(--accent-primary) 0%,
      var(--accent-primary) 60%,
      transparent 100%
    );
  }

  .meal-planner-divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: linear-gradient(
      to right,
      var(--accent-primary) 0%,
      var(--accent-primary) 60%,
      transparent 100%
    );
  }

  .divider-text {
    /* Style - Pill Badge */
    background: var(--bg-secondary);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-full);
    box-shadow: var(--shadow-md);

    /* Spacing */
    padding: var(--space-2) var(--space-4);

    /* Typography */
    font-size: var(--text-xs);
    font-weight: var(--font-semibold);
    color: var(--accent-primary);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    white-space: nowrap;
  }

  /* Dish selector popover - make it visually distinct */
  :global(.dish-selector-popover) {
    /* Enhanced border and shadow */
    border: 2px solid var(--accent-primary) !important;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5) !important;
    background-color: var(--bg-secondary) !important;
  }

  :global(.dish-selector-command) {
    background-color: var(--bg-secondary);
    border-radius: var(--radius-md);
  }

  /* Dish selector items */
  :global(.dish-selector-item) {
    padding: var(--space-3) var(--space-4);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  :global(.dish-selector-item:hover) {
    background-color: var(--bg-hover);
  }

  :global(.dish-selector-item-selected) {
    background-color: var(--bg-hover) !important;
    color: var(--text-primary) !important;
    font-weight: 500;
    border-left: 3px solid var(--accent-primary);
  }

  :global(.dish-selector-item-selected:hover) {
    background-color: var(--bg-hover) !important;
    color: var(--text-primary) !important;
  }

  /* Delete button styling - consistent with ListItem */
  :global(.action-button-delete) {
    /* Style */
    background-color: var(--bg-secondary) !important;
    color: var(--text-secondary) !important;
    border: 1px solid var(--border-subtle) !important;
    border-radius: var(--radius-md) !important;

    /* Transition */
    transition: all var(--transition-fast) !important;
  }

  /* Desktop: gray default, orange on hover */
  @media (min-width: 1024px) {
    :global(.action-button-delete) {
      color: var(--text-secondary) !important;
    }

    :global(.action-button-delete:hover) {
      background-color: var(--accent-primary) !important;
      color: var(--text-inverse) !important;
      border-color: var(--accent-primary) !important;
      box-shadow: var(--shadow-sm) !important;
      transform: scale(1.05) !important;
    }
  }

  :global(.action-button-delete:active) {
    transform: scale(0.98) !important;
  }

  /* Confirmed icon styling - matches delete button dimensions */
  :global(.action-button-confirmed) {
    /* Layout - match icon-sm button size */
    width: 36px;
    height: 36px;

    /* Style - blend with background */
    background-color: var(--bg-muted) !important;
    color: var(--text-secondary) !important;
    border-radius: var(--radius-md) !important;
  }
</style>
