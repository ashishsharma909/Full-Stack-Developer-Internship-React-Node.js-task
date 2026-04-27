'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useConfigContext } from './ConfigContext';
import { resolveLabel } from '../lib/configEngine';

interface LanguageContextValue {
  locale: string;
  setLocale: (locale: string) => void;
  availableLocales: string[];
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  locale: 'en',
  setLocale: () => {},
  availableLocales: ['en'],
  t: (k) => k,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { config } = useConfigContext();
  const [locale, setLocaleState] = useState<string>('en');

  // Initialize locale from config's default language
  useEffect(() => {
    if (config?.app.language) {
      setLocaleState(config.app.language);
    }
  }, [config?.app.language]);

  // Persist locale preference across reloads
  useEffect(() => {
    const stored = localStorage.getItem('locale');
    if (stored) setLocaleState(stored);
  }, []);

  const setLocale = (l: string) => {
    setLocaleState(l);
    localStorage.setItem('locale', l);
  };

  const availableLocales = config ? Object.keys(config.labels) : ['en'];

  const t = (key: string): string => {
    if (!config) return key;
    return resolveLabel(config, locale, key);
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale, availableLocales, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}
