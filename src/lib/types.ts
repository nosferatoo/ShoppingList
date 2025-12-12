// TypeScript types
// Application types and Supabase database schema types

export type ListType = 'shopping' | 'todo';

export interface List {
  id: number;
  title: string;
  type: ListType;
  owner_id: string;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Item {
  id: number;
  list_id: number;
  text: string;
  is_checked: boolean;
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

export interface User {
  id: string;
  email: string;
}

export interface Session {
  access_token: string;
  user: User;
}

// Combined type for UI
export interface ListWithItems {
  list: List;
  position: number;
  items: Item[];
}

// ============================================================================
// SUPABASE DATABASE TYPE
// ============================================================================
// This type is used by Supabase client for type-safe queries
// Generate from Supabase: npx supabase gen types typescript --project-id <id>

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      lists: {
        Row: {
          id: number
          title: string
          type: 'shopping' | 'todo'
          owner_id: string
          is_shared: boolean
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: number
          title: string
          type: 'shopping' | 'todo'
          owner_id: string
          is_shared?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: number
          title?: string
          type?: 'shopping' | 'todo'
          owner_id?: string
          is_shared?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'lists_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      items: {
        Row: {
          id: number
          list_id: number
          text: string
          is_checked: boolean
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: number
          list_id: number
          text: string
          is_checked?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: number
          list_id?: number
          text?: string
          is_checked?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'items_list_id_fkey'
            columns: ['list_id']
            isOneToOne: false
            referencedRelation: 'lists'
            referencedColumns: ['id']
          }
        ]
      }
      list_shares: {
        Row: {
          id: number
          list_id: number
          user_id: string
          created_at: string
        }
        Insert: {
          id?: number
          list_id: number
          user_id: string
          created_at?: string
        }
        Update: {
          id?: number
          list_id?: number
          user_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'list_shares_list_id_fkey'
            columns: ['list_id']
            isOneToOne: false
            referencedRelation: 'lists'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'list_shares_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      user_list_settings: {
        Row: {
          id: number
          user_id: string
          list_id: number
          position: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          list_id: number
          position?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          list_id?: number
          position?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_list_settings_list_id_fkey'
            columns: ['list_id']
            isOneToOne: false
            referencedRelation: 'lists'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'user_list_settings_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      item_check_logs: {
        Row: {
          id: number
          user_id: string
          list_name: string
          item_name: string
          checked_at: string
          list_id: number | null
          item_id: number | null
        }
        Insert: {
          id?: number
          user_id: string
          list_name: string
          item_name: string
          checked_at: string
          list_id?: number | null
          item_id?: number | null
        }
        Update: {
          id?: number
          user_id?: string
          list_name?: string
          item_name?: string
          checked_at?: string
          list_id?: number | null
          item_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'item_check_logs_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'item_check_logs_list_id_fkey'
            columns: ['list_id']
            isOneToOne: false
            referencedRelation: 'lists'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'item_check_logs_item_id_fkey'
            columns: ['item_id']
            isOneToOne: false
            referencedRelation: 'items'
            referencedColumns: ['id']
          }
        ]
      }
      user_preferences: {
        Row: {
          id: number
          user_id: string
          theme_color: 'orange' | 'teal' | 'blue' | 'purple'
          theme_mode: 'light' | 'dark'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          theme_color?: 'orange' | 'teal' | 'blue' | 'purple'
          theme_mode?: 'light' | 'dark'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          theme_color?: 'orange' | 'teal' | 'blue' | 'purple'
          theme_mode?: 'light' | 'dark'
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_preferences_user_id_fkey'
            columns: ['user_id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_lists_with_items: {
        Args: Record<string, never>
        Returns: Json
      }
      get_changes_since: {
        Args: {
          last_sync: string
        }
        Returns: Json
      }
      update_item_lww: {
        Args: {
          p_id: number
          p_text: string
          p_is_checked: boolean
          p_updated_at: string
          p_deleted_at?: string | null
        }
        Returns: Json
      }
      sync_items: {
        Args: {
          p_items: Json
        }
        Returns: Json
      }
      save_list_positions: {
        Args: {
          p_positions: Json
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// ============================================================================
// DATABASE TABLE TYPE ALIASES (for convenience)
// ============================================================================

// Shorthand for table row types
export type DbList = Database['public']['Tables']['lists']['Row'];
export type DbItem = Database['public']['Tables']['items']['Row'];
export type DbListShare = Database['public']['Tables']['list_shares']['Row'];
export type DbUserListSettings = Database['public']['Tables']['user_list_settings']['Row'];
export type DbCheckLog = Database['public']['Tables']['item_check_logs']['Row'];

// Shorthand for insert types
export type DbListInsert = Database['public']['Tables']['lists']['Insert'];
export type DbItemInsert = Database['public']['Tables']['items']['Insert'];
export type DbListShareInsert = Database['public']['Tables']['list_shares']['Insert'];
export type DbUserListSettingsInsert = Database['public']['Tables']['user_list_settings']['Insert'];
export type DbCheckLogInsert = Database['public']['Tables']['item_check_logs']['Insert'];

// Shorthand for update types
export type DbListUpdate = Database['public']['Tables']['lists']['Update'];
export type DbItemUpdate = Database['public']['Tables']['items']['Update'];
export type DbListShareUpdate = Database['public']['Tables']['list_shares']['Update'];
export type DbUserListSettingsUpdate = Database['public']['Tables']['user_list_settings']['Update'];
export type DbCheckLogUpdate = Database['public']['Tables']['item_check_logs']['Update'];

// ============================================================================
// SUPABASE FUNCTION RETURN TYPES
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

// ============================================================================
// UTILITY TYPES
// ============================================================================

// Partial update for items (only changed fields)
export type ItemPartialUpdate = Partial<Pick<Item, 'text' | 'is_checked' | 'deleted_at'>> & {
  id: number;
  updated_at: string;
};

// Partial update for lists (only changed fields)
export type ListPartialUpdate = Partial<Pick<List, 'title' | 'type' | 'is_shared' | 'deleted_at'>> & {
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

export interface ToastNotification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

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
