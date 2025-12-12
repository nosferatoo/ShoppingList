// User preferences management
// Handles saving and loading user preferences (theme, etc.) from Supabase

import { createSupabaseBrowserClient } from '$lib/db/supabase';
import type { ThemeColor } from '$lib/stores/theme.svelte';

export interface UserPreferences {
  theme_color: ThemeColor;
}

/**
 * Load user preferences from Supabase
 */
export async function loadUserPreferences(userId: string): Promise<UserPreferences | null> {
  const supabase = createSupabaseBrowserClient();

  try {
    // Use maybeSingle() instead of single() to handle "no rows" gracefully
    const { data, error } = await supabase
      .from('user_preferences')
      .select('theme_color')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error loading user preferences:', error);
      throw error;
    }

    // data will be null if no preferences exist yet
    return data as UserPreferences | null;
  } catch (error) {
    console.error('Failed to load user preferences:', error);
    return null;
  }
}

/**
 * Save user preferences to Supabase
 */
export async function saveUserPreferences(
  userId: string,
  preferences: UserPreferences
): Promise<void> {
  const supabase = createSupabaseBrowserClient();

  try {
    const { error } = await supabase
      .from('user_preferences')
      .upsert(
        {
          user_id: userId,
          theme_color: preferences.theme_color,
          updated_at: new Date().toISOString()
        },
        {
          onConflict: 'user_id'
        }
      );

    if (error) {
      throw error;
    }

    console.log('User preferences saved successfully');
  } catch (error) {
    console.error('Failed to save user preferences:', error);
    throw error;
  }
}
