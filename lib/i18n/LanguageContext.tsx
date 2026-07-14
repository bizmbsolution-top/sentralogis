'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations, Locale } from './translations';

interface LanguageContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: typeof translations.id;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function detectLocale(): Locale {
  if (typeof window === 'undefined') return 'id';
  const stored = localStorage.getItem('sentralogis-lang') as Locale | null;
  if (stored && translations[stored]) return stored;
  const nav = navigator.language || '';
  if (nav.startsWith('zh')) return 'zh';
  if (nav.startsWith('en')) return 'en';
  return 'id';
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('id');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setLocaleState(detectLocale());
    setMounted(true);
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem('sentralogis-lang', l);
  }, []);

  const t = translations[locale];

  if (!mounted) {
    return <LanguageContext.Provider value={{ locale: 'id', setLocale, t: translations.id }}>{children}</LanguageContext.Provider>;
  }

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
