// ============================================================================
// QMS Types — Complete type definitions (replicated from smq-iso-13485-pro)
// ============================================================================

export type UserRole = 'admin' | 'quality_manager' | 'auditor' | 'document_controller' | 'executive' | 'operator';

export type Permission =
  | 'documents.create' | 'documents.read' | 'documents.update' | 'documents.delete' | 'documents.approve'
  | 'capa.create' | 'capa.read' | 'capa.update' | 'capa.delete' | 'capa.approve'
  | 'ncr.create' | 'ncr.read' | 'ncr.update' | 'ncr.delete' | 'ncr.approve'
  | 'deviation.create' | 'deviation.read' | 'deviation.update' | 'deviation.delete' | 'deviation.approve'
  | 'changecontrol.create' | 'changecontrol.read' | 'changecontrol.update' | 'changecontrol.delete' | 'changecontrol.approve'
  | 'audit.create' | 'audit.read' | 'audit.update' | 'audit.delete'
  | 'training.create' | 'training.read' | 'training.update' | 'training.delete'
  | 'risk.create' | 'risk.read' | 'risk.update' | 'risk.delete'
  | 'batch.create' | 'batch.read' | 'batch.update' | 'batch.delete' | 'batch.release'
  | 'supplier.create' | 'supplier.read' | 'supplier.update' | 'supplier.delete'
  | 'recordtypes.create' | 'recordtypes.read' | 'recordtypes.update' | 'recordtypes.delete'
  | 'reports.view' | 'reports.export'
  | 'compliance.view' | 'compliance.manage'
  | 'admin.users' | 'admin.settings' | 'admin.audit_trail';

export const rolePermissions: Record<UserRole, Permission[]> = {
  admin: [
    'documents.create', 'documents.read', 'documents.update', 'documents.delete', 'documents.approve',
    'capa.create', 'capa.read', 'capa.update', 'capa.delete', 'capa.approve',
    'ncr.create', 'ncr.read', 'ncr.update', 'ncr.delete', 'ncr.approve',
    'deviation.create', 'deviation.read', 'deviation.update', 'deviation.delete', 'deviation.approve',
    'changecontrol.create', 'changecontrol.read', 'changecontrol.update', 'changecontrol.delete', 'changecontrol.approve',
    'audit.create', 'audit.read', 'audit.update', 'audit.delete',
    'training.create', 'training.read', 'training.update', 'training.delete',
    'risk.create', 'risk.read', 'risk.update', 'risk.delete',
    'batch.create', 'batch.read', 'batch.update', 'batch.delete', 'batch.release',
    'supplier.create', 'supplier.read', 'supplier.update', 'supplier.delete',
    'recordtypes.create', 'recordtypes.read', 'recordtypes.update', 'recordtypes.delete',
    'reports.view', 'reports.export', 'compliance.view', 'compliance.manage',
    'admin.users', 'admin.settings', 'admin.audit_trail',
  ],
  quality_manager: [
    'documents.create', 'documents.read', 'documents.update', 'documents.approve',
    'capa.create', 'capa.read', 'capa.update', 'capa.approve',
    'ncr.create', 'ncr.read', 'ncr.update', 'ncr.approve',
    'deviation.create', 'deviation.read', 'deviation.update', 'deviation.approve',
    'changecontrol.create', 'changecontrol.read', 'changecontrol.update', 'changecontrol.approve',
    'audit.create', 'audit.read', 'audit.update', 'audit.delete',
    'training.create', 'training.read', 'training.update', 'training.delete',
    'risk.create', 'risk.read', 'risk.update', 'risk.delete',
    'batch.create', 'batch.read', 'batch.update', 'batch.release',
    'supplier.create', 'supplier.read', 'supplier.update', 'supplier.delete',
    'recordtypes.create', 'recordtypes.read', 'recordtypes.update',
    'reports.view', 'reports.export', 'compliance.view', 'compliance.manage',
    'admin.audit_trail',
  ],
  auditor: [
    'documents.read', 'capa.read', 'ncr.read', 'deviation.read', 'changecontrol.read',
    'audit.create', 'audit.read', 'audit.update',
    'training.read', 'risk.read', 'batch.read', 'supplier.read',
    'reports.view', 'compliance.view', 'admin.audit_trail',
  ],
  document_controller: [
    'documents.create', 'documents.read', 'documents.update', 'documents.delete', 'documents.approve',
    'capa.read', 'ncr.read', 'deviation.read',
    'changecontrol.create', 'changecontrol.read', 'changecontrol.update',
    'audit.read', 'training.create', 'training.read', 'training.update',
    'risk.read', 'batch.read', 'supplier.read',
    'recordtypes.read', 'reports.view', 'compliance.view',
  ],
  executive: [
    'documents.read', 'capa.read', 'ncr.read', 'deviation.read', 'changecontrol.read',
    'audit.read', 'training.read', 'risk.read', 'batch.read', 'supplier.read',
    'reports.view', 'reports.export', 'compliance.view',
  ],
  operator: [
    'documents.read', 'capa.read',
    'ncr.create', 'ncr.read',
    'deviation.create', 'deviation.read',
    'changecontrol.read',
    'audit.read', 'training.read',
    'batch.create', 'batch.read', 'batch.update',
    'supplier.read', 'compliance.view',
  ],
};

// Module taxonomy
export const CORE_MODULES = ['documents', 'capa', 'ncr', 'audits', 'training', 'reports', 'compliance'] as const;
export const OPTIONAL_MODULES = ['risks', 'hierarchy', 'batch_records', 'suppliers', 'forms', 'change_control', 'deviations', 'oos_oot'] as const;
export type CoreModule = typeof CORE_MODULES[number];
export type OptionalModule = typeof OPTIONAL_MODULES[number];
export type ModuleKey = CoreModule | OptionalModule;

export const SYSTEM_RECORD_TYPE_SLUGS = ['capa', 'ncr', 'deviation', 'change_control', 'audit', 'risk', 'training', 'supplier', 'batch_record', 'oos_oot'] as const;
export type SystemRecordTypeSlug = typeof SYSTEM_RECORD_TYPE_SLUGS[number];

export type ActiveSection =
  | 'dashboard' | 'documents' | 'document-hierarchy' | 'ncr' | 'capa' | 'deviations'
  | 'change-control' | 'audits' | 'risks' | 'training' | 'batch-records' | 'suppliers'
  | 'oos-oot' | 'forms' | 'record-types' | 'custom-records' | 'reports' | 'compliance'
  | 'scheduled-reports' | 'user-management' | 'settings' | 'audit-trail';

export type IndustryType = 'medical_device' | 'pharmaceutical' | 'biotech' | 'ivd' | 'combination_product';

export interface IndustryConfig {
  type: IndustryType;
  label: string;
  primaryStandard: string;
  recommendedModules: ModuleKey[];
  complianceWeights: Record<string, number>;
  checklistId: 'iso13485' | 'ichq10' | 'ivdr';
}

export const INDUSTRY_CONFIG: Record<IndustryType, IndustryConfig> = {
  medical_device: {
    type: 'medical_device', label: 'Dispositifs Médicaux',
    primaryStandard: 'ISO 13485:2016',
    recommendedModules: [...CORE_MODULES, 'risks', 'batch_records', 'suppliers', 'forms', 'change_control'],
    complianceWeights: { documents: 0.25, capas: 0.20, training: 0.10, audits: 0.10, ncrs: 0.15, risks: 0.10, batchRecords: 0.05, suppliers: 0.05 },
    checklistId: 'iso13485',
  },
  pharmaceutical: {
    type: 'pharmaceutical', label: 'Pharmaceutique',
    primaryStandard: 'ICH Q10',
    recommendedModules: [...CORE_MODULES, 'risks', 'batch_records', 'suppliers', 'forms', 'oos_oot', 'deviations'],
    complianceWeights: { documents: 0.20, capas: 0.20, training: 0.10, audits: 0.10, ncrs: 0.10, risks: 0.10, batchRecords: 0.15, suppliers: 0.05 },
    checklistId: 'ichq10',
  },
  biotech: {
    type: 'biotech', label: 'Biotechnologie',
    primaryStandard: 'ICH Q10',
    recommendedModules: [...CORE_MODULES, 'risks', 'batch_records', 'suppliers', 'forms', 'oos_oot'],
    complianceWeights: { documents: 0.22, capas: 0.20, training: 0.10, audits: 0.10, ncrs: 0.13, risks: 0.10, batchRecords: 0.10, suppliers: 0.05 },
    checklistId: 'ichq10',
  },
  ivd: {
    type: 'ivd', label: 'Diagnostics In Vitro',
    primaryStandard: 'IVDR EU 2017/746',
    recommendedModules: [...CORE_MODULES, 'risks', 'suppliers', 'forms', 'change_control'],
    complianceWeights: { documents: 0.25, capas: 0.20, training: 0.10, audits: 0.10, ncrs: 0.15, risks: 0.10, batchRecords: 0.0, suppliers: 0.10 },
    checklistId: 'ivdr',
  },
  combination_product: {
    type: 'combination_product', label: 'Produits Combinés',
    primaryStandard: 'ISO 13485:2016 + ICH Q10',
    recommendedModules: [...CORE_MODULES, 'risks', 'batch_records', 'suppliers', 'forms', 'change_control', 'deviations', 'oos_oot'],
    complianceWeights: { documents: 0.22, capas: 0.20, training: 0.08, audits: 0.10, ncrs: 0.12, risks: 0.10, batchRecords: 0.10, suppliers: 0.08 },
    checklistId: 'iso13485',
  },
};

export const STANDARDS_BY_INDUSTRY: Record<IndustryType, string[]> = {
  medical_device: ['ISO 13485:2016', 'ISO 14971:2019', 'ISO 9001:2015', 'FDA 21 CFR 820'],
  pharmaceutical: ['ICH Q10', 'ICH Q7', 'ICH Q9', 'FDA 21 CFR 210/211', 'EU GMP Part I'],
  biotech: ['ICH Q10', 'ICH Q5A-E', 'FDA 21 CFR 600', 'EU GMP Part II'],
  ivd: ['IVDR EU 2017/746', 'ISO 13485:2016', 'ISO 14971:2019', 'FDA 21 CFR 820'],
  combination_product: ['ISO 13485:2016', 'ICH Q10', 'FDA 21 CFR 4', 'ISO 14971:2019'],
};

// Document types
export type DocumentType =
  | 'MANUEL' | 'POLITIQUE' | 'INDICATEUR' | 'PROCESS_MAP' | 'ORGANIGRAMME' | 'REGLEMENTAIRE'
  | 'MAPPING' | 'PROCEDURE' | 'INSTRUCTION' | 'FORMULAIRE' | 'REGISTRE' | 'ENREGISTREMENT'
  | 'MASTER_BATCH' | 'SOP' | 'WI' | 'Form' | 'Policy' | 'Specification';

export type DocumentStatus = 'Draft' | 'Under Review' | 'Approved' | 'Effective' | 'Obsolete' | 'Withdrawn';
export type DocumentClassification = 'Internal' | 'External' | 'Regulatory' | 'Confidential';
export type DocumentLevel = 1 | 2 | 3 | 4;
export type ValidationPhase = 'IQ' | 'OQ' | 'PQ' | 'Full';

export const DOCUMENT_LEVEL_LABELS: Record<DocumentLevel, { fr: string; en: string }> = {
  1: { fr: 'Stratégique', en: 'Strategic' },
  2: { fr: 'Transversal', en: 'Cross-Functional' },
  3: { fr: 'Métier / Technique', en: 'Operational / Technical' },
  4: { fr: 'Enregistrement / Formulaire', en: 'Record / Form' },
};

export type TriggerType = 'prerequisite' | 'references' | 'activates' | 'output' | 'escalation';
export type RelationshipType = 'parent_child' | 'references' | 'supersedes' | 'obsoletes' | 'amends';

// CAPA
export type CapaType = 'Corrective' | 'Preventive';
export type CapaStatus = 'Open' | 'Investigation' | 'Implementation' | 'Effectiveness Check' | 'Closed';
export type CapaPriority = 'Critical' | 'High' | 'Medium' | 'Low';
export type CapaSource = 'Non-Conformance' | 'Audit Finding' | 'Customer Complaint' | 'Management Review' | 'Process Monitoring' | 'Supplier Issue';
export type RootCauseCategory = 'Man' | 'Machine' | 'Method' | 'Material' | 'Measurement' | 'Environment' | 'Management';
export type EffectivenessResult = 'Effective' | 'Not Effective' | 'Pending Review';

// NCR + OOS/OOT
export type NcrType = 'Product' | 'Process' | 'System' | 'Supplier' | 'OOS' | 'OOT';
export type NcrStatus = 'Open' | 'Under Investigation' | 'Pending Disposition' | 'Closed';
export type NcrSeverity = 'Critical' | 'Major' | 'Minor';
export type NcrDisposition = 'Use As Is' | 'Rework' | 'Scrap' | 'Return to Supplier' | 'Concession' | 'Pending';
export type OosOotType = 'OOS' | 'OOT';
export type Phase1Conclusion = 'Assignable Cause Found' | 'No Assignable Cause Found' | 'Error Found' | 'No Error Found' | 'Pending';
export type Phase2Conclusion = 'Confirmed OOS' | 'Invalidated' | 'Pending';

// Deviation
export type DeviationType = 'Planned' | 'Unplanned';
export type DeviationStatus = 'Open' | 'Under Investigation' | 'Pending QA Review' | 'Approved' | 'Closed';
export type DeviationCategory = 'Process' | 'Equipment' | 'Material' | 'Environment' | 'Personnel' | 'Documentation';
export type ProductStage = 'Raw Material' | 'In-Process' | 'Finished Product' | 'Stability' | 'Other';

// Change Control
export type CcType = 'Planned' | 'Unplanned' | 'Emergency';
export type CcStatus = 'Requested' | 'Under Review' | 'Approved' | 'In Implementation' | 'Completed' | 'Rejected';
export type CcCategory = 'Process' | 'Equipment' | 'Facility' | 'Document' | 'Material' | 'Computer System' | 'Organizational' | 'Manufacturing' | 'Regulatory' | 'Supply Chain' | 'Warehouse' | 'Other';

// Audit
export type AuditType = 'Internal' | 'External' | 'Supplier';
export type AuditStatus = 'Planned' | 'In Progress' | 'Completed';
export type FindingSeverity = 'Critical' | 'Major' | 'Minor' | 'Observation';

export interface AuditFinding {
  id: string;
  description: string;
  severity: FindingSeverity;
  referenceClause?: string;
  correctiveActionRequired: boolean;
  capaId?: string;
}

// Risk (FMEA + ISO 14971)
export type RiskStatus = 'Open' | 'Mitigated' | 'Accepted' | 'Closed';
export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';
export type RiskCategory = 'Product' | 'Process' | 'System' | 'Supplier';
export type ControlType = 'inherent_safe_design' | 'protective_measures' | 'information_for_safety';
export type RiskAcceptability = 'acceptable' | 'ALARP' | 'unacceptable';

export function calcRpn(p: number, i: number, d: number): number {
  return Math.max(1, Math.min(5, p)) * Math.max(1, Math.min(5, i)) * Math.max(1, Math.min(5, d));
}

export function rpnToLevel(rpn: number): RiskLevel {
  if (rpn <= 20) return 'Low';
  if (rpn <= 60) return 'Medium';
  if (rpn <= 100) return 'High';
  return 'Critical';
}

// Training
export type TrainingType = 'Onboarding' | 'SOP' | 'Regulatory' | 'Skill' | 'Certification';
export type TrainingStatus = 'Planned' | 'In Progress' | 'Completed' | 'Overdue';
export type DeliveryMethod = 'Classroom' | 'Online' | 'On-the-Job Training' | 'Webinar' | 'Blended';
export type TrainingCategory = 'GMP' | 'GLP' | 'GCP' | 'Safety' | 'Quality' | 'Other';

export function getEffectiveTrainingStatus(status: TrainingStatus, dueDate?: string | Date | null): TrainingStatus {
  if (status === 'Completed') return 'Completed';
  if (dueDate && new Date(dueDate) < new Date()) return 'Overdue';
  return status;
}

// Batch Record
export type BatchStatus = 'In Progress' | 'Pending QA Review' | 'Released' | 'Rejected' | 'Quarantine';
export type BatchSizeUnit = 'vials' | 'units' | 'tablets' | 'kg' | 'liters';
export type BatchStepType = 'Weighing' | 'Mixing' | 'Filtration' | 'Filling' | 'Inspection' | 'Labeling' | 'Packaging' | 'QC Testing' | 'Other';
export type BatchStepStatus = 'Pending' | 'In Progress' | 'Completed' | 'Failed';

export interface BatchStep {
  id: string;
  stepOrder: number;
  stepName: string;
  instructions?: string;
  expectedValue?: string;
  actualValue?: string;
  status: BatchStepStatus;
  stepType: BatchStepType;
  operatorId?: string;
  performedAt?: string;
  signatureHash?: string;
}

export interface RawMaterial {
  material: string;
  lotNumber: string;
  supplier?: string;
  status: 'Verified' | 'Pending' | 'Rejected';
}

// Supplier
export type SupplierStatus = 'Qualified' | 'Conditional' | 'Disqualified' | 'Under Evaluation';
export type SupplierCategory = 'Raw Material' | 'Packaging' | 'Equipment' | 'Service' | 'Contract Manufacturer' | 'Laboratory' | 'Other';
export type QualificationMethod = 'On-Site Audit' | 'Questionnaire' | 'Certificate Review' | 'Third-Party Assessment' | 'Historical Performance';

// Forms
export type FormTemplateStatus = 'Draft' | 'Under_Review' | 'Approved' | 'Obsolete';
export type FormInstanceStatus = 'Draft' | 'Submitted' | 'Approved' | 'Rejected';
export type WorkflowType = 'single' | 'sequential' | 'parallel';
export type FieldType = 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'textarea' | 'signature' | 'table' | 'rating' | 'file' | 'repeater';

export interface FormFieldDefinition {
  id: string;
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
  defaultValue?: string;
  helpText?: string;
}

export interface FormTemplateWorkflow {
  type: WorkflowType;
  approvers: { userId?: string; role: UserRole; order: number }[];
  eSignatureRequired: boolean;
  lockAfterSubmission: boolean;
}

export interface FormTemplateCompliance {
  regulatoryReference?: string;
  retentionPeriod?: string;
  dataClassification?: 'Internal' | 'Confidential' | 'Regulatory' | 'GxP Critical';
  auditTrailEnabled: boolean;
  printFriendlyLayout: boolean;
  cfrPart11Compliance: boolean;
}

export const FORM_TEMPLATE_TRANSITIONS: Record<FormTemplateStatus, FormTemplateStatus[]> = {
  Draft: ['Under_Review'],
  Under_Review: ['Approved', 'Draft'],
  Approved: ['Obsolete', 'Draft'],
  Obsolete: [],
};

export const FORM_TEMPLATE_TRANSITION_ROLES: Record<string, UserRole[]> = {
  'Draft→Under_Review': ['admin', 'quality_manager', 'document_controller'],
  'Under_Review→Approved': ['admin', 'quality_manager'],
  'Under_Review→Draft': ['admin', 'quality_manager', 'document_controller'],
  'Approved→Obsolete': ['admin', 'quality_manager'],
  'Approved→Draft': ['admin', 'quality_manager'],
};

export interface FormInstanceApprovalEntry {
  step: number;
  approverId: string;
  approverName: string;
  approverRole: UserRole;
  decision: 'Approved' | 'Rejected';
  comment?: string;
  signatureHash: string;
  timestamp: string;
}

// Record Types & Links
export interface StatusFlowStep {
  status: string;
  label: string;
  description?: string;
  requiresESignature?: boolean;
  allowedRoles?: UserRole[];
}

export interface StatusFlowDefinition {
  linear: string[];
  branches: Record<string, string[]>;
  eSigRequired: string[];
  terminal: string[];
}

export const FALLBACK_STATUS_FLOWS: Record<string, StatusFlowDefinition> = {
  capa: { linear: ['Open', 'Investigation', 'Implementation', 'Effectiveness Check', 'Closed'], branches: {}, eSigRequired: ['Closed'], terminal: ['Closed'] },
  ncr: { linear: ['Open', 'Under Investigation', 'Pending Disposition', 'Closed'], branches: {}, eSigRequired: ['Closed'], terminal: ['Closed'] },
  deviation: { linear: ['Open', 'Under Investigation', 'Pending QA Review', 'Approved', 'Closed'], branches: {}, eSigRequired: ['Approved', 'Closed'], terminal: ['Closed'] },
  change_control: { linear: ['Requested', 'Under Review', 'Approved', 'In Implementation', 'Completed'], branches: { Rejected: ['Requested'] }, eSigRequired: ['Approved', 'Rejected', 'Completed'], terminal: ['Completed', 'Rejected'] },
  audit: { linear: ['Planned', 'In Progress', 'Completed'], branches: {}, eSigRequired: ['Completed'], terminal: ['Completed'] },
  risk: { linear: ['Open', 'Mitigated', 'Closed'], branches: { Accepted: ['Closed'] }, eSigRequired: ['Closed'], terminal: ['Closed'] },
  training: { linear: ['Planned', 'In Progress', 'Completed'], branches: { Overdue: [] }, eSigRequired: ['Completed'], terminal: ['Completed'] },
  supplier: { linear: ['Under Evaluation', 'Conditional', 'Qualified'], branches: { Disqualified: [] }, eSigRequired: ['Qualified', 'Disqualified'], terminal: ['Disqualified'] },
  batch_record: { linear: ['In Progress', 'Pending QA Review', 'Released'], branches: { Rejected: [], Quarantine: ['Pending QA Review'] }, eSigRequired: ['Released', 'Rejected'], terminal: ['Released', 'Rejected'] },
  oos_oot: { linear: ['Open', 'Under Investigation', 'Pending Disposition', 'Closed'], branches: {}, eSigRequired: ['Closed'], terminal: ['Closed'] },
  general: { linear: ['Open', 'Under Review', 'Closed'], branches: {}, eSigRequired: ['Closed'], terminal: ['Closed'] },
};

export type RecordLinkType = 'related' | 'caused_by' | 'corrected_by' | 'linked_to' | 'derived_from' | 'supersedes' | 'references' | 'depends_on';

export const RECORD_LINK_TYPES: { value: RecordLinkType; label: string; directional: boolean }[] = [
  { value: 'related', label: 'Lié (bidirectionnel)', directional: false },
  { value: 'caused_by', label: 'Causé par', directional: true },
  { value: 'corrected_by', label: 'Corrigé par', directional: true },
  { value: 'linked_to', label: 'Associé à', directional: false },
  { value: 'derived_from', label: 'Dérivé de', directional: true },
  { value: 'supersedes', label: 'Remplace', directional: true },
  { value: 'references', label: 'Référence', directional: true },
  { value: 'depends_on', label: 'Dépend de', directional: true },
];

export interface ComplianceRef {
  standard: string;
  clause: string;
  description?: string;
}

// Audit trail
export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'SIGN' | 'LOGIN' | 'EXPORT';

export interface AuditTrailEntry {
  id: string;
  sequenceNumber?: number;
  previousHash?: string;
  hash?: string;
  auditAction: AuditAction;
  tableName: string;
  recordId: string;
  userId?: string;
  userEmail?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  organizationId: string;
  createdAt: string;
}

// Electronic Signature (21 CFR Part 11)
export type SignatureType = 'approval' | 'rejection' | 'review' | 'verification';

export interface ElectronicSignature {
  id: string;
  documentId?: string;
  recordId?: string;
  recordType?: string;
  signedById: string;
  signerName: string;
  signerRole: UserRole;
  signatureType: SignatureType;
  signatureHash: string;
  userAgent?: string;
  revoked: boolean;
  revocationReason?: string;
  createdAt: string;
}

// Org Settings
export interface OrgSettings {
  setup_completed: boolean;
  industry_type?: IndustryType;
  applicable_standards?: string[];
  active_modules: ModuleKey[];
  company_name?: string;
  country?: string;
  city?: string;
  org_size?: string;
  notifications?: {
    capa_overdue: boolean;
    ncr_overdue: boolean;
    document_expiry: boolean;
    training_overdue: boolean;
    audit_due: boolean;
  };
}

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  department?: string | null;
  jobTitle?: string | null;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  orgSettings: OrgSettings;
  hasPermission: (perm: Permission) => boolean;
}
