// ============================================================================
// Zod Validation Schemas — All QMS entities
// Centralized input validation for every API route
// ============================================================================

import { z } from 'zod'

// ---------------------------------------------------------------------------
// Common / shared schemas
// ---------------------------------------------------------------------------

export const paginationSchema = z.object({
  limit: z.coerce.number().min(1).max(200).default(50),
  offset: z.coerce.number().min(0).default(0),
  sort: z.string().default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
})

export const uuidSchema = z.string().uuid()

// ---------------------------------------------------------------------------
// Auth schemas
// ---------------------------------------------------------------------------

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email requis' })
    .email('Email invalide'),
  password: z
    .string({ required_error: 'Mot de passe requis' })
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
})

export const signupSchema = z.object({
  email: z
    .string({ required_error: 'Email requis' })
    .email('Email invalide'),
  password: z
    .string({ required_error: 'Mot de passe requis' })
    .min(12, 'Le mot de passe doit contenir au moins 12 caractères')
    .regex(/[A-Z]/, 'Au moins une majuscule')
    .regex(/[0-9]/, 'Au moins un chiffre')
    .regex(/[^A-Za-z0-9]/, 'Au moins un caractère spécial'),
  fullName: z
    .string({ required_error: 'Nom complet requis' })
    .min(2, 'Au moins 2 caractères')
    .max(100, 'Maximum 100 caractères'),
  orgName: z
    .string({ required_error: 'Nom d\'organisation requis' })
    .min(2, 'Au moins 2 caractères')
    .max(200, 'Maximum 200 caractères'),
  industry: z.enum(
    ['medical_device', 'pharmaceutical', 'biotech', 'ivd', 'combination_product'],
    { required_error: 'Industrie requise' },
  ),
})

// ---------------------------------------------------------------------------
// Electronic Signature schema
// ---------------------------------------------------------------------------

export const verifySignatureSchema = z.object({
  userId: uuidSchema,
  password: z.string().min(1, 'Mot de passe requis pour la signature'),
  purpose: z.enum(['approval', 'rejection', 'review', 'verification'], {
    required_error: 'Purpose de signature requis',
  }),
  recordId: z.string().optional(),
  recordType: z.string().max(100).optional(),
  documentId: z.string().optional(),
})

// ---------------------------------------------------------------------------
// Document schemas
// ---------------------------------------------------------------------------

const documentTypes = [
  'MANUEL', 'POLITIQUE', 'INDICATEUR', 'PROCESS_MAP', 'ORGANIGRAMME', 'REGLEMENTAIRE',
  'MAPPING', 'PROCEDURE', 'INSTRUCTION', 'FORMULAIRE', 'REGISTRE', 'ENREGISTREMENT',
  'MASTER_BATCH', 'SOP', 'WI', 'Form', 'Policy', 'Specification',
] as const

export const createDocumentSchema = z.object({
  title: z.string().min(1, 'Le titre est requis').max(500),
  doc_type: z.enum(documentTypes, { required_error: 'Type de document requis' }),
  level: z.coerce.number().int().min(1).max(4),
  description: z.string().max(5000).optional(),
  status: z.enum(['Draft', 'Under Review', 'Approved', 'Effective', 'Obsolete', 'Withdrawn']).optional().default('Draft'),
  classification: z.enum(['Internal', 'External', 'Regulatory', 'Confidential']).optional(),
  version: z.string().max(20).optional(),
  external_reference: z.string().max(200).optional(),
  effective_date: z.string().optional(),
  review_date: z.string().optional(),
  owner_id: z.string().uuid().optional(),
  department: z.string().max(100).optional(),
  keywords: z.array(z.string().max(100)).max(20).optional(),
  parent_id: z.string().uuid().nullable().optional(),
  validation_phase: z.enum(['IQ', 'OQ', 'PQ', 'Full']).optional(),
})

export const updateDocumentSchema = createDocumentSchema.partial().omit({ organization_id: true })

// ---------------------------------------------------------------------------
// CAPA schemas
// ---------------------------------------------------------------------------

const capaSources = ['Non-Conformance', 'Audit Finding', 'Customer Complaint', 'Management Review', 'Process Monitoring', 'Supplier Issue'] as const
const rootCauseCategories = ['Man', 'Machine', 'Method', 'Material', 'Measurement', 'Environment', 'Management'] as const
const capaPriorities = ['Critical', 'High', 'Medium', 'Low'] as const

export const createCapaSchema = z.object({
  title: z.string().min(1, 'Le titre est requis').max(500),
  type: z.enum(['Corrective', 'Preventive'], { required_error: 'Type requis' }),
  priority: z.enum(capaPriorities).default('Medium'),
  source: z.enum(capaSources, { required_error: 'Source requise' }),
  description: z.string().min(10, 'Description trop courte (min 10 caractères)').max(10000),
  due_date: z.string().optional(),
  root_cause_category: z.enum(rootCauseCategories).optional(),
  root_cause_analysis: z.string().max(10000).optional(),
  immediate_action: z.string().max(5000).optional(),
  corrective_action: z.string().max(5000).optional(),
  preventive_action: z.string().max(5000).optional(),
  effectiveness_check_description: z.string().max(5000).optional(),
  assigned_to: z.string().uuid().optional(),
  related_ncr_id: z.string().uuid().optional(),
  related_audit_id: z.string().uuid().optional(),
})

export const updateCapaSchema = createCapaSchema.partial()

// ---------------------------------------------------------------------------
// NCR schemas
// ---------------------------------------------------------------------------

const ncrTypes = ['Product', 'Process', 'System', 'Supplier', 'OOS', 'OOT'] as const
const ncrSeverities = ['Critical', 'Major', 'Minor'] as const

export const createNcrSchema = z.object({
  title: z.string().min(1, 'Le titre est requis').max(500),
  type: z.enum(ncrTypes, { required_error: 'Type requis' }),
  severity: z.enum(ncrSeverities).default('Major'),
  description: z.string().min(10, 'Description trop courte (min 10 caractères)').max(10000),
  disposition: z.enum(['Use As Is', 'Rework', 'Scrap', 'Return to Supplier', 'Concession', 'Pending']).optional(),
  lot_number: z.string().max(100).optional(),
  product_code: z.string().max(100).optional(),
  quantity_affected: z.number().min(0).optional(),
  due_date: z.string().optional(),
  assigned_to: z.string().uuid().optional(),
  related_capa_id: z.string().uuid().optional(),
  // OOS/OOT specific
  oos_oot_type: z.enum(['OOS', 'OOT']).optional(),
  phase1_conclusion: z.enum(['Assignable Cause Found', 'No Assignable Cause Found', 'Error Found', 'No Error Found', 'Pending']).optional(),
  phase2_conclusion: z.enum(['Confirmed OOS', 'Invalidated', 'Pending']).optional(),
})

export const updateNcrSchema = createNcrSchema.partial()

// ---------------------------------------------------------------------------
// Deviation schemas
// ---------------------------------------------------------------------------

const deviationCategories = ['Process', 'Equipment', 'Material', 'Environment', 'Personnel', 'Documentation'] as const
const productStages = ['Raw Material', 'In-Process', 'Finished Product', 'Stability', 'Other'] as const

export const createDeviationSchema = z.object({
  title: z.string().min(1, 'Le titre est requis').max(500),
  type: z.enum(['Planned', 'Unplanned'], { required_error: 'Type requis' }),
  category: z.enum(deviationCategories).optional(),
  description: z.string().min(10, 'Description trop courte (min 10 caractères)').max(10000),
  impact_assessment: z.string().max(5000).optional(),
  product_stage: z.enum(productStages).optional(),
  batch_number: z.string().max(100).optional(),
  due_date: z.string().optional(),
  assigned_to: z.string().uuid().optional(),
  investigation_required: z.boolean().optional().default(false),
  cap_required: z.boolean().optional().default(false),
})

export const updateDeviationSchema = createDeviationSchema.partial()

// ---------------------------------------------------------------------------
// Change Control schemas
// ---------------------------------------------------------------------------

const ccCategories = [
  'Process', 'Equipment', 'Facility', 'Document', 'Material', 'Computer System',
  'Organizational', 'Manufacturing', 'Regulatory', 'Supply Chain', 'Warehouse', 'Other',
] as const

export const createChangeControlSchema = z.object({
  title: z.string().min(1, 'Le titre est requis').max(500),
  type: z.enum(['Planned', 'Unplanned', 'Emergency'], { required_error: 'Type requis' }),
  category: z.enum(ccCategories).optional(),
  description: z.string().min(10, 'Description trop courte (min 10 caractères)').max(10000),
  current_state: z.string().max(5000).optional(),
  proposed_change: z.string().max(5000).optional(),
  justification: z.string().max(5000).optional(),
  risk_assessment: z.string().max(5000).optional(),
  due_date: z.string().optional(),
  assigned_to: z.string().uuid().optional(),
  implementation_plan: z.string().max(10000).optional(),
  rollback_plan: z.string().max(5000).optional(),
  affected_documents: z.array(z.string().uuid()).max(50).optional(),
})

export const updateChangeControlSchema = createChangeControlSchema.partial()

// ---------------------------------------------------------------------------
// Audit schemas
// ---------------------------------------------------------------------------

export const createAuditSchema = z.object({
  title: z.string().min(1, 'Le titre est requis').max(500),
  type: z.enum(['Internal', 'External', 'Supplier'], { required_error: 'Type requis' }),
  description: z.string().max(10000).optional(),
  scope: z.string().max(5000).optional(),
  lead_auditor_id: z.string().uuid().optional(),
  team_member_ids: z.array(z.string().uuid()).max(20).optional(),
  planned_start_date: z.string().optional(),
  planned_end_date: z.string().optional(),
  location: z.string().max(500).optional(),
  department: z.string().max(100).optional(),
  checklist_reference: z.string().max(200).optional(),
  findings: z.array(z.object({
    id: z.string().optional(),
    description: z.string().min(1),
    severity: z.enum(['Critical', 'Major', 'Minor', 'Observation']),
    reference_clause: z.string().max(100).optional(),
    corrective_action_required: z.boolean(),
    capa_id: z.string().uuid().optional(),
  })).max(100).optional(),
})

export const updateAuditSchema = createAuditSchema.partial()

// ---------------------------------------------------------------------------
// Risk schemas (ISO 14971 / FMEA)
// ---------------------------------------------------------------------------

const riskCategories = ['Product', 'Process', 'System', 'Supplier'] as const

export const createRiskSchema = z.object({
  title: z.string().min(1, 'Le titre est requis').max(500),
  category: z.enum(riskCategories).optional(),
  description: z.string().min(10, 'Description trop courte (min 10 caractères)').max(10000),
  hazard_identification: z.string().max(5000).optional(),
  severity: z.coerce.number().int().min(1).max(5),
  occurrence: z.coerce.number().int().min(1).max(5),
  detection: z.coerce.number().int().min(1).max(5),
  risk_level: z.enum(['Low', 'Medium', 'High', 'Critical']).optional(),
  control_type: z.enum(['inherent_safe_design', 'protective_measures', 'information_for_safety']).optional(),
  control_measures: z.string().max(5000).optional(),
  residual_severity: z.coerce.number().int().min(1).max(5).optional(),
  residual_occurrence: z.coerce.number().int().min(1).max(5).optional(),
  residual_detection: z.coerce.number().int().min(1).max(5).optional(),
  acceptability: z.enum(['acceptable', 'ALARP', 'unacceptable']).optional(),
  justification: z.string().max(5000).optional(),
  due_date: z.string().optional(),
  assigned_to: z.string().uuid().optional(),
})

export const updateRiskSchema = createRiskSchema.partial()

// ---------------------------------------------------------------------------
// Training schemas
// ---------------------------------------------------------------------------

export const createTrainingSchema = z.object({
  title: z.string().min(1, 'Le titre est requis').max(500),
  type: z.enum(['Onboarding', 'SOP', 'Regulatory', 'Skill', 'Certification'], { required_error: 'Type requis' }),
  category: z.enum(['GMP', 'GLP', 'GCP', 'Safety', 'Quality', 'Other']).optional(),
  description: z.string().max(5000).optional(),
  delivery_method: z.enum(['Classroom', 'Online', 'On-the-Job Training', 'Webinar', 'Blended']).optional(),
  trainer: z.string().max(200).optional(),
  due_date: z.string().optional(),
  trainee_ids: z.array(z.string().uuid()).min(1, 'Au moins un participant requis').max(200),
  document_ids: z.array(z.string().uuid()).max(50).optional(),
  passing_score: z.coerce.number().min(0).max(100).optional(),
  duration_minutes: z.coerce.number().int().min(1).max(9999).optional(),
})

export const updateTrainingSchema = createTrainingSchema.partial()

// ---------------------------------------------------------------------------
// Batch Record schemas
// ---------------------------------------------------------------------------

const batchStepTypes = ['Weighing', 'Mixing', 'Filtration', 'Filling', 'Inspection', 'Labeling', 'Packaging', 'QC Testing', 'Other'] as const
const batchStepStatuses = ['Pending', 'In Progress', 'Completed', 'Failed'] as const

const batchStepSchema = z.object({
  id: z.string().optional(),
  stepOrder: z.coerce.number().int().min(1),
  stepName: z.string().min(1).max(200),
  instructions: z.string().max(5000).optional(),
  expectedValue: z.string().max(1000).optional(),
  actualValue: z.string().max(1000).optional(),
  status: z.enum(batchStepStatuses).default('Pending'),
  stepType: z.enum(batchStepTypes).default('Other'),
})

const rawMaterialSchema = z.object({
  material: z.string().min(1).max(500),
  lotNumber: z.string().min(1).max(200),
  supplier: z.string().max(500).optional(),
  status: z.enum(['Verified', 'Pending', 'Rejected']).default('Pending'),
})

export const createBatchRecordSchema = z.object({
  batch_number: z.string().min(1, 'Numéro de lot requis').max(100),
  product_code: z.string().max(100).optional(),
  product_name: z.string().max(500).optional(),
  batch_size: z.coerce.number().min(0).optional(),
  size_unit: z.enum(['vials', 'units', 'tablets', 'kg', 'liters']).optional(),
  status: z.enum(['In Progress', 'Pending QA Review', 'Released', 'Rejected', 'Quarantine']).optional().default('In Progress'),
  manufacturing_date: z.string().optional(),
  expiry_date: z.string().optional(),
  release_date: z.string().optional(),
  assigned_to: z.string().uuid().optional(),
  steps: z.array(batchStepSchema).max(200).optional(),
  raw_materials: z.array(rawMaterialSchema).max(100).optional(),
  notes: z.string().max(5000).optional(),
})

export const updateBatchRecordSchema = createBatchRecordSchema.partial()

// ---------------------------------------------------------------------------
// Supplier schemas
// ---------------------------------------------------------------------------

const supplierCategories = ['Raw Material', 'Packaging', 'Equipment', 'Service', 'Contract Manufacturer', 'Laboratory', 'Other'] as const
const qualificationMethods = ['On-Site Audit', 'Questionnaire', 'Certificate Review', 'Third-Party Assessment', 'Historical Performance'] as const

export const createSupplierSchema = z.object({
  name: z.string().min(1, 'Nom du fournisseur requis').max(500),
  code: z.string().max(50).optional(),
  category: z.enum(supplierCategories).optional(),
  description: z.string().max(5000).optional(),
  country: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  address: z.string().max(500).optional(),
  contact_name: z.string().max(200).optional(),
  contact_email: z.string().email().optional().or(z.literal('')),
  contact_phone: z.string().max(50).optional(),
  website: z.string().url().optional().or(z.literal('')),
  status: z.enum(['Under Evaluation', 'Conditional', 'Qualified', 'Disqualified']).optional().default('Under Evaluation'),
  qualification_method: z.enum(qualificationMethods).optional(),
  qualification_date: z.string().optional(),
  next_review_date: z.string().optional(),
  criticality: z.enum(['Critical', 'High', 'Medium', 'Low']).optional(),
  notes: z.string().max(5000).optional(),
})

export const updateSupplierSchema = createSupplierSchema.partial()

// ---------------------------------------------------------------------------
// Form Template schemas
// ---------------------------------------------------------------------------

const fieldTypes = ['text', 'number', 'date', 'select', 'checkbox', 'textarea', 'signature', 'table', 'rating', 'file', 'repeater'] as const

const fieldDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  label: z.string().min(1).max(200),
  type: z.enum(fieldTypes, { required_error: 'Type de champ requis' }),
  required: z.boolean().optional().default(false),
  options: z.array(z.string().max(200)).max(100).optional(),
  defaultValue: z.string().max(1000).optional(),
  helpText: z.string().max(500).optional(),
})

export const createFormTemplateSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(200),
  description: z.string().max(2000).optional(),
  fields: z.array(fieldDefinitionSchema).min(1, 'Au moins un champ est requis').max(100),
  status: z.enum(['Draft', 'Under_Review', 'Approved', 'Obsolete']).optional().default('Draft'),
  workflow: z.object({
    type: z.enum(['single', 'sequential', 'parallel']).default('single'),
    approvers: z.array(z.object({
      userId: z.string().uuid().optional(),
      role: z.enum(['admin', 'quality_manager', 'auditor', 'document_controller', 'executive', 'operator']),
      order: z.coerce.number().int().min(1),
    })).max(10),
    eSignatureRequired: z.boolean().default(false),
    lockAfterSubmission: z.boolean().default(true),
  }).optional(),
  compliance: z.object({
    regulatoryReference: z.string().max(200).optional(),
    retentionPeriod: z.string().max(100).optional(),
    dataClassification: z.enum(['Internal', 'Confidential', 'Regulatory', 'GxP Critical']).optional(),
    auditTrailEnabled: z.boolean().default(true),
    printFriendlyLayout: z.boolean().default(false),
    cfrPart11Compliance: z.boolean().default(false),
  }).optional(),
})

export const updateFormTemplateSchema = createFormTemplateSchema.partial()

// ---------------------------------------------------------------------------
// Form Instance schemas
// ---------------------------------------------------------------------------

export const createFormInstanceSchema = z.object({
  template_id: z.string().uuid({ required_error: 'Template ID requis' }),
  data: z.record(z.unknown()).refine(
    (val) => val !== null && typeof val === 'object',
    { message: 'Les données du formulaire doivent être un objet' },
  ),
  status: z.enum(['Draft', 'Submitted', 'Approved', 'Rejected']).optional().default('Draft'),
})

export const updateFormInstanceSchema = createFormInstanceSchema.partial().omit({ template_id: true })

// ---------------------------------------------------------------------------
// Organization Settings schema
// ---------------------------------------------------------------------------

export const updateOrgSettingsSchema = z.object({
  setup_completed: z.boolean().optional(),
  industry_type: z.enum(['medical_device', 'pharmaceutical', 'biotech', 'ivd', 'combination_product']).optional(),
  applicable_standards: z.array(z.string().max(100)).max(20).optional(),
  active_modules: z.array(z.string().max(50)).max(50).optional(),
  company_name: z.string().max(200).optional(),
  country: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  org_size: z.string().max(50).optional(),
  notifications: z.object({
    capa_overdue: z.boolean().optional(),
    ncr_overdue: z.boolean().optional(),
    document_expiry: z.boolean().optional(),
    training_overdue: z.boolean().optional(),
    audit_due: z.boolean().optional(),
  }).optional(),
})

// ---------------------------------------------------------------------------
// Profile Update schema
// ---------------------------------------------------------------------------

export const updateProfileSchema = z.object({
  full_name: z.string().min(2).max(100).optional(),
  job_title: z.string().max(200).optional(),
  department: z.string().max(100).optional(),
  phone: z.string().max(50).optional(),
  avatar_url: z.string().url().optional().or(z.literal('')),
  password: z.string()
    .min(12, 'Le mot de passe doit contenir au moins 12 caractères')
    .regex(/[A-Z]/, 'Au moins une majuscule')
    .regex(/[0-9]/, 'Au moins un chiffre')
    .regex(/[^A-Za-z0-9]/, 'Au moins un caractère spécial')
    .optional(),
})

// ---------------------------------------------------------------------------
// Status Transition schema
// ---------------------------------------------------------------------------

export const statusTransitionSchema = z.object({
  toStatus: z.string().min(1, 'Statut cible requis').max(100),
  comment: z.string().max(5000).optional(),
  signatureId: z.string().uuid().optional(),
})

// ---------------------------------------------------------------------------
// Record Link schema
// ---------------------------------------------------------------------------

export const createRecordLinkSchema = z.object({
  source_id: uuidSchema,
  source_type: z.string().min(1).max(100),
  target_id: uuidSchema,
  target_type: z.string().min(1).max(100),
  link_type: z.enum([
    'related', 'caused_by', 'corrected_by', 'linked_to',
    'derived_from', 'supersedes', 'references', 'depends_on',
  ]),
})

// ---------------------------------------------------------------------------
// Validation helper — for use in API routes
// ---------------------------------------------------------------------------

export function validateBody<T>(
  schema: z.ZodSchema<T>,
  body: unknown,
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(body)
  if (!result.success) {
    const firstIssue = result.error.issues[0]
    const message = firstIssue
      ? `${firstIssue.path.join('.')}: ${firstIssue.message}`
      : 'Données invalides'
    return { success: false, error: message }
  }
  return { success: true, data: result.data }
}