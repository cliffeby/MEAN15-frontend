
import { Injectable, inject } from '@angular/core';
import { AuthService } from './authService';
import { UserService } from './userService';

export interface ColumnPreference {
  key: string;
  visible: boolean;
}

export interface UserPreferences {
  memberListColumns: ColumnPreference[];
  // Add other preferences here in the future
}

@Injectable({
  providedIn: 'root'
})
export class UserPreferencesService {
  private readonly STORAGE_KEY_PREFIX = 'userPreferences_';
  private readonly DEFAULT_MEMBER_COLUMNS: ColumnPreference[] = [
    { key: 'fullName', visible: true },
    { key: 'email', visible: true },
    { key: 'usgaIndex', visible: true },
    { key: 'lastDatePlayed', visible: true }
  ];

  private readonly userService = inject(UserService);

  constructor(private authService: AuthService) {
    // Hydrate localStorage from backend on startup (non-blocking)
    this.loadFromBackend();
  }

  /**
   * Save custom column preferences for a given key (e.g. hcapListColumns)
   */
  saveCustomColumnPreferences(key: string, columns: ColumnPreference[]): void {
    const preferences = this.getUserPreferences();
    (preferences as any)[key] = columns;
    this.saveUserPreferences(preferences);
  }

  /**
   * Get custom column preferences for a given key, with fallback to defaults
   */
  getCustomColumnPreferences(key: string, defaultColumns: ColumnPreference[]): ColumnPreference[] {
    try {
      const preferences = this.getUserPreferences();
      const customPrefs = (preferences as any)[key];
      if (customPrefs && Array.isArray(customPrefs)) {
        const validColumns = (customPrefs as ColumnPreference[]).filter((col: any) => this.isValidColumnPreference(col));
        if (validColumns.length > 0) {
          // Merge with defaults to handle new columns
          return this.mergeWithCustomDefaults(validColumns, defaultColumns);
        }
      }
    } catch (error) {
      console.warn('Error loading custom column preferences:', error);
    }
    return [...defaultColumns];
  }

  /**
   * Merge saved preferences with custom default columns
   */
  mergeWithCustomDefaults(savedColumns: ColumnPreference[], defaultColumns: ColumnPreference[]): ColumnPreference[] {
    const mergedColumns: ColumnPreference[] = [];
    defaultColumns.forEach((defaultCol: ColumnPreference) => {
      const savedCol = savedColumns.find((saved: ColumnPreference) => saved.key === defaultCol.key);
      mergedColumns.push({
        key: defaultCol.key,
        visible: savedCol ? savedCol.visible : defaultCol.visible
      });
    });
    return mergedColumns;
  }

  /**
   * Get the storage key for the current user
   */
  private getUserStorageKey(): string {
    const user1 = this.authService.getAuthorObject();
    const userId = user1?.id || user1?.name || user1?.email || 'anonymous';
    return `${this.STORAGE_KEY_PREFIX}${userId}`;
  }

  /**
   * Get all user preferences from localStorage
   */
  private getUserPreferences(): UserPreferences {
    try {
      const stored = localStorage.getItem(this.getUserStorageKey());
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Error loading user preferences:', error);
    }
    
    // Return default preferences
    return {
      memberListColumns: [...this.DEFAULT_MEMBER_COLUMNS]
    };
  }

  /**
   * Save user preferences to localStorage and persist to backend
   */
  private saveUserPreferences(preferences: UserPreferences): void {
    try {
      localStorage.setItem(this.getUserStorageKey(), JSON.stringify(preferences));
    } catch (error) {
      console.error('Error saving user preferences to localStorage:', error);
    }
    // Persist to backend (fire-and-forget)
    try {
      this.userService.saveMyPreferences({ columns: preferences }).subscribe({
        error: (err) => console.warn('Failed to persist preferences to backend:', err)
      });
    } catch { /* not logged in */ }
  }

  /**
   * Load preferences from the backend and hydrate localStorage cache.
   * Call this once after login.
   */
  loadFromBackend(): void {
    try {
      this.userService.getMyPreferences().subscribe({
        next: (res) => {
          if (res?.preferences?.columns) {
            localStorage.setItem(this.getUserStorageKey(), JSON.stringify(res.preferences.columns));
          }
        },
        error: () => { /* silently fall back to localStorage cache */ }
      });
    } catch { /* not logged in yet */ }
  }

  /**
   * Get member list column preferences
   */
  getMemberListColumnPreferences(): ColumnPreference[] {
    try {
      const preferences = this.getUserPreferences();
      if (preferences.memberListColumns && Array.isArray(preferences.memberListColumns)) {
        // Validate each column preference
        const validColumns = preferences.memberListColumns.filter(col => 
          this.isValidColumnPreference(col)
        );
        
        if (validColumns.length > 0) {
          return this.mergeWithDefaults(validColumns);
        }
      }
    } catch (error) {
      console.warn('Error loading member list column preferences:', error);
    }
    
    // Return defaults if anything goes wrong
    return [...this.DEFAULT_MEMBER_COLUMNS];
  }

  /**
   * Save member list column preferences
   */
  saveMemberListColumnPreferences(columns: ColumnPreference[]): void {
    const preferences = this.getUserPreferences();
    preferences.memberListColumns = columns;
    this.saveUserPreferences(preferences);
  }

  /**
   * Reset member list columns to default
   */
  resetMemberListColumns(): ColumnPreference[] {
    const defaultColumns = [...this.DEFAULT_MEMBER_COLUMNS];
    this.saveMemberListColumnPreferences(defaultColumns);
    return defaultColumns;
  }

  /**
   * Clear all preferences for the current user
   */
  clearUserPreferences(): void {
    try {
      localStorage.removeItem(this.getUserStorageKey());
    } catch (error) {
      console.error('Error clearing user preferences:', error);
    }
  }

  /**
   * Check if a column preference exists and is valid
   */
  private isValidColumnPreference(column: any): column is ColumnPreference {
    return column && 
           typeof column.key === 'string' && 
           typeof column.visible === 'boolean';
  }

  /**
   * Merge saved preferences with default columns to handle new columns
   */
  mergeWithDefaults(savedColumns: ColumnPreference[]): ColumnPreference[] {
    const defaultColumns = [...this.DEFAULT_MEMBER_COLUMNS];
    const mergedColumns: ColumnPreference[] = [];

    // Add all default columns, using saved visibility if available
    defaultColumns.forEach(defaultCol => {
      const savedCol = savedColumns.find(saved => saved.key === defaultCol.key);
      mergedColumns.push({
        key: defaultCol.key,
        visible: savedCol ? savedCol.visible : defaultCol.visible
      });
    });

    return mergedColumns;
  }

  /**
   * Called when user logs out to potentially clear cached data
   */
  onUserLogout(): void {
    // Currently we keep preferences across login sessions
    // This method can be used in the future if we want to clear preferences on logout
  }

  /**
   * Get the number of saved preference records (for debugging)
   */
  getPreferencesCount(): number {
    try {
      let count = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.STORAGE_KEY_PREFIX)) {
          count++;
        }
      }
      return count;
    } catch (error) {
      return 0;
    }
  }
}