/**
 * api.ts — Centralized API client
 *
 * All fetch calls go through this module so:
 *  - Auth headers are attached automatically
 *  - Responses are typed via the shared ApiResponse envelope
 *  - Errors are always thrown as typed ApiError objects
 *  - No fetch calls are scattered across components
 */

import type { ApiResponse } from '../types';

const API_BASE = '/api'; // Proxied by Next.js rewrites in dev

// Token stored in memory (set at login) — avoids XSS via localStorage
// The httpOnly cookie is the primary auth mechanism for SSR/server routes
let _token: string | null = null;

export function setToken(token: string | null): void {
  _token = token;
}

export function getToken(): string | null {
  return _token;
}

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options?: RequestInit,
): Promise<T> {
  const headers: Record<string, string> = {
    ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options?.headers as Record<string, string>),
  };

  if (_token) {
    headers['Authorization'] = `Bearer ${_token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    credentials: 'include', // Send cookies
    body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    ...options,
  });

  let json: ApiResponse<T>;
  try {
    json = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new ApiClientError(res.status, `Server returned non-JSON response (${res.status})`);
  }

  if (!json.success) {
    throw new ApiClientError(
      res.status,
      json.error,
      json.code,
      json.details,
    );
  }

  return (json as { success: true; data: T }).data;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
  upload: <T>(path: string, formData: FormData) => request<T>('POST', path, formData),
};
