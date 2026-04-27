/**
 * Shared type definitions for the config-driven application system.
 * These types are the contract between frontend, backend, and the config engine.
 * Both sides import from this module to ensure consistency.
 */

export type FieldType =
  | 'string'
  | 'number'
  | 'email'
  | 'boolean'
  | 'date'
  | 'enum'
  | 'text'
  | 'url';

export interface FieldValidation {
  min?: number;
  max?: number;
  pattern?: string;
}

export interface FieldDefinition {
  name: string;
  type: FieldType;
  label?: string;
  required?: boolean;
  options?: string[];        // Used when type === 'enum'
  defaultValue?: unknown;
  validation?: FieldValidation;
  placeholder?: string;
}

export interface EntityDefinition {
  name: string;              // Unique identifier (used in API paths)
  label?: string;            // Display name
  description?: string;
  fields: FieldDefinition[];
}

export type ViewType = 'form' | 'table' | string; // string allows extensibility

export interface ViewDefinition {
  id?: string;               // Optional explicit ID; defaults to `${entity}_${type}`
  entity: string;            // Must match an EntityDefinition.name
  type: ViewType;
  label?: string;
  columns?: string[];        // For table: which fields to show as columns
  fields?: string[];         // For form: subset of entity fields to render
}

export interface EventDefinition {
  trigger: string;           // e.g. 'record.created', 'record.deleted'
  action: 'toast' | 'email' | string;
  message?: string;
  template?: string;         // For email events
}

export interface AppMeta {
  name: string;
  language?: string;         // Default locale key, e.g. 'en'
  description?: string;
  theme?: 'light' | 'dark';
  version?: string;
}

/**
 * The raw config shape — all fields optional at the top level
 * so the system can handle partial configs gracefully.
 */
export interface AppConfig {
  app?: Partial<AppMeta>;
  entities?: EntityDefinition[];
  views?: ViewDefinition[];
  labels?: Record<string, Record<string, string>>; // locale → key → string
  events?: EventDefinition[];
}

/**
 * Normalized config — after the config engine applies defaults.
 * All required fields are guaranteed to be present.
 */
export interface NormalizedConfig {
  app: Required<AppMeta>;
  entities: EntityDefinition[];
  views: ViewDefinition[];
  labels: Record<string, Record<string, string>>;
  events: EventDefinition[];
}
