import { browser } from '$app/environment';
import { saveUserPreferences, loadUserPreferences } from '$lib/db/preferences';

export type ThemeColor = 'orange' | 'teal' | 'blue' | 'purple';

const DEFAULT_COLOR: ThemeColor = 'orange';

class ThemeStore {
  color = $state<ThemeColor>(DEFAULT_COLOR);

  // Current user ID (set when user logs in)
  private userId: string | null = null;

  constructor() {
    if (browser) {
      this.loadFromLocalStorage();
      this.applyTheme();
    }
  }

  /**
   * Set theme color (orange, teal, blue, purple)
   */
  setColor(color: ThemeColor) {
    this.color = color;
    this.saveToLocalStorage();
    this.applyTheme();
    this.syncToDatabase();
  }

  /**
   * Apply theme to DOM
   */
  private applyTheme() {
    if (!browser) return;

    const html = document.documentElement;

    // Apply theme color
    html.setAttribute('data-theme-color', this.color);
  }

  /**
   * Save theme to localStorage (for quick load on refresh)
   */
  private saveToLocalStorage() {
    if (!browser) return;
    localStorage.setItem('app-theme-color', this.color);
  }

  /**
   * Load theme from localStorage
   */
  private loadFromLocalStorage() {
    if (!browser) return;

    const savedColor = localStorage.getItem('app-theme-color') as ThemeColor | null;

    if (savedColor && ['orange', 'teal', 'blue', 'purple'].includes(savedColor)) {
      this.color = savedColor;
    }
  }

  /**
   * Set user ID and load their preferences from database
   */
  async setUser(userId: string | null) {
    this.userId = userId;

    if (userId) {
      try {
        const preferences = await loadUserPreferences(userId);
        if (preferences) {
          // Load from database (skip syncing back to database)
          this.color = preferences.theme_color;
          this.saveToLocalStorage();
          this.applyTheme();
        }
      } catch (error) {
        console.error('Failed to load user preferences:', error);
      }
    }
  }

  /**
   * Sync theme to database
   */
  private async syncToDatabase() {
    if (!this.userId) return;

    try {
      await saveUserPreferences(this.userId, {
        theme_color: this.color
      });
    } catch (error) {
      console.error('Failed to sync theme to database:', error);
    }
  }
}

export const themeStore = new ThemeStore();
