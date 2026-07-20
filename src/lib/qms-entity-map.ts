// Maps QMS entity slugs → Supabase table names, display config, and API paths
// Used by useQmsQuery, dynamic routes, and the Sidebar

export interface QmsEntityConfig {
  slug: string           // URL/entity slug e.g. 'capas'
  table: string          // Supabase table name e.g. 'capas'
  label: string          // Display name in French
  labelPlural: string    // Plural display name
  icon: string           // Lucide icon name (for dynamic import)
  description: string    // Short ISO 13485 reference
  numberField: string    // Auto-number field e.g. 'capaNumber'
  numberPrefix: string   // Prefix for auto-numbering e.g. 'CAPA'
  statusField: string    // Status column name (usually 'status')
  defaultSort: string    // Default sort column
  color: string          // Tailwind color class for the icon
  specializedRoute?: string  // If the entity has a dedicated page (not /qms/[entity])
}

export const QMS_ENTITIES: Record<string, QmsEntityConfig> = {
  capas: {
    slug: 'capas', table: 'capas', label: 'CAPA', labelPlural: 'CAPAs',
    icon: 'Shield', description: 'Actions Correctives et Préventives (§8.5.2 / §8.5.3)',
    numberField: 'capaNumber', numberPrefix: 'CAPA', statusField: 'status',
    defaultSort: 'createdAt', color: 'text-violet-600',
    specializedRoute: '/capas',
  },
  ncrs: {
    slug: 'ncrs', table: 'ncrs', label: 'Non-Conformité', labelPlural: 'Non-Conformités',
    icon: 'AlertTriangle', description: 'Maîtrise du produit non conforme (§8.3)',
    numberField: 'ncrNumber', numberPrefix: 'NCR', statusField: 'status',
    defaultSort: 'createdAt', color: 'text-amber-600',
    specializedRoute: '/ncrs',
  },
  deviations: {
    slug: 'deviations', table: 'deviations', label: 'Déviation', labelPlural: 'Déviations',
    icon: 'AlertOctagon', description: 'Déviations planifiées et non planifiées (§7.1 / §7.5.1)',
    numberField: 'devNumber', numberPrefix: 'DEV', statusField: 'status',
    defaultSort: 'createdAt', color: 'text-rose-600',
    specializedRoute: '/deviations',
  },
  'change-controls': {
    slug: 'change-controls', table: 'change_controls', label: 'Contrôle Changement', labelPlural: 'Contrôles Changement',
    icon: 'ArrowLeftRight', description: 'Maîtrise des modifications (§7.3.7 / §8.5.1)',
    numberField: 'ccNumber', numberPrefix: 'CC', statusField: 'status',
    defaultSort: 'createdAt', color: 'text-cyan-600',
    specializedRoute: '/change-controls',
  },
  risks: {
    slug: 'risks', table: 'risks', label: 'Risque', labelPlural: 'Risques',
    icon: 'BarChart3', description: 'Management des risques (§7.1)',
    numberField: 'riskNumber', numberPrefix: 'RISK', statusField: 'status',
    defaultSort: 'createdAt', color: 'text-orange-600',
    specializedRoute: '/risks',
  },
  audits: {
    slug: 'audits', table: 'audits', label: 'Audit', labelPlural: 'Audits',
    icon: 'ClipboardCheck', description: 'Audits internes et externes (§8.2.4)',
    numberField: 'auditNumber', numberPrefix: 'AUD', statusField: 'status',
    defaultSort: 'createdAt', color: 'text-blue-600',
    specializedRoute: '/audits',
  },
  training: {
    slug: 'training', table: 'training_records', label: 'Formation', labelPlural: 'Formations',
    icon: 'GraduationCap', description: 'Formation et compétence (§6.2)',
    numberField: 'trainingNumber', numberPrefix: 'TRN', statusField: 'status',
    defaultSort: 'createdAt', color: 'text-indigo-600',
    specializedRoute: '/training',
  },
  'batch-records': {
    slug: 'batch-records', table: 'batch_records', label: 'Dossier de Lot', labelPlural: 'Dossiers de Lot',
    icon: 'Package', description: 'Dossiers de lot et traçabilité (§7.5.1 / §7.5.9)',
    numberField: 'batchNumber', numberPrefix: 'BAT', statusField: 'status',
    defaultSort: 'createdAt', color: 'text-emerald-600',
    specializedRoute: '/batch-records',
  },
  suppliers: {
    slug: 'suppliers', table: 'suppliers', label: 'Fournisseur', labelPlural: 'Fournisseurs',
    icon: 'Truck', description: 'Évaluation et gestion fournisseurs (§7.4)',
    numberField: 'supplierCode', numberPrefix: 'SUP', statusField: 'status',
    defaultSort: 'createdAt', color: 'text-teal-600',
    specializedRoute: '/suppliers',
  },
  documents: {
    slug: 'documents', table: 'documents', label: 'Document', labelPlural: 'Documents',
    icon: 'FileText', description: 'Maîtrise des documents (§4.2)',
    numberField: 'documentNumber', numberPrefix: 'DOC', statusField: 'status',
    defaultSort: 'createdAt', color: 'text-sky-600',
    specializedRoute: '/documents',
  },
  'oos-oot': {
    slug: 'oos-oot', table: 'non_conformances', label: 'OOS/OOT', labelPlural: 'OOS/OOT',
    icon: 'FileQuestion', description: 'Résultats hors spécification (§8.2.6)',
    numberField: 'ncrNumber', numberPrefix: 'OOS', statusField: 'status',
    defaultSort: 'createdAt', color: 'text-red-600',
    specializedRoute: '/oos-oot',
  },
  forms: {
    slug: 'forms', table: 'form_templates', label: 'Formulaire', labelPlural: 'Formulaires',
    icon: 'FileSpreadsheet', description: 'Formulaires et modèles (§4.2.4)',
    numberField: '', numberPrefix: 'FRM', statusField: 'status',
    defaultSort: 'createdAt', color: 'text-purple-600',
    specializedRoute: '/forms',
  },
}

export function getEntityConfig(slug: string): QmsEntityConfig | undefined {
  return QMS_ENTITIES[slug]
}

export function getAllEntities(): QmsEntityConfig[] {
  return Object.values(QMS_ENTITIES)
}

// Sidebar navigation groups — updated with specialized routes
export interface NavGroup {
  label: string
  items: { slug: string; label: string; icon: string; badge?: string; specialized?: boolean }[]
}

export const SIDEBAR_NAV: NavGroup[] = [
  {
    label: 'Vue d\'ensemble',
    items: [
      { slug: 'dashboard', label: 'Tableau de bord', icon: 'LayoutDashboard', specialized: true },
    ],
  },
  {
    label: 'Qualité',
    items: [
      { slug: 'capas', label: 'CAPAs', icon: 'Shield', specialized: true },
      { slug: 'ncrs', label: 'Non-Conformités', icon: 'AlertTriangle', specialized: true },
      { slug: 'deviations', label: 'Déviations', icon: 'AlertOctagon', specialized: true },
      { slug: 'risks', label: 'Risques', icon: 'BarChart3', specialized: true },
    ],
  },
  {
    label: 'Conformité',
    items: [
      { slug: 'change-controls', label: 'Contrôles Changement', icon: 'ArrowLeftRight', specialized: true },
      { slug: 'audits', label: 'Audits', icon: 'ClipboardCheck', specialized: true },
      { slug: 'documents', label: 'Documents', icon: 'FileText', specialized: true },
    ],
  },
  {
    label: 'Opérations',
    items: [
      { slug: 'training', label: 'Formations', icon: 'GraduationCap', specialized: true },
      { slug: 'batch-records', label: 'Dossiers de Lot', icon: 'Package', specialized: true },
      { slug: 'suppliers', label: 'Fournisseurs', icon: 'Truck', specialized: true },
      { slug: 'oos-oot', label: 'OOS/OOT', icon: 'FileQuestion', specialized: true },
      { slug: 'forms', label: 'Formulaires', icon: 'FileSpreadsheet', specialized: true },
    ],
  },
  {
    label: 'Analyse & Admin',
    items: [
      { slug: 'reports', label: 'Rapports', icon: 'BarChart3', specialized: true },
      { slug: 'compliance', label: 'Conformité', icon: 'ShieldCheck', specialized: true },
      { slug: 'audit-trail', label: 'Piste d\'audit', icon: 'History', specialized: true },
      { slug: 'deadlines', label: 'Échéances', icon: 'Clock', specialized: true },
      { slug: 'notifications', label: 'Notifications', icon: 'Bell', specialized: true },
      { slug: 'admin-users', label: 'Utilisateurs', icon: 'Users', specialized: true },
      { slug: 'admin-settings', label: 'Paramètres', icon: 'Settings', specialized: true },
    ],
  },
]