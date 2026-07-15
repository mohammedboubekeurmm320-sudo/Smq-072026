// ============================================================================
// i18n Module — Public API
// ============================================================================

import { useI18n } from '@/contexts/I18nContext'

export { default as fr } from './fr'
export { default as en } from './en'
export type { FrenchTranslations } from './fr'
export type { EnglishTranslations } from './en'
export { I18nProvider, useI18n } from '@/contexts/I18nContext'

// Re-export types
export type { Translations, Locale } from '@/types/i18n'

/**
 * Alias for `useI18n` — conventional i18n naming.
 *
 * @example
 * ```tsx
 * import { useTranslation } from '@/lib/i18n'
 *
 * function MyComponent() {
 *   const { t, locale, setLocale, isRTL } = useTranslation()
 *   return <h1>{t('modules.capa.title')}</h1>
 * }
 * ```
 */
export const useTranslation = useI18n