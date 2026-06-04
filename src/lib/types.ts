// TypeScript types
// Application types and API response types

export type ListType = 'shopping' | 'todo';

export interface List {
  id: number;
  title: string;
  type: ListType;
  owner_id: string;
  is_shared: boolean;
  is_food: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Item {
  id: number;
  list_id: number;
  text: string;
  is_checked: boolean;
  quantity: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ListShare {
  id: number;
  list_id: number;
  user_id: string;
  created_at: string;
}

export interface UserListSettings {
  id: number;
  user_id: string;
  list_id: number;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface CheckLog {
  id: number;
  user_id: string;
  list_name: string;
  item_name: string;
  checked_at: string;
  list_id: number | null;
  item_id: number | null;
}

export interface Dish {
  id: number;
  name: string;
  link: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface DishIngredient {
  id: number;
  dish_id: number;
  item_id: number | null;
  item_text: string;
  created_at: string;
}

export interface Menu {
  id: number;
  planned_date: string;
  dish_id: number | null;
  dish_name: string;
  is_confirmed: boolean;
  confirmed_at: string | null;
  confirmed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
}

// Combined type for UI
export interface ListWithItems {
  list: List;
  position: number;
  items: Item[];
}

// Combined types for meal planning
export interface DishWithIngredients {
  dish: Dish;
  ingredients: Array<{
    ingredient: DishIngredient;
    item: Item | null;
  }>;
}

export interface MenuWithDetails {
  menu: Menu;
  dish: Dish | null;
  ingredients: Array<{
    ingredient: DishIngredient;
    item: Item | null;
  }>;
}

export interface OrphanedIngredient {
  ingredient: DishIngredient;
  dish: Dish;
}

// ============================================================================
// API FUNCTION RETURN TYPES
// ============================================================================

// Response from get_user_lists_with_items()
export interface UserListsWithItemsResponse {
  list: List;
  position: number;
  items: Item[];
}

// Response from update_item_lww()
export interface UpdateItemLWWResponse {
  success: boolean;
  reason?: 'not_found' | 'outdated';
  item?: Item;
  server_item?: Item;
}

// Response from sync_items()
export interface SyncItemsResponse {
  results: UpdateItemLWWResponse[];
  server_time: string;
}

// Arguments for save_list_positions()
export interface ListPosition {
  list_id: number;
  position: number;
}

// Response from get_dishes_with_ingredients()
export interface GetDishesWithIngredientsResponse {
  dish: Dish;
  ingredients: Array<{
    ingredient: DishIngredient;
    item: Item | null;
  }>;
}

// Response from get_menus_with_dishes()
export interface GetMenusWithDishesResponse {
  menu: Menu;
  dish: Dish | null;
  ingredients: Array<{
    ingredient: DishIngredient;
    item: Item | null;
  }>;
}

// Response from confirm_menu_and_update_quantities()
export interface ConfirmMenuResponse {
  confirmed_menus: number;
  affected_items: number;
}

// ============================================================================
// HELPER TYPES
// ============================================================================

// Non-deleted items/lists (for filtering)
export type ActiveList = List & { deleted_at: null };
export type ActiveItem = Item & { deleted_at: null };

// List with metadata
export interface ListWithMetadata extends List {
  item_count: number;
  checked_count: number;
  shared_with?: User[];
}

// Sync queue item for offline support
export interface SyncQueueItem {
  id: string; // Local unique ID
  type: 'create' | 'update' | 'delete';
  table: 'lists' | 'items';
  data: any;
  timestamp: string;
  retries: number;
}

// Offline state
export interface OfflineState {
  isOnline: boolean;
  pendingChanges: SyncQueueItem[];
  lastSyncAt: Date | null;
  isSyncing: boolean;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Check if a list is not deleted
 */
export function isActiveList(list: List): list is ActiveList {
  return list.deleted_at === null;
}

/**
 * Check if an item is not deleted
 */
export function isActiveItem(item: Item): item is ActiveItem {
  return item.deleted_at === null;
}

/**
 * Check if a list is a shopping list
 */
export function isShoppingList(list: List): list is List & { type: 'shopping' } {
  return list.type === 'shopping';
}

/**
 * Check if a list is a todo list
 */
export function isTodoList(list: List): list is List & { type: 'todo' } {
  return list.type === 'todo';
}

/**
 * Check if an item is checked
 */
export function isCheckedItem(item: Item): item is Item & { is_checked: true } {
  return item.is_checked === true;
}

/**
 * Check if a list is shared
 */
export function isSharedList(list: List): list is List & { is_shared: true } {
  return list.is_shared === true;
}

/**
 * Check if a list is a food list
 */
export function isFoodList(list: List): list is List & { is_food: true } {
  return list.is_food === true;
}

/**
 * Check if a dish is not deleted
 */
export function isActiveDish(dish: Dish): dish is Dish & { deleted_at: null } {
  return dish.deleted_at === null;
}

/**
 * Check if a menu is confirmed
 */
export function isConfirmedMenu(menu: Menu): menu is Menu & { is_confirmed: true } {
  return menu.is_confirmed === true;
}

/**
 * Check if an item has a quantity
 */
export function hasQuantity(item: Item): item is Item & { quantity: number } {
  return item.quantity !== null && item.quantity > 1;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

// Partial update for items (only changed fields)
export type ItemPartialUpdate = Partial<Pick<Item, 'text' | 'is_checked' | 'quantity' | 'deleted_at'>> & {
  id: number;
  updated_at: string;
};

// Partial update for lists (only changed fields)
export type ListPartialUpdate = Partial<Pick<List, 'title' | 'type' | 'is_shared' | 'is_food' | 'deleted_at'>> & {
  id: number;
  updated_at: string;
};

// Form data types
export interface LoginFormData {
  email: string;
  password: string;
}

export interface CreateListFormData {
  title: string;
  type: ListType;
}

export interface CreateItemFormData {
  list_id: number;
  text: string;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T = any> {
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================================================
// UI STATE TYPES
// ============================================================================

export interface ModalState {
  isOpen: boolean;
  type: 'create-list' | 'edit-list' | 'edit-item' | 'delete-confirm' | 'settings' | null;
  data?: any;
}

export interface SwipeState {
  itemId: number | null;
  direction: 'left' | 'right' | null;
  offset: number;
}

// ============================================================================
// SORT AND FILTER TYPES
// ============================================================================

export type ItemSortBy = 'created_at' | 'updated_at' | 'text' | 'is_checked';
export type SortDirection = 'asc' | 'desc';

export interface ItemFilter {
  showChecked?: boolean;
  searchText?: string;
}

export interface ListFilter {
  type?: ListType;
  isShared?: boolean;
  searchText?: string;
}
