export interface AppConfig {
  display: DisplayConfig;
  pagination: PaginationConfig;
  scoring: ScoringConfig;
  ui: UIConfig;
  data: DataConfig;
}

export interface DisplayConfig {
  matchListPageSize: number;
  scoreListPageSize: number;
  memberListPageSize: number;
  showMemberPhotos: boolean;
  showScoreDetails: boolean;
  defaultDateFormat: string;
  timeZone: string;
}

export interface PaginationConfig {
  enablePagination: boolean;
  showPageSizeOptions: boolean;
  pageSizeOptions: number[];
  showFirstLastButtons: boolean;
}

export interface ScoringConfig {
  allowNegativeScores: boolean;
  maxScore: number;
  minScore: number;
  defaultHandicap: number;
  handicapCalculationMethod: 'usga' | 'ega' | 'custom';
  roundingPrecision: number;
}

export interface UIConfig {
  theme: 'light' | 'dark' | 'auto';
  enableAnimations: boolean;
  showTooltips: boolean;
  confirmDeletions: boolean;
  autoSaveInterval: number; // in seconds
  sessionTimeout: number; // in minutes
}

export interface DataConfig {
  enableDataCaching: boolean;
  cacheExpirationTime: number; // in minutes
  autoRefreshInterval: number; // in seconds
  enableBackups: boolean;
  maxBackupFiles: number;
}

export interface ConfigSection {
  key: keyof AppConfig;
  title: string;
  description: string;
  icon: string;
}

export interface ConfigField {
  key: string;
  label: string;
  description: string;
  type: 'number' | 'boolean' | 'string' | 'select' | 'multiselect';
  section: keyof AppConfig;
  validation?: {
    min?: number;
    max?: number;
    required?: boolean;
    pattern?: string;
  };
  options?: { value: any; label: string }[];
  defaultValue: any;
}