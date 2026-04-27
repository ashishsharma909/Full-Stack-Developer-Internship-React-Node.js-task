'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';
import type { NormalizedConfig } from '../types';

interface ConfigContextValue {
  config: NormalizedConfig | null;
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

// Safe empty config — used as fallback while loading or on error
const EMPTY_CONFIG: NormalizedConfig = {
  app: { name: 'App', language: 'en', description: '', theme: 'dark', version: '1.0.0' },
  entities: [],
  views: [],
  labels: {},
  events: [],
};

const ConfigContext = createContext<ConfigContextValue>({
  config: EMPTY_CONFIG,
  isLoading: true,
  error: null,
  reload: async () => {},
});

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<NormalizedConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.get<NormalizedConfig>('/config');
      setConfig(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load config');
      // Fall back to empty config so the app renders something
      setConfig(EMPTY_CONFIG);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchConfig();
  }, []);

  return (
    <ConfigContext.Provider value={{ config, isLoading, error, reload: fetchConfig }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfigContext(): ConfigContextValue {
  return useContext(ConfigContext);
}
