'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

type Locale = 'fr' | 'en'

interface I18nContextValue {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: string) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

const TRANSLATIONS: Record<Locale, Record<string, string>> = {
  fr: {
    'nav.dashboard': 'Tableau de Bord',
    'nav.documents': 'Documents',
    'nav.documentHierarchy': 'Hiérarchie Documentaire',
    'nav.ncr': 'Non-Conformités',
    'nav.capa': 'CAPA',
    'nav.deviations': 'Déviations',
    'nav.changeControl': 'Contrôle des Changements',
    'nav.audits': 'Audits',
    'nav.risks': 'Risques',
    'nav.training': 'Formation',
    'nav.batchRecords': 'Dossiers de Lot',
    'nav.suppliers': 'Fournisseurs',
    'nav.oosOot': 'OOS/OOT',
    'nav.forms': 'Formulaires',
    'nav.recordTypes': 'Types d\'Enregistrements',
    'nav.customRecords': 'Enregistrements Personnalisés',
    'nav.reports': 'Rapports',
    'nav.compliance': 'Conformité',
    'nav.scheduledReports': 'Rapports Planifiés',
    'nav.auditTrail': 'Piste d\'Audit',
    'nav.userManagement': 'Utilisateurs',
    'nav.settings': 'Paramètres',
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.delete': 'Supprimer',
    'common.edit': 'Modifier',
    'common.create': 'Créer',
    'common.search': 'Rechercher',
    'common.loading': 'Chargement…',
    'group.pilotage': 'Pilotage',
    'group.gouvernance': 'Gouvernance Documentaire',
    'group.qualite': 'Qualité & Amélioration',
    'group.production': 'Production & Achats',
    'group.administration': 'Administration',
  },
  en: {
    'nav.dashboard': 'Dashboard',
    'nav.documents': 'Documents',
    'nav.documentHierarchy': 'Document Hierarchy',
    'nav.ncr': 'Non-Conformities',
    'nav.capa': 'CAPA',
    'nav.deviations': 'Deviations',
    'nav.changeControl': 'Change Control',
    'nav.audits': 'Audits',
    'nav.risks': 'Risks',
    'nav.training': 'Training',
    'nav.batchRecords': 'Batch Records',
    'nav.suppliers': 'Suppliers',
    'nav.oosOot': 'OOS/OOT',
    'nav.forms': 'Forms',
    'nav.recordTypes': 'Record Types',
    'nav.customRecords': 'Custom Records',
    'nav.reports': 'Reports',
    'nav.compliance': 'Compliance',
    'nav.scheduledReports': 'Scheduled Reports',
    'nav.auditTrail': 'Audit Trail',
    'nav.userManagement': 'User Management',
    'nav.settings': 'Settings',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.create': 'Create',
    'common.search': 'Search',
    'common.loading': 'Loading…',
    'group.pilotage': 'Overview',
    'group.gouvernance': 'Document Governance',
    'group.qualite': 'Quality & Improvement',
    'group.production': 'Production & Procurement',
    'group.administration': 'Administration',
  },
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('fr')

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('qms_locale') as Locale : null
    if (saved === 'fr' || saved === 'en') setLocaleState(saved)
  }, [])

  const setLocale = (l: Locale) => {
    setLocaleState(l)
    if (typeof window !== 'undefined') localStorage.setItem('qms_locale', l)
  }

  const t = (key: string) => TRANSLATIONS[locale][key] || key

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) return { locale: 'fr' as Locale, setLocale: () => {}, t: (k: string) => k }
  return ctx
}
