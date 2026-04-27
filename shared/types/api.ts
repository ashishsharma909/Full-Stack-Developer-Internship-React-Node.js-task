/**
 * Shared API response shapes.
 * Backend always responds with these envelopes so the frontend
 * has a single, predictable error-handling path.
 */

export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiError {
  success: false;
  error: string;
  code?: string;
  details?: unknown;
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** A single stored entity record (as returned by the API) */
export interface EntityRecord {
  id: string;
  entityName: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/** Auth endpoints */
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
}

/** CSV import */
export interface CsvUploadResponse {
  importId: string;
  filename: string;
  headers: string[];
  preview: Record<string, string>[];
}

export interface CsvMappingRequest {
  importId: string;
  mapping: Record<string, string>; // csvColumn → entityField
}

export interface CsvConfirmRequest {
  importId: string;
}

export interface CsvImportResult {
  imported: number;
  failed: number;
  errors: Array<{ row: number; reason: string }>;
}
