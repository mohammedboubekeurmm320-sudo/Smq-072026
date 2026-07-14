// ============================================================================
// Entity-specific field definitions for create/edit forms
// Uses shadcn/ui components: Select, Calendar (via Input date), Textarea
// ============================================================================

export interface FieldDef {
  name: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'date' | 'number'
  required?: boolean
  options?: string[]
  placeholder?: string
  helpText?: string
  colSpan?: 1 | 2  // full-width for description fields
}

// ─── CAPA ───────────────────────────────────────────────────────────────────
const CAPA_FIELDS: FieldDef[] = [
  { name: 'title', label: 'Titre du CAPA', type: 'text', required: true, placeholder: 'Ex: Déviation répétitive sur la ligne de remplissage' },
  { name: 'description', label: 'Description', type: 'textarea', required: true, colSpan: 2, placeholder: 'Décrivez le problème, l\'analyse et les actions prévues...' },
  { name: 'capa_type', label: 'Type CAPA', type: 'select', required: true, options: ['Corrective Action', 'Preventive Action'] },
  { name: 'priority', label: 'Priorité', type: 'select', options: ['Low', 'Medium', 'High', 'Critical'] },
  { name: 'severity', label: 'Sévérité', type: 'select', options: ['Minor', 'Major', 'Critical'] },
  { name: 'source', label: 'Source', type: 'select', options: ['Non-Conformance', 'Audit Finding', 'Customer Complaint', 'Management Review', 'Process Monitoring', 'Supplier Issue'] },
  { name: 'root_cause_category', label: 'Catégorie cause racine', type: 'select', options: ['Man', 'Machine', 'Method', 'Material', 'Measurement', 'Environment', 'Management'] },
  { name: 'due_date', label: 'Date d\'échéance', type: 'date' },
  { name: 'assigned_to', label: 'Assigné à (email)', type: 'text', placeholder: 'prenom.nom@entreprise.com' },
]

// ─── NCR ────────────────────────────────────────────────────────────────────
const NCR_FIELDS: FieldDef[] = [
  { name: 'title', label: 'Titre de la non-conformité', type: 'text', required: true, placeholder: 'Ex: Lot de composants hors spécification' },
  { name: 'description', label: 'Description', type: 'textarea', required: true, colSpan: 2, placeholder: 'Décrivez la non-conformité en détail...' },
  { name: 'ncr_type', label: 'Type NC', type: 'select', required: true, options: ['Product', 'Process', 'System', 'Supplier'] },
  { name: 'severity', label: 'Sévérité', type: 'select', required: true, options: ['Minor', 'Major', 'Critical'] },
  { name: 'disposition', label: 'Disposition', type: 'select', options: ['Use As Is', 'Rework', 'Scrap', 'Return to Supplier', 'Concession', 'Pending'] },
  { name: 'source', label: 'Source de détection', type: 'select', options: ['Incoming Inspection', 'In-Process', 'Final QC', 'Customer Complaint', 'Audit', 'Other'] },
  { name: 'due_date', label: 'Date d\'échéance', type: 'date' },
  { name: 'assigned_to', label: 'Assigné à (email)', type: 'text', placeholder: 'prenom.nom@entreprise.com' },
]

// ─── Deviation ──────────────────────────────────────────────────────────────
const DEVIATION_FIELDS: FieldDef[] = [
  { name: 'title', label: 'Titre de la déviation', type: 'text', required: true, placeholder: 'Ex: Température hors plage pendant le mélange' },
  { name: 'description', label: 'Description', type: 'textarea', required: true, colSpan: 2, placeholder: 'Décrivez la déviation et son impact...' },
  { name: 'deviation_type', label: 'Type de déviation', type: 'select', required: true, options: ['Planned', 'Unplanned'] },
  { name: 'category', label: 'Catégorie', type: 'select', options: ['Process', 'Equipment', 'Material', 'Environment', 'Personnel', 'Documentation'] },
  { name: 'severity', label: 'Impact', type: 'select', options: ['Low', 'Medium', 'High', 'Critical'] },
  { name: 'product_stage', label: 'Stade du produit', type: 'select', options: ['Raw Material', 'In-Process', 'Finished Product', 'Stability', 'Other'] },
  { name: 'due_date', label: 'Date d\'échéance', type: 'date' },
  { name: 'assigned_to', label: 'Assigné à (email)', type: 'text', placeholder: 'prenom.nom@entreprise.com' },
]

// ─── Change Control ─────────────────────────────────────────────────────────
const CC_FIELDS: FieldDef[] = [
  { name: 'title', label: 'Titre du changement', type: 'text', required: true, placeholder: 'Ex: Remplacement équipement de stérilisation' },
  { name: 'description', label: 'Description du changement', type: 'textarea', required: true, colSpan: 2, placeholder: 'Décrivez la modification proposée et sa justification...' },
  { name: 'change_type', label: 'Type de changement', type: 'select', required: true, options: ['Planned', 'Unplanned', 'Emergency'] },
  { name: 'category', label: 'Catégorie', type: 'select', options: ['Process', 'Equipment', 'Facility', 'Document', 'Material', 'Computer System', 'Organizational', 'Manufacturing', 'Regulatory', 'Supply Chain', 'Warehouse', 'Other'] },
  { name: 'priority', label: 'Priorité', type: 'select', options: ['Low', 'Medium', 'High'] },
  { name: 'due_date', label: 'Date cible', type: 'date' },
  { name: 'assigned_to', label: 'Responsable (email)', type: 'text', placeholder: 'prenom.nom@entreprise.com' },
]

// ─── Audit ──────────────────────────────────────────────────────────────────
const AUDIT_FIELDS: FieldDef[] = [
  { name: 'title', label: 'Titre de l\'audit', type: 'text', required: true, placeholder: 'Ex: Audit interne Qualité Q3 2025' },
  { name: 'description', label: 'Objectif / Périmètre', type: 'textarea', required: true, colSpan: 2, placeholder: 'Décrivez l\'objectif et le périmètre de l\'audit...' },
  { name: 'audit_type', label: 'Type d\'audit', type: 'select', required: true, options: ['Internal', 'External', 'Supplier'] },
  { name: 'status', label: 'Statut initial', type: 'select', options: ['Planned'] },
  { name: 'due_date', label: 'Date de l\'audit', type: 'date' },
  { name: 'assigned_to', label: 'Auditeur responsable', type: 'text', placeholder: 'prenom.nom@entreprise.com' },
]

// ─── Risk (FMEA / ISO 14971) ────────────────────────────────────────────────
const RISK_FIELDS: FieldDef[] = [
  { name: 'title', label: 'Titre du risque', type: 'text', required: true, placeholder: 'Ex: Contamination croisée lors du changement de produit' },
  { name: 'description', label: 'Description du risque', type: 'textarea', required: true, colSpan: 2, placeholder: 'Décrivez le danger, les causes possibles et les conséquences...' },
  { name: 'category', label: 'Catégorie', type: 'select', required: true, options: ['Product', 'Process', 'System', 'Supplier'] },
  { name: 'severity', label: 'Sévérité (1-5)', type: 'number', helpText: '1=Négligeable, 5=Catastrophique' },
  { name: 'probability', label: 'Probabilité (1-5)', type: 'number', helpText: '1=Rare, 5=Presque certain' },
  { name: 'detectability', label: 'Détectabilité (1-5)', type: 'number', helpText: '1=Facilement détectable, 5=Non détectable' },
  { name: 'mitigation_strategy', label: 'Stratégie d\'atténuation', type: 'textarea', colSpan: 2, placeholder: 'Décrivez les mesures de maîtrise et les actions préventives...' },
  { name: 'due_date', label: 'Date de revue', type: 'date' },
  { name: 'assigned_to', label: 'Responsable (email)', type: 'text', placeholder: 'prenom.nom@entreprise.com' },
]

// ─── Training ───────────────────────────────────────────────────────────────
const TRAINING_FIELDS: FieldDef[] = [
  { name: 'title', label: 'Titre de la formation', type: 'text', required: true, placeholder: 'Ex: Formation SOP-023 Contrôle environnemental' },
  { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Objectifs et contenu de la formation...' },
  { name: 'training_type', label: 'Type', type: 'select', options: ['Onboarding', 'SOP', 'Regulatory', 'Skill', 'Certification'] },
  { name: 'delivery_method', label: 'Mode de délivrance', type: 'select', options: ['Classroom', 'Online', 'On-the-Job Training', 'Webinar', 'Blended'] },
  { name: 'status', label: 'Statut initial', type: 'select', options: ['Planned'] },
  { name: 'due_date', label: 'Date de la formation', type: 'date' },
  { name: 'assigned_to', label: 'Formateur (email)', type: 'text', placeholder: 'prenom.nom@entreprise.com' },
]

// ─── Batch Record ───────────────────────────────────────────────────────────
const BATCH_FIELDS: FieldDef[] = [
  { name: 'title', label: 'Numéro de lot', type: 'text', required: true, placeholder: 'Ex: LOT-2025-0042' },
  { name: 'description', label: 'Description du produit', type: 'textarea', placeholder: 'Nom du produit, dosage, forme galénique...' },
  { name: 'status', label: 'Statut initial', type: 'select', options: ['In Progress'] },
  { name: 'due_date', label: 'Date de fin prévue', type: 'date' },
  { name: 'assigned_to', label: 'Responsable (email)', type: 'text', placeholder: 'prenom.nom@entreprise.com' },
]

// ─── Supplier ───────────────────────────────────────────────────────────────
const SUPPLIER_FIELDS: FieldDef[] = [
  { name: 'title', label: 'Nom du fournisseur', type: 'text', required: true, placeholder: 'Ex: Acme Materials SAS' },
  { name: 'description', label: 'Description / Produits fournis', type: 'textarea', placeholder: 'Liste des produits et services...' },
  { name: 'supplier_type', label: 'Type', type: 'select', options: ['Raw Material', 'Packaging', 'Equipment', 'Service', 'Contract Manufacturer', 'Laboratory', 'Other'] },
  { name: 'category', label: 'Classification', type: 'select', options: ['Critical', 'Major', 'Minor'] },
  { name: 'qualification_method', label: 'Méthode de qualification', type: 'select', options: ['On-Site Audit', 'Questionnaire', 'Certificate Review', 'Third-Party Assessment', 'Historical Performance'] },
  { name: 'assigned_to', label: 'Contact (email)', type: 'text', placeholder: 'contact@fournisseur.com' },
]

// ─── Document ───────────────────────────────────────────────────────────────
const DOCUMENT_FIELDS: FieldDef[] = [
  { name: 'title', label: 'Titre du document', type: 'text', required: true, placeholder: 'Ex: Procédure de contrôle des non-conformités' },
  { name: 'description', label: 'Résumé / Objectif', type: 'textarea', required: true, colSpan: 2, placeholder: 'Résumé du contenu et de l\'objectif du document...' },
  { name: 'doc_type', label: 'Type de document', type: 'select', required: true, options: ['MANUEL', 'POLITIQUE', 'PROCEDURE', 'INSTRUCTION', 'FORMULAIRE', 'ENREGISTREMENT', 'SOP', 'WI', 'Specification'] },
  { name: 'classification', label: 'Classification', type: 'select', options: ['Internal', 'External', 'Regulatory', 'Confidential'] },
  { name: 'status', label: 'Statut initial', type: 'select', options: ['Draft'] },
  { name: 'due_date', label: 'Date de révision prévue', type: 'date' },
  { name: 'assigned_to', label: 'Rédacteur (email)', type: 'text', placeholder: 'prenom.nom@entreprise.com' },
]

// ─── Default (fallback) ────────────────────────────────────────────────────
const DEFAULT_FIELDS: FieldDef[] = [
  { name: 'title', label: 'Titre', type: 'text', required: true, placeholder: 'Saisissez un titre...' },
  { name: 'description', label: 'Description', type: 'textarea', required: true, colSpan: 2, placeholder: 'Décrivez en détail...' },
  { name: 'priority', label: 'Priorité', type: 'select', options: ['Low', 'Medium', 'High', 'Critical'] },
  { name: 'due_date', label: 'Date d\'échéance', type: 'date' },
  { name: 'assigned_to', label: 'Assigné à (email)', type: 'text', placeholder: 'prenom.nom@entreprise.com' },
]

// ─── Entity → Fields Map ───────────────────────────────────────────────────
export const ENTITY_FIELDS: Record<string, FieldDef[]> = {
  capas: CAPA_FIELDS,
  ncrs: NCR_FIELDS,
  deviations: DEVIATION_FIELDS,
  'change-controls': CC_FIELDS,
  audits: AUDIT_FIELDS,
  risks: RISK_FIELDS,
  training: TRAINING_FIELDS,
  'batch-records': BATCH_FIELDS,
  suppliers: SUPPLIER_FIELDS,
  documents: DOCUMENT_FIELDS,
}

export function getEntityFields(entitySlug: string): FieldDef[] {
  return ENTITY_FIELDS[entitySlug] || DEFAULT_FIELDS
}