'use client';

import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

/**
 * useNotifications — connects to the SSE stream and dispatches toast notifications.
 * Only active when the user is authenticated.
 * Automatically reconnects after network drops (exponential backoff).
 */
export function useNotifications(): void {
  const { token } = useAuth();
  const retryDelay = useRef(1000);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    function connect() {
      if (cancelled) return;

      // Pass token as query param since EventSource can't set headers
      const es = new EventSource(`/api/notifications/stream?token=${encodeURIComponent(token!)}`);
      esRef.current = es;

      es.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data as string) as { type: string; message: string };
          if (payload.type === 'toast' && payload.message) {
            toast.success(payload.message, { duration: 3500 });
          }
          // Reset backoff on successful message
          retryDelay.current = 1000;
        } catch {
          // Ignore malformed SSE payloads
        }
      };

      es.onerror = () => {
        es.close();
        if (!cancelled) {
          // Exponential backoff up to 30s
          setTimeout(connect, retryDelay.current);
          retryDelay.current = Math.min(retryDelay.current * 2, 30_000);
        }
      };
    }

    connect();

    return () => {
      cancelled = true;
      esRef.current?.close();
    };
  }, [token]);
}
