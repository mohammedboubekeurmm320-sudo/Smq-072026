'use client'

import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react'
import type { Locale, Translations } from '@/types/i18n'
import fr from '@/lib/i18n/fr'
import en from '@/lib/i18n/en'

// ─── Translation registry ────────────────────────────────────────────────
const TRANSLATIONS: Record<Locale, Translations> = { fr, en }

// ─── Resolve a dot-notation key from a nested object ─────────────────────
function resolve(obj: unknown, path: string): string {
  const keys = path.split('.')
  let current: unknown = obj
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') return path
    current = (current as Record<string, unknown>)[key]
  }
  return typeof current === 'string' ? current : path
}

// ─── Context shape ───────────────────────────────────────────────────────
interface I18nContextValue {
  /** Current locale */
  locale: Locale
  /** Switch locale (persists to localStorage) */
  setLocale: (l: Locale) => void
  /**
   * Translate a dot-notation key.
   * Example: `t('modules.capa.title')` → `'Gestion CAPA'`
   * Falls back to the key itself when not found.
   */
  t: (key: string) => string
  /** Right-to-left flag (always false for fr/en, kept for extensibility) */
  isRTL: boolean
}

const I18nContext = createContext<I18nContextValue | null>(null)

const STORAGE_KEY = 'qms_locale'

// ─── Provider ────────────────────────────────────────────────────────────
export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('fr')

  // Hydrate from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null
    if (saved === 'fr' || saved === 'en') setLocaleState(saved)
  }, [])

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, l)
  }, [])

  const t = useCallback(
    (key: string) => resolve(TRANSLATIONS[locale], key),
    [locale],
  )

  const isRTL = false // French & English are LTR; extend for Arabic/Hebrew

  const value = useMemo<I18nContextValue>(
    () => ({ locale, setLocale, t, isRTL }),
    [locale, setLocale, t, isRTL],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

// ─── Hook ────────────────────────────────────────────────────────────────
export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    // Fallback for usage outside provider (SSR, tests)
    return {
      locale: 'fr',
      setLocale: () => {},
      t: (key: string) => resolve(fr, key),
      isRTL: false,
    }
  }
  return ctx
}