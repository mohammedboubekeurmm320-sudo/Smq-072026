// ============================================================
// Shared entity slug resolution — accepts multiple variants
// (kebab-case, snake_case, singular, plural) and maps them to
// the canonical Supabase table name (snake_case plural).
//
// This file is the SINGLE SOURCE OF TRUTH for slug → table mapping.
// Both the front-end (via @/lib/qms-entity-map) and the API routes
// (via @/lib/entity-slug-map) must agree on these names.
// ============================================================

import type { CrudEntity } from '@/lib/crud-service'

/**
 * Canonical allowed entities (must match the CrudEntity type).
 */
export const ALLOWED_ENTITIES: readonly CrudEntity[] = [
  'documents', 'electronic_signatures', 'document_prerequisites',
  'form_templates', 'form_instances',
  'capas', 'non_conformances', 'deviations', 'change_controls',
  'audits', 'training', 'risks', 'suppliers', 'batch_records',
  'departments', 'record_type_definitions', 'record_links',
  'document_triggers', 'document_relationships',
  'document_code_sequences',
  'scheduled_reports', 'notifications',
] as const

/**
 * Slug aliases → canonical entity name.
 * The API accepts ALL of these variants for backward / front-end compatibility.
 *
 * Front-end slugs (from @/lib/qms-entity-map):
 *   - capas, ncrs, deviations, change-controls, risks, audits,
 *     training, batch-records, suppliers, documents, oos-oot, forms
 *
 * Common variants the front-end has been observed sending
 *   - /capa (singular, used by useModule('/capa'))
 *   - /ncr (singular)
 *   - /deviation (singular)
 *   - /change_control (snake_case singular)
 *   - /oos_oot (snake_case)
 *   - /batch-records (kebab-case)
 */
const SLUG_ALIASES: Record<string, CrudEntity> = {
  // Documents
  documents: 'documents',
  document: 'documents',
  docs: 'documents',
  doc: 'documents',

  // CAPAs
  capas: 'capas',
  capa: 'capas',

  // Non-Conformities (table: non_conformances)
  non_conformances: 'non_conformances',
  'non-conformances': 'non_conformances',
  ncrs: 'non_conformances',
  ncr: 'non_conformances',
  non_conformance: 'non_conformances',

  // Deviations
  deviations: 'deviations',
  deviation: 'deviations',

  // Change controls
  change_controls: 'change_controls',
  'change-controls': 'change_controls',
  change_control: 'change_controls',
  'change-control': 'change_controls',
  cc: 'change_controls',

  // Risks
  risks: 'risks',
  risk: 'risks',

  // Audits
  audits: 'audits',
  audit: 'audits',

  // Training (table: training)
  training: 'training',
  trainings: 'training',

  // Batch records (table: batch_records)
  batch_records: 'batch_records',
  'batch-records': 'batch_records',
  batchrecords: 'batch_records',
  batch_record: 'batch_records',
  'batch-record': 'batch_records',

  // Suppliers
  suppliers: 'suppliers',
  supplier: 'suppliers',

  // Forms (table: form_templates)
  form_templates: 'form_templates',
  'form-templates': 'form_templates',
  forms: 'form_templates',
  form: 'form_templates',

  // OOS/OOT — stored as non_conformances with a specific type filter
  // (front-end may send oos_oot or oos-oot — both map to non_conformances)
  oos_oot: 'non_conformances',
  'oos-oot': 'non_conformances',
  oos: 'non_conformances',
  oot: 'non_conformances',

  // Electronic signatures
  electronic_signatures: 'electronic_signatures',
  'electronic-signatures': 'electronic_signatures',
  esig: 'electronic_signatures',

  // Document prerequisites
  document_prerequisites: 'document_prerequisites',
  'document-prerequisites': 'document_prerequisites',

  // Form instances
  form_instances: 'form_instances',
  'form-instances': 'form_instances',

  // Departments
  departments: 'departments',
  department: 'departments',

  // Record type definitions
  record_type_definitions: 'record_type_definitions',
  'record-type-definitions': 'record_type_definitions',

  // Record links
  record_links: 'record_links',
  'record-links': 'record_links',

  // Document triggers
  document_triggers: 'document_triggers',
  'document-triggers': 'document_triggers',

  // Document relationships
  document_relationships: 'document_relationships',
  'document-relationships': 'document_relationships',

  // Document code sequences (used for auto-numbering)
  document_code_sequences: 'document_code_sequences',
  'document-code-sequences': 'document_code_sequences',

  // Scheduled reports
  scheduled_reports: 'scheduled_reports',
  'scheduled-reports': 'scheduled_reports',

  // Notifications
  notifications: 'notifications',
  notification: 'notifications',
}

/**
 * Resolve a slug (from URL path) to a canonical entity name.
 * Returns null if the slug is unknown.
 *
 * Examples:
 *   resolveEntitySlug('capa')      → 'capas'
 *   resolveEntitySlug('capas')     → 'capas'
 *   resolveEntitySlug('ncr')       → 'non_conformances'
 *   resolveEntitySlug('ncrs')      → 'non_conformances'
 *   resolveEntitySlug('batch-records') → 'batch_records'
 *   resolveEntitySlug('foobar')    → null
 */
export function resolveEntitySlug(slug: string): CrudEntity | null {
  const normalized = slug.trim().toLowerCase()
  return SLUG_ALIASES[normalized] ?? null
}

/**
 * Returns true if the slug is a known alias for an allowed entity.
 */
export function isAllowedEntitySlug(slug: string): boolean {
  return resolveEntitySlug(slug) !== null
}
