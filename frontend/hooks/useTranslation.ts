'use client';

import { useLanguage } from '../contexts/LanguageContext';

/**
 * useTranslation — thin wrapper around LanguageContext.
 * Components use t('key') without knowing about context internals.
 */
export function useTranslation() {
  const { t, locale, setLocale, availableLocales } = useLanguage();
  return { t, locale, setLocale, availableLocales };
}
