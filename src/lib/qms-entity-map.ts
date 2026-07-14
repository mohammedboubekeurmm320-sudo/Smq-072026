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
}

export const QMS_ENTITIES: Record<string, QmsEntityConfig> = {
  capas: {
    slug: 'capas', table: 'capas', label: 'CAPA', labelPlural: 'CAPAs',
    icon: 'Shield', description: 'Actions Correctives et Préventives (§8.5.2 / §8.5.3)',
    numberField: 'capaNumber', numberPrefix: 'CAPA', statusField: 'status',
    defaultSort: 'createdAt', color: 'text-violet-600',
  },
  ncrs: {
    slug: 'ncrs', table: 'ncrs', label: 'Non-Conformité', labelPlural: 'Non-Conformités',
    icon: 'AlertTriangle', description: 'Maîtrise du produit non conforme (§8.3)',
    numberField: 'ncrNumber', numberPrefix: 'NCR', statusField: 'status',
    defaultSort: 'createdAt', color: 'text-amber-600',
  },
  deviations: {
    slug: 'deviations', table: 'deviations', label: 'Déviation', labelPlural: 'Déviations',
    icon: 'AlertOctagon', description: 'Déviations planifiées et non planifiées (§7.1 / §7.5.1)',
    numberField: 'devNumber', numberPrefix: 'DEV', statusField: 'status',
    defaultSort: 'createdAt', color: 'text-rose-600',
  },
  'change-controls': {
    slug: 'change-controls', table: 'change_controls', label: 'Contrôle Changement', labelPlural: 'Contrôles Changement',
    icon: 'ArrowLeftRight', description: 'Maîtrise des modifications (§7.3.7 / §8.5.1)',
    numberField: 'ccNumber', numberPrefix: 'CC', statusField: 'status',
    defaultSort: 'createdAt', color: 'text-cyan-600',
  },
  risks: {
    slug: 'risks', table: 'risks', label: 'Risque', labelPlural: 'Risques',
    icon: 'BarChart3', description: 'Management des risques (§7.1)',
    numberField: 'riskNumber', numberPrefix: 'RISK', statusField: 'status',
    defaultSort: 'createdAt', color: 'text-orange-600',
  },
  audits: {
    slug: 'audits', table: 'audits', label: 'Audit', labelPlural: 'Audits',
    icon: 'ClipboardCheck', description: 'Audits internes et externes (§8.2.4)',
    numberField: 'auditNumber', numberPrefix: 'AUD', statusField: 'status',
    defaultSort: 'createdAt', color: 'text-blue-600',
  },
  training: {
    slug: 'training', table: 'training_records', label: 'Formation', labelPlural: 'Formations',
    icon: 'GraduationCap', description: 'Formation et compétence (§6.2)',
    numberField: 'trainingNumber', numberPrefix: 'TRN', statusField: 'status',
    defaultSort: 'createdAt', color: 'text-indigo-600',
  },
  'batch-records': {
    slug: 'batch-records', table: 'batch_records', label: 'Dossier de Lot', labelPlural: 'Dossiers de Lot',
    icon: 'Package', description: 'Dossiers de lot et traçabilité (§7.5.1 / §7.5.9)',
    numberField: 'batchNumber', numberPrefix: 'BAT', statusField: 'status',
    defaultSort: 'createdAt', color: 'text-emerald-600',
  },
  suppliers: {
    slug: 'suppliers', table: 'suppliers', label: 'Fournisseur', labelPlural: 'Fournisseurs',
    icon: 'Truck', description: 'Évaluation et gestion fournisseurs (§7.4)',
    numberField: 'supplierCode', numberPrefix: 'SUP', statusField: 'status',
    defaultSort: 'createdAt', color: 'text-teal-600',
  },
  documents: {
    slug: 'documents', table: 'documents', label: 'Document', labelPlural: 'Documents',
    icon: 'FileText', description: 'Maîtrise des documents (§4.2)',
    numberField: 'documentNumber', numberPrefix: 'DOC', statusField: 'status',
    defaultSort: 'createdAt', color: 'text-sky-600',
  },
}

export function getEntityConfig(slug: string): QmsEntityConfig | undefined {
  return QMS_ENTITIES[slug]
}

export function getAllEntities(): QmsEntityConfig[] {
  return Object.values(QMS_ENTITIES)
}

// Sidebar navigation groups
export interface NavGroup {
  label: string
  items: { slug: string; label: string; icon: string; badge?: string }[]
}

export const SIDEBAR_NAV: NavGroup[] = [
  {
    label: 'Vue d\'ensemble',
    items: [
      { slug: 'dashboard', label: 'Tableau de bord', icon: 'LayoutDashboard' },
    ],
  },
  {
    label: 'Qualité',
    items: [
      { slug: 'capas', label: 'CAPAs', icon: 'Shield' },
      { slug: 'ncrs', label: 'Non-Conformités', icon: 'AlertTriangle' },
      { slug: 'deviations', label: 'Déviations', icon: 'AlertOctagon' },
      { slug: 'risks', label: 'Risques', icon: 'BarChart3' },
    ],
  },
  {
    label: 'Conformité',
    items: [
      { slug: 'change-controls', label: 'Contrôles Changement', icon: 'ArrowLeftRight' },
      { slug: 'audits', label: 'Audits', icon: 'ClipboardCheck' },
      { slug: 'documents', label: 'Documents', icon: 'FileText' },
    ],
  },
  {
    label: 'Opérations',
    items: [
      { slug: 'training', label: 'Formations', icon: 'GraduationCap' },
      { slug: 'batch-records', label: 'Dossiers de Lot', icon: 'Package' },
      { slug: 'suppliers', label: 'Fournisseurs', icon: 'Truck' },
    ],
  },
  {
    label: 'Conformité & Admin',
    items: [
      { slug: 'compliance', label: 'Conformité', icon: 'ShieldCheck' },
      { slug: 'audit-trail', label: 'Piste d\'audit', icon: 'History' },
      { slug: 'notifications', label: 'Notifications', icon: 'Bell' },
      { slug: 'admin-settings', label: 'Paramètres', icon: 'Settings' },
    ],
  },
]