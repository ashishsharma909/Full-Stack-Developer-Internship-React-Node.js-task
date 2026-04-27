// Re-export all shared types for use within the frontend.
// Keep all shared business types in shared/types/ — never duplicate them here.
export type {
  AppConfig,
  NormalizedConfig,
  EntityDefinition,
  FieldDefinition,
  FieldType,
  ViewDefinition,
  EventDefinition,
} from '../../shared/types/config';

export type {
  ApiResponse,
  ApiSuccess,
  ApiError,
  EntityRecord,
  PaginationMeta,
  AuthResponse,
  CsvUploadResponse,
  CsvImportResult,
} from '../../shared/types/api';
