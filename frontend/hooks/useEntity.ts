'use client';

import { useState, useEffect, useCallback } from 'react';
import { api, ApiClientError } from '../lib/api';
import type { EntityRecord, PaginationMeta } from '../types';
import toast from 'react-hot-toast';

interface UseEntityOptions {
  page?: number;
  limit?: number;
  autoFetch?: boolean;
}

interface UseEntityReturn {
  records: EntityRecord[];
  meta: PaginationMeta | null;
  isLoading: boolean;
  error: string | null;
  fetch: () => Promise<void>;
  create: (data: Record<string, unknown>) => Promise<EntityRecord | null>;
  update: (id: string, data: Record<string, unknown>) => Promise<EntityRecord | null>;
  remove: (id: string) => Promise<boolean>;
  setPage: (page: number) => void;
}

export function useEntity(entityName: string | null, options: UseEntityOptions = {}): UseEntityReturn {
  const { page: initialPage = 1, limit = 50, autoFetch = true } = options;
  const [records, setRecords] = useState<EntityRecord[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(initialPage);

  const fetch = useCallback(async () => {
    if (!entityName) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get<{ records?: EntityRecord[]; meta?: PaginationMeta }>(
        `/entities/${entityName}?page=${page}&limit=${limit}`,
      );
      // Handle both array and {records, meta} shapes gracefully
      if (Array.isArray(res)) {
        setRecords(res);
      } else {
        setRecords(res.records ?? []);
        setMeta(res.meta ?? null);
      }
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load records');
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  }, [entityName, page, limit]);

  useEffect(() => {
    if (autoFetch) void fetch();
  }, [fetch, autoFetch]);

  const create = useCallback(async (data: Record<string, unknown>): Promise<EntityRecord | null> => {
    if (!entityName) return null;
    try {
      const record = await api.post<EntityRecord>(`/entities/${entityName}`, data);
      setRecords((prev) => [record, ...prev]);
      return record;
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'Create failed';
      toast.error(msg);
      return null;
    }
  }, [entityName]);

  const update = useCallback(async (id: string, data: Record<string, unknown>): Promise<EntityRecord | null> => {
    if (!entityName) return null;
    try {
      const record = await api.put<EntityRecord>(`/entities/${entityName}/${id}`, data);
      setRecords((prev) => prev.map((r) => (r.id === id ? record : r)));
      return record;
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'Update failed';
      toast.error(msg);
      return null;
    }
  }, [entityName]);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    if (!entityName) return false;
    try {
      await api.delete(`/entities/${entityName}/${id}`);
      setRecords((prev) => prev.filter((r) => r.id !== id));
      return true;
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'Delete failed';
      toast.error(msg);
      return false;
    }
  }, [entityName]);

  return { records, meta, isLoading, error, fetch, create, update, remove, setPage };
}
