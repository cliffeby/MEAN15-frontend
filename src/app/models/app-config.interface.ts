export interface AppConfig {
  display: DisplayConfig;
  pagination: PaginationConfig;
  scoring: ScoringConfig;
}

export interface DisplayConfig {
  matchListPageSize: number;
  hcapListPageSize: number;
  memberListPageSize: number;
  showMemberPhotos: boolean;
  defaultDateFormat: string;
  timeZone: string;
  theme: 'light' | 'dark' | 'auto';
}

export interface PaginationConfig {
  enablePagination: boolean;
  showPageSizeOptions: boolean;
  pageSizeOptions: number[];
  showFirstLastButtons: boolean;
  defaultPageSize: number;
}

export interface ScoringConfig {
  allowNegativeScores: boolean;
  maxScore: number;
  minScore: number;
  defaultHandicap: number;
  handicapCalculationMethod: 'usga' | 'roch' | 'custom';
  roundingPrecision: number;
  scoreEntryMode: 'detailed' | 'simple';
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