import { Injectable, signal, computed } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AppConfig, DisplayConfig, PaginationConfig, ScoringConfig, UIConfig, 
  DataConfig, ConfigField, ConfigSection } from '../models/app-config.interface';

@Injectable({
  providedIn: 'root'
})
export class ConfigurationService {
  private readonly CONFIG_STORAGE_KEY = 'mean15_app_config';
  
  // Default configuration
  private readonly defaultConfig: AppConfig = {
    display: {
      matchListPageSize: 10,
      scoreListPageSize: 20,
      memberListPageSize: 15,
      showMemberPhotos: true,
      showScoreDetails: true,
      defaultDateFormat: 'MM/dd/yyyy',
      timeZone: 'America/New_York'
    },
    pagination: {
      enablePagination: true,
      showPageSizeOptions: true,
      pageSizeOptions: [5, 10, 20, 50],
      showFirstLastButtons: true
    },
    scoring: {
      allowNegativeScores: false,
      maxScore: 200,
      minScore: 0,
      defaultHandicap: 0,
      handicapCalculationMethod: 'usga',
      roundingPrecision: 1
    },
    ui: {
      theme: 'auto',
      enableAnimations: true,
      showTooltips: true,
      confirmDeletions: true,
      autoSaveInterval: 30,
      sessionTimeout: 60
    },
    data: {
      enableDataCaching: true,
      cacheExpirationTime: 15,
      autoRefreshInterval: 300,
      enableBackups: true,
      maxBackupFiles: 5
    }
  };

  // Reactive configuration state
  private configSubject = new BehaviorSubject<AppConfig>(this.loadConfig());
  public config$ = this.configSubject.asObservable();
  
  // Signals for reactive access
  private configSignal = signal<AppConfig>(this.configSubject.value);
  
  // Computed properties for easy access to sections
  public displayConfig = computed(() => this.configSignal().display);
  public paginationConfig = computed(() => this.configSignal().pagination);
  public scoringConfig = computed(() => this.configSignal().scoring);
  public uiConfig = computed(() => this.configSignal().ui);
  public dataConfig = computed(() => this.configSignal().data);

  // Configuration sections for the admin UI
  public configSections: ConfigSection[] = [
    {
      key: 'display',
      title: 'Display Settings',
      description: 'Configure how data is displayed throughout the application',
      icon: 'visibility'
    },
    {
      key: 'pagination',
      title: 'Pagination Settings',
      description: 'Control pagination behavior for lists and tables',
      icon: 'view_list'
    },
    {
      key: 'scoring',
      title: 'Scoring Configuration',
      description: 'Set up scoring rules and handicap calculations',
      icon: 'emoji_events'
    },
    {
      key: 'ui',
      title: 'User Interface',
      description: 'Customize the look and feel of the application',
      icon: 'palette'
    },
    {
      key: 'data',
      title: 'Data Management',
      description: 'Configure data caching, backups, and refresh settings',
      icon: 'storage'
    }
  ];

  // Configuration fields for dynamic form generation
  public configFields: ConfigField[] = [
    // Display settings
    {
      key: 'matchListPageSize',
      label: 'Matches per page',
      description: 'Number of matches to show on the match list page',
      type: 'number',
      section: 'display',
      validation: { min: 5, max: 100, required: true },
      defaultValue: 10
    },
    {
      key: 'scoreListPageSize',
      label: 'Scores per page',
      description: 'Number of scores to show when viewing score lists',
      type: 'number',
      section: 'display',
      validation: { min: 10, max: 200, required: true },
      defaultValue: 20
    },
    {
      key: 'memberListPageSize',
      label: 'Members per page',
      description: 'Number of members to show on the member list page',
      type: 'number',
      section: 'display',
      validation: { min: 5, max: 100, required: true },
      defaultValue: 15
    },
    {
      key: 'showMemberPhotos',
      label: 'Show member photos',
      description: 'Display member photos in lists and forms',
      type: 'boolean',
      section: 'display',
      defaultValue: true
    },
    {
      key: 'showScoreDetails',
      label: 'Show score details',
      description: 'Display detailed score information in expanded views',
      type: 'boolean',
      section: 'display',
      defaultValue: true
    },
    {
      key: 'defaultDateFormat',
      label: 'Date format',
      description: 'Default format for displaying dates',
      type: 'select',
      section: 'display',
      options: [
        { value: 'MM/dd/yyyy', label: 'MM/dd/yyyy (US)' },
        { value: 'dd/MM/yyyy', label: 'dd/MM/yyyy (EU)' },
        { value: 'yyyy-MM-dd', label: 'yyyy-MM-dd (ISO)' },
        { value: 'MMM dd, yyyy', label: 'MMM dd, yyyy (Long)' }
      ],
      defaultValue: 'MM/dd/yyyy'
    },
    
    // Pagination settings
    {
      key: 'enablePagination',
      label: 'Enable pagination',
      description: 'Use pagination for long lists instead of infinite scroll',
      type: 'boolean',
      section: 'pagination',
      defaultValue: true
    },
    {
      key: 'showPageSizeOptions',
      label: 'Show page size options',
      description: 'Allow users to change how many items are shown per page',
      type: 'boolean',
      section: 'pagination',
      defaultValue: true
    },
    {
      key: 'showFirstLastButtons',
      label: 'Show first/last buttons',
      description: 'Display buttons to jump to first and last pages',
      type: 'boolean',
      section: 'pagination',
      defaultValue: true
    },

    // Scoring settings
    {
      key: 'allowNegativeScores',
      label: 'Allow negative scores',
      description: 'Permit scores below zero to be entered',
      type: 'boolean',
      section: 'scoring',
      defaultValue: false
    },
    {
      key: 'maxScore',
      label: 'Maximum score',
      description: 'Highest score that can be entered',
      type: 'number',
      section: 'scoring',
      validation: { min: 50, max: 500, required: true },
      defaultValue: 200
    },
    {
      key: 'minScore',
      label: 'Minimum score',
      description: 'Lowest score that can be entered',
      type: 'number',
      section: 'scoring',
      validation: { min: -50, max: 100, required: true },
      defaultValue: 0
    },
    {
      key: 'handicapCalculationMethod',
      label: 'Handicap method',
      description: 'Method used for handicap calculations',
      type: 'select',
      section: 'scoring',
      options: [
        { value: 'usga', label: 'USGA System' },
        { value: 'ega', label: 'EGA System' },
        { value: 'custom', label: 'Custom Method' }
      ],
      defaultValue: 'usga'
    },

    // UI settings
    {
      key: 'theme',
      label: 'Theme',
      description: 'Visual theme for the application',
      type: 'select',
      section: 'ui',
      options: [
        { value: 'light', label: 'Light Theme' },
        { value: 'dark', label: 'Dark Theme' },
        { value: 'auto', label: 'Auto (System)' }
      ],
      defaultValue: 'auto'
    },
    {
      key: 'enableAnimations',
      label: 'Enable animations',
      description: 'Use smooth transitions and animations in the UI',
      type: 'boolean',
      section: 'ui',
      defaultValue: true
    },
    {
      key: 'showTooltips',
      label: 'Show tooltips',
      description: 'Display helpful tooltips on hover',
      type: 'boolean',
      section: 'ui',
      defaultValue: true
    },
    {
      key: 'confirmDeletions',
      label: 'Confirm deletions',
      description: 'Ask for confirmation before deleting items',
      type: 'boolean',
      section: 'ui',
      defaultValue: true
    },
    {
      key: 'sessionTimeout',
      label: 'Session timeout (minutes)',
      description: 'Automatically log out after this period of inactivity',
      type: 'number',
      section: 'ui',
      validation: { min: 15, max: 480, required: true },
      defaultValue: 60
    },

    // Data settings
    {
      key: 'enableDataCaching',
      label: 'Enable data caching',
      description: 'Cache frequently accessed data for better performance',
      type: 'boolean',
      section: 'data',
      defaultValue: true
    },
    {
      key: 'cacheExpirationTime',
      label: 'Cache expiration (minutes)',
      description: 'How long to keep cached data before refreshing',
      type: 'number',
      section: 'data',
      validation: { min: 1, max: 120, required: true },
      defaultValue: 15
    },
    {
      key: 'autoRefreshInterval',
      label: 'Auto refresh interval (seconds)',
      description: 'Automatically refresh data every X seconds (0 = disabled)',
      type: 'number',
      section: 'data',
      validation: { min: 0, max: 3600, required: true },
      defaultValue: 300
    }
  ];

  constructor() {
    // Initialize signal with current config
    this.configSignal.set(this.configSubject.value);
    
    // Subscribe to config changes and update signal
    this.config$.subscribe(config => {
      this.configSignal.set(config);
    });
  }

  /**
   * Get current configuration
   */
  getCurrentConfig(): AppConfig {
    return this.configSubject.value;
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<AppConfig>): void {
    const currentConfig = this.getCurrentConfig();
    const newConfig = this.mergeConfig(currentConfig, updates);
    
    if (this.validateConfig(newConfig)) {
      this.configSubject.next(newConfig);
      this.saveConfig(newConfig);
    } else {
      throw new Error('Invalid configuration provided');
    }
  }

  /**
   * Update a specific section of the configuration
   */
  updateSection<K extends keyof AppConfig>(section: K, updates: Partial<AppConfig[K]>): void {
    const currentConfig = this.getCurrentConfig();
    const newConfig = {
      ...currentConfig,
      [section]: { ...currentConfig[section], ...updates }
    };
    
    this.configSubject.next(newConfig);
    this.saveConfig(newConfig);
  }

  /**
   * Reset configuration to defaults
   */
  resetToDefaults(): void {
    this.configSubject.next({ ...this.defaultConfig });
    this.saveConfig(this.defaultConfig);
  }

  /**
   * Reset a specific section to defaults
   */
  resetSectionToDefaults<K extends keyof AppConfig>(section: K): void {
    const currentConfig = this.getCurrentConfig();
    const newConfig = {
      ...currentConfig,
      [section]: { ...this.defaultConfig[section] }
    };
    
    this.configSubject.next(newConfig);
    this.saveConfig(newConfig);
  }

  /**
   * Get configuration field definition by key
   */
  getFieldDefinition(key: string): ConfigField | undefined {
    return this.configFields.find(field => field.key === key);
  }

  /**
   * Get configuration fields for a specific section
   */
  getFieldsForSection(section: keyof AppConfig): ConfigField[] {
    return this.configFields.filter(field => field.section === section);
  }

  /**
   * Load configuration from localStorage
   */
  private loadConfig(): AppConfig {
    try {
      const saved = localStorage.getItem(this.CONFIG_STORAGE_KEY);
      if (saved) {
        const parsedConfig = JSON.parse(saved);
        return this.mergeConfig(this.defaultConfig, parsedConfig);
      }
    } catch (error) {
      console.warn('Error loading configuration, using defaults:', error);
    }
    
    return { ...this.defaultConfig };
  }

  /**
   * Save configuration to localStorage
   */
  private saveConfig(config: AppConfig): void {
    try {
      localStorage.setItem(this.CONFIG_STORAGE_KEY, JSON.stringify(config));
    } catch (error) {
      console.error('Error saving configuration:', error);
    }
  }

  /**
   * Deep merge configuration objects
   */
  private mergeConfig(base: AppConfig, updates: Partial<AppConfig>): AppConfig {
    const merged = { ...base };
    
    for (const key in updates) {
      if (updates.hasOwnProperty(key)) {
        const typedKey = key as keyof AppConfig;
        if (typeof updates[typedKey] === 'object' && updates[typedKey] !== null) {
          (merged as any)[typedKey] = { ...(base as any)[typedKey], ...(updates as any)[typedKey] };
        } else {
          (merged as any)[typedKey] = updates[typedKey];
        }
      }
    }
    
    return merged;
  }

  /**
   * Validate configuration values
   */
  private validateConfig(config: AppConfig): boolean {
    try {
      // Basic structure validation
      if (!config || typeof config !== 'object') return false;
      
      // Validate each section exists
      const requiredSections: (keyof AppConfig)[] = ['display', 'pagination', 'scoring', 'ui', 'data'];
      for (const section of requiredSections) {
        if (!config[section] || typeof config[section] !== 'object') {
          return false;
        }
      }

      // Validate specific field constraints
      for (const field of this.configFields) {
        const value = this.getNestedValue(config, field.section, field.key);
        
        if (field.validation) {
          const validation = field.validation;
          
          if (validation.required && (value === undefined || value === null)) {
            return false;
          }
          
          if (field.type === 'number' && typeof value === 'number') {
            if (validation.min !== undefined && value < validation.min) return false;
            if (validation.max !== undefined && value > validation.max) return false;
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error('Configuration validation error:', error);
      return false;
    }
  }

  /**
   * Get nested value from configuration object
   */
  private getNestedValue(config: AppConfig, section: keyof AppConfig, key: string): any {
    return (config[section] as any)?.[key];
  }
}