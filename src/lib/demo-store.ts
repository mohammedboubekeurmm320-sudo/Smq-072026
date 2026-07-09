// DemoStore — In-memory store replacing Supabase for demo mode
// Replicated architecture from smq-iso-13485-pro src/lib/demo-store.ts
// Multi-tenant, multi-org, supports all 10 record-type modules + record_links + audit_trail

import { create } from 'zustand'
// bcrypt removed - using simple demo hash for client-side mode
import type {
  UserRole, Permission, rolePermissions, OrgSettings, IndustryType, ModuleKey,
  ActiveSection, DocumentType, DocumentStatus, DocumentLevel,
  CapaType, CapaStatus, CapaPriority, CapaSource, RootCauseCategory, EffectivenessResult,
  NcrType, NcrStatus, NcrSeverity, NcrDisposition, Phase1Conclusion, Phase2Conclusion,
  DeviationType, DeviationStatus, DeviationCategory, ProductStage,
  CcType, CcStatus, CcCategory,
  AuditType, AuditStatus, AuditFinding,
  RiskStatus, RiskLevel, RiskCategory, ControlType, RiskAcceptability,
  TrainingType, TrainingStatus,
  BatchStatus, BatchSizeUnit, BatchStep, RawMaterial,
  SupplierStatus, SupplierCategory, QualificationMethod,
  FormTemplateStatus, FormInstanceStatus, FormFieldDefinition, FormTemplateWorkflow, FormTemplateCompliance,
  StatusFlowDefinition,
  RecordLinkType, ComplianceRef,
  AuditAction, AuditTrailEntry,
  ElectronicSignature, SignatureType,
} from '@/types/qms'
import {
  calcRpn, rpnToLevel, getEffectiveTrainingStatus,
  INDUSTRY_CONFIG, STANDARDS_BY_INDUSTRY, CORE_MODULES, OPTIONAL_MODULES, SYSTEM_RECORD_TYPE_SLUGS,
  FALLBACK_STATUS_FLOWS,
} from '@/types/qms'

// ============================================================================
// Records interfaces
// ============================================================================
export interface Profile {
  id: string; email: string; fullName: string; role: UserRole; department?: string;
  jobTitle?: string; phone?: string; avatarUrl?: string;
  organizationId: string; active: boolean; lastLoginAt?: string;
  passwordHash: string; createdAt: string; updatedAt: string;
}
export interface Organization {
  id: string; name: string; slug: string;
  settings: OrgSettings; createdAt: string; updatedAt: string;
}
export interface Document {
  id: string; documentNumber: string; title: string; docType: DocumentType;
  version: string; status: DocumentStatus; classification: string;
  code?: string; isoClause?: string; documentLevel: DocumentLevel;
  parentDocumentId?: string; departmentCode?: string; isPrerequisite: boolean;
  reviewCycleMonths: number; validationPhase?: string;
  effectiveDate?: string; expirationDate?: string; lastReviewed?: string; nextReview?: string;
  owner?: string; retentionPeriod?: string; docScope?: string; docReferences?: string;
  content?: string; summary?: string;
  isTemplate: boolean; templateReferenceId?: string; templateReferenceVersion?: string;
  typeSpecificData?: Record<string, unknown>; customFields?: Record<string, unknown>;
  organizationId: string; authorId?: string; createdById?: string; approverId?: string;
  createdAt: string; updatedAt: string;
}
export interface CAPA {
  id: string; capaNumber: string; title: string; capaType: CapaType; status: CapaStatus;
  priority: CapaPriority; source: CapaSource; sourceReferenceId?: string; sourceRecordType?: string;
  description?: string; problemStatement?: string; investigationDetails?: string;
  rootCauseAnalysis?: string; rootCauseCategory?: RootCauseCategory;
  fiveWhys: string[]; correctiveAction?: string;
  effectivenessVerificationMethod?: string; effectivenessCriteria?: string; effectivenessResult?: EffectivenessResult;
  linkedDocumentId?: string; linkedNcrId?: string; linkedAuditId?: string; linkedCapaId?: string;
  templateId?: string; templateVersion?: string; assignedToId?: string; ownerId?: string;
  dueDate?: string; createdDate: string; closedDate?: string;
  organizationId: string; createdById?: string; createdAt: string; updatedAt: string;
}
export interface NonConformance {
  id: string; ncrNumber: string; title: string; ncrType: NcrType; status: NcrStatus;
  severity: NcrSeverity; source?: string; description?: string;
  lotNumber?: string; quantityAffected?: string; disposition: NcrDisposition;
  isOosOot: boolean; analyticalMethod?: string; measuredValue?: number; measuredUnit?: string;
  specLimit?: string; phase1Conclusion?: Phase1Conclusion;
  phase2Required: boolean; phase2Conclusion?: Phase2Conclusion; rejectLot: boolean;
  linkedCapaId?: string; linkedProcedureRef?: string; supplierId?: string;
  impactAssessment?: string; containmentActions?: string; affectedProduct?: string;
  closedSignatureHash?: string; closedSignedAt?: string; closedById?: string; closedReason?: string;
  assignedToId?: string; ownerId?: string; dueDate?: string;
  createdDate: string; organizationId: string; createdAt: string; updatedAt: string;
}
export interface Deviation {
  id: string; devNumber: string; title: string; deviationType: DeviationType; status: DeviationStatus;
  severity: 'Critical' | 'Major' | 'Minor'; category: DeviationCategory;
  description?: string; deviationDetails?: string; justification?: string;
  riskAssessment?: string; correctiveAction?: string; preventiveAction?: string;
  sopReference?: string; expectedResult?: string; actualResult?: string;
  productStage?: ProductStage; quarantine: boolean;
  impactOnValidatedState?: string; impactOnRegulatoryFiling?: string; containmentAction?: string;
  detectedDate?: string; isPlannedDeviation: boolean;
  lotNumber?: string; productCode?: string; quantityAffected?: string;
  linkedCapaId?: string; linkedDocumentId?: string;
  assignedToId?: string; ownerId?: string; dueDate?: string; closedDate?: string;
  organizationId: string; createdAt: string; updatedAt: string;
}
export interface ChangeControl {
  id: string; ccNumber: string; title: string; ccType: CcType; status: CcStatus;
  priority: 'Critical' | 'High' | 'Medium' | 'Low'; category: CcCategory;
  description?: string; justification?: string; proposedChange?: string;
  detailedChangeDescription?: string; businessComplianceJustification?: string;
  riskAssessment?: string; impactAnalysis?: string; affectedAreas?: string;
  impactOnValidatedSystems: boolean; implementationPlan?: string;
  implementationDate?: string; estimatedCostImpact?: string; completionDate?: string;
  regulatoryTrigger?: string; emergencyFlag: boolean;
  linkedDocumentId?: string; linkedCapaId?: string; additionalReferences?: string;
  assignedToId?: string; requestedById?: string; approvedById?: string; ownerId?: string;
  dueDate?: string; organizationId: string; createdAt: string; updatedAt: string;
}
export interface Audit {
  id: string; auditNumber: string; title: string; auditType: AuditType; status: AuditStatus;
  auditScope?: string; scheduledDate?: string; completedDate?: string;
  leadAuditorId?: string; auditees: string[];
  findings: AuditFinding[]; auditCriteria?: string; complianceRating?: string;
  completedSignatureHash?: string; completedSignedAt?: string; completedSignedById?: string;
  organizationId: string; createdAt: string; updatedAt: string;
}
export interface Risk {
  id: string; riskNumber: string; title: string; category: RiskCategory; status: RiskStatus;
  hazardDescription?: string; riskOwner?: string; regulatoryReference?: string;
  controlType?: ControlType; verificationMethod?: string; riskAcceptability: RiskAcceptability;
  priorityNotes?: string;
  probability: number; impact: number; detectability: number; rpn: number; riskLevel: RiskLevel;
  mitigation?: string; residualRisk?: string;
  residualProbability?: number; residualImpact?: number; residualDetectability?: number; residualRpn?: number;
  linkedDocumentId?: string; linkedCapaId?: string; ownerId?: string;
  organizationId: string; createdAt: string; updatedAt: string;
}
export interface Training {
  id: string; title: string; description?: string; trainingType: TrainingType; status: TrainingStatus;
  assignedToId: string; dueDate?: string; completedDate?: string; documentId?: string;
  metadata?: { deliveryMethod?: string; trainer?: string; passingScore?: number; retrainingInterval?: string; certificationValidity?: string; category?: string };
  organizationId: string; createdAt: string; updatedAt: string;
}
export interface BatchRecord {
  id: string; lotNumber: string; productName: string; productCode?: string;
  batchSize?: string; batchSizeUnit: BatchSizeUnit;
  masterFormulaId?: string; sopReference?: string;
  manufacturingDate?: string; expiryDate?: string; status: BatchStatus; isLocked: boolean;
  qaReleaseDate?: string; qaReleasedById?: string;
  steps: BatchStep[]; rawMaterials: RawMaterial[];
  organizationId: string; createdAt: string; updatedAt: string;
}
export interface Supplier {
  id: string; supplierCode: string; name: string; category: SupplierCategory; status: SupplierStatus;
  qualificationDate?: string; nextReviewDate?: string; certifications: string[];
  performanceScore?: number; qualificationDocId?: string; qualificationMethod?: QualificationMethod;
  qualificationDocRef?: string;
  website?: string; primaryContactName?: string; primaryContactEmail?: string; primaryContactPhone?: string;
  street?: string; city?: string; stateProvince?: string; postalCode?: string; country?: string;
  emergencyContactName?: string; emergencyContactPhone?: string; notes?: string;
  organizationId: string; createdAt: string; updatedAt: string;
}
export interface FormTemplate {
  id: string; documentId?: string; title: string; version: string; description?: string;
  fields: FormFieldDefinition[]; isActive: boolean; status: FormTemplateStatus;
  moduleType: string; workflow?: FormTemplateWorkflow; compliance?: FormTemplateCompliance;
  signatures: ElectronicSignature[]; currentApprovalStep: number; previousVersionId?: string;
  effectiveDate?: string; reviewComment?: string;
  organizationId: string; createdById?: string; createdAt: string; updatedAt: string;
}
export interface FormInstance {
  id: string; templateId: string; templateVersion?: string; referenceNumber?: string;
  values: Record<string, unknown>; status: FormInstanceStatus; isLocked: boolean;
  submittedById?: string; submittedAt?: string; signatureHash?: string;
  signatures: ElectronicSignature[]; currentApprovalStep: number;
  approvalHistory: any[]; parentDocumentId?: string;
  linkedRecordId?: string; linkedRecordType?: string; recordTypeSlug?: string;
  organizationId: string; createdById?: string; createdAt: string; updatedAt: string;
}
export interface RecordTypeDefinition {
  id: string; slug: string; name: string; nameEn?: string; icon: string;
  description?: string; statusFlow: any[]; defaultFields: FormFieldDefinition[];
  complianceRefs: ComplianceRef[]; codePrefix?: string;
  isSystem: boolean; isActive: boolean; requiresEsig: boolean; minApproverCount: number;
  effectiveDate?: string; previousVersionId?: string; version: number; changeReason?: string;
  organizationId: string; createdById?: string; createdAt: string; updatedAt: string;
}
export interface RecordLink {
  id: string; sourceRecordId: string; sourceRecordType: string;
  targetRecordId: string; targetRecordType: string; linkType: RecordLinkType;
  description?: string; organizationId: string; createdById?: string; createdAt: string;
}

// ============================================================================
// State shape
// ============================================================================
interface QmsState {
  initialized: boolean;
  organizations: Organization[];
  profiles: Profile[];
  sessions: Record<string, { profileId: string; expiresAt: string }>;
  documents: Document[];
  formTemplates: FormTemplate[];
  formInstances: FormInstance[];
  capas: CAPA[];
  ncrs: NonConformance[];
  deviations: Deviation[];
  changeControls: ChangeControl[];
  audits: Audit[];
  risks: Risk[];
  trainings: Training[];
  batchRecords: BatchRecord[];
  suppliers: Supplier[];
  auditTrails: AuditTrailEntry[];
  electronicSignatures: ElectronicSignature[];
  recordTypeDefinitions: RecordTypeDefinition[];
  recordLinks: RecordLink[];
  // counters per org for auto-numbering
  counters: Record<string, Record<string, number>>;
  // audit chain state
  auditChain: Record<string, { lastSequence: number; lastHash: string }>;
}

// ============================================================================
// Helpers
// ============================================================================
function cuid(): string {
  return 'id_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
function now(): string { return new Date().toISOString(); }
function slugify(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
function hashPassword(p: string): string {
  // Simple hash for demo (client-side). NOT production-safe.
  const salt = 'qms_demo_salt_v1';
  let h = 0;
  const data = salt + p;
  for (let i = 0; i < data.length; i++) h = ((h << 5) - h) + data.charCodeAt(i) | 0;
  return `DEMO$${Math.abs(h).toString(16)}$${data.length}`;
}
function verifyPassword(p: string, hash: string): boolean {
  return hashPassword(p) === hash;
}
function generateSignatureHash(signerId: string, ref: string, type: string): string {
  const ts = Date.now();
  const data = `${signerId}:${ref}:${type}:${ts}:${Math.random()}`;
  let h = 0;
  for (let i = 0; i < data.length; i++) h = ((h << 5) - h) + data.charCodeAt(i) | 0;
  return `SIG-${Math.abs(h).toString(16).toUpperCase()}-${ts.toString(36).toUpperCase()}`;
}
function computeAuditHash(orgId: string, seq: number, prevHash: string, action: string, table: string, recordId: string, userId?: string, timestamp?: string): string {
  const canonical = JSON.stringify({ seq, action, table, record_id: recordId, user_id: userId || '', org_id: orgId, prev_hash: prevHash, timestamp: timestamp || now() });
  let h = 0;
  for (let i = 0; i < canonical.length; i++) h = ((h << 5) - h) + canonical.charCodeAt(i) | 0;
  return `AUD-${Math.abs(h).toString(16).toUpperCase()}`;
}
function nextNumber(state: QmsState, orgId: string, prefix: string): string {
  if (!state.counters[orgId]) state.counters[orgId] = {};
  const c = (state.counters[orgId][prefix] || 0) + 1;
  state.counters[orgId][prefix] = c;
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(c).padStart(3, '0')}`;
}

// ============================================================================
// Actions interface
// ============================================================================
interface QmsActions {
  init: () => Promise<void>
  // Auth
  signup: (email: string, password: string, fullName: string, orgName: string, industry: IndustryType) => Promise<{ ok: boolean; error?: string; session?: string }>
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string; session?: string; profile?: Profile; organization?: Organization }>
  logout: (session: string) => void
  getProfileFromSession: (session: string) => Profile | null
  getOrganizationFromSession: (session: string) => Organization | null
  updateOrgSettings: (orgId: string, settings: Partial<OrgSettings>) => void
  // CRUD generic helpers
  addAudit: (orgId: string, action: AuditAction, table: string, recordId: string, user: Profile | null, oldValues?: any, newValues?: any) => void
  // Documents
  listDocuments: (orgId: string) => Document[]
  createDocument: (orgId: string, userId: string, data: Partial<Document>) => Document
  updateDocument: (orgId: string, userId: string, id: string, patch: Partial<Document>) => Document | null
  deleteDocument: (orgId: string, userId: string, id: string) => void
  // CAPAs
  listCapas: (orgId: string) => CAPA[]
  createCapa: (orgId: string, userId: string, data: Partial<CAPA>) => CAPA
  updateCapa: (orgId: string, userId: string, id: string, patch: Partial<CAPA>) => CAPA | null
  deleteCapa: (orgId: string, userId: string, id: string) => void
  // NCRs
  listNcrs: (orgId: string) => NonConformance[]
  createNcr: (orgId: string, userId: string, data: Partial<NonConformance>) => NonConformance
  updateNcr: (orgId: string, userId: string, id: string, patch: Partial<NonConformance>) => NonConformance | null
  deleteNcr: (orgId: string, userId: string, id: string) => void
  // Deviations
  listDeviations: (orgId: string) => Deviation[]
  createDeviation: (orgId: string, userId: string, data: Partial<Deviation>) => Deviation
  updateDeviation: (orgId: string, userId: string, id: string, patch: Partial<Deviation>) => Deviation | null
  deleteDeviation: (orgId: string, userId: string, id: string) => void
  // ChangeControls
  listChangeControls: (orgId: string) => ChangeControl[]
  createChangeControl: (orgId: string, userId: string, data: Partial<ChangeControl>) => ChangeControl
  updateChangeControl: (orgId: string, userId: string, id: string, patch: Partial<ChangeControl>) => ChangeControl | null
  deleteChangeControl: (orgId: string, userId: string, id: string) => void
  // Audits
  listAudits: (orgId: string) => Audit[]
  createAudit: (orgId: string, userId: string, data: Partial<Audit>) => Audit
  updateAudit: (orgId: string, userId: string, id: string, patch: Partial<Audit>) => Audit | null
  deleteAudit: (orgId: string, userId: string, id: string) => void
  // Risks
  listRisks: (orgId: string) => Risk[]
  createRisk: (orgId: string, userId: string, data: Partial<Risk>) => Risk
  updateRisk: (orgId: string, userId: string, id: string, patch: Partial<Risk>) => Risk | null
  deleteRisk: (orgId: string, userId: string, id: string) => void
  // Trainings
  listTrainings: (orgId: string) => Training[]
  createTraining: (orgId: string, userId: string, data: Partial<Training>) => Training
  updateTraining: (orgId: string, userId: string, id: string, patch: Partial<Training>) => Training | null
  deleteTraining: (orgId: string, userId: string, id: string) => void
  // BatchRecords
  listBatchRecords: (orgId: string) => BatchRecord[]
  createBatchRecord: (orgId: string, userId: string, data: Partial<BatchRecord>) => BatchRecord
  updateBatchRecord: (orgId: string, userId: string, id: string, patch: Partial<BatchRecord>) => BatchRecord | null
  deleteBatchRecord: (orgId: string, userId: string, id: string) => void
  // Suppliers
  listSuppliers: (orgId: string) => Supplier[]
  createSupplier: (orgId: string, userId: string, data: Partial<Supplier>) => Supplier
  updateSupplier: (orgId: string, userId: string, id: string, patch: Partial<Supplier>) => Supplier | null
  deleteSupplier: (orgId: string, userId: string, id: string) => void
  // Form templates / instances
  listFormTemplates: (orgId: string) => FormTemplate[]
  listFormInstances: (orgId: string) => FormInstance[]
  createFormInstance: (orgId: string, userId: string, data: Partial<FormInstance>) => FormInstance
  transitionFormInstance: (orgId: string, userId: string, id: string, target: FormInstanceStatus, signatureHash?: string, comment?: string) => { ok: boolean; error?: string }
  // Record Types
  listRecordTypes: (orgId: string) => RecordTypeDefinition[]
  createRecordType: (orgId: string, userId: string, data: Partial<RecordTypeDefinition>) => { ok: boolean; error?: string; recordType?: RecordTypeDefinition }
  updateRecordType: (orgId: string, userId: string, id: string, patch: Partial<RecordTypeDefinition>) => { ok: boolean; error?: string }
  deleteRecordType: (orgId: string, userId: string, id: string) => { ok: boolean; error?: string }
  // Record Links
  listRecordLinks: (orgId: string, recordId?: string, recordType?: string) => RecordLink[]
  createRecordLink: (orgId: string, userId: string, data: Partial<RecordLink>) => { ok: boolean; error?: string; link?: RecordLink }
  deleteRecordLink: (orgId: string, userId: string, id: string) => void
  // Audit Trail
  listAuditTrail: (orgId: string, filters?: { action?: string; tableName?: string; userId?: string }) => AuditTrailEntry[]
  // Signatures
  signRecord: (orgId: string, userId: string, recordId: string, recordType: string, type: SignatureType, signer: Profile) => ElectronicSignature
}

// ============================================================================
// Store implementation
// ============================================================================
export const useQmsStore = create<QmsState & QmsActions>((set, get) => ({
  initialized: false,
  organizations: [],
  profiles: [],
  sessions: {},
  documents: [],
  formTemplates: [],
  formInstances: [],
  capas: [],
  ncrs: [],
  deviations: [],
  changeControls: [],
  audits: [],
  risks: [],
  trainings: [],
  batchRecords: [],
  suppliers: [],
  auditTrails: [],
  electronicSignatures: [],
  recordTypeDefinitions: [],
  recordLinks: [],
  counters: {},
  auditChain: {},

  init: async () => {
    if (get().initialized) return
    await seedDemoData()
    set({ initialized: true })
  },

  signup: async (email, password, fullName, orgName, industry) => {
    const state = get()
    if (state.profiles.find(p => p.email.toLowerCase() === email.toLowerCase())) {
      return { ok: false, error: 'Cet email est déjà utilisé' }
    }
    const orgId = cuid()
    const profileId = cuid()
    const org: Organization = {
      id: orgId, name: orgName, slug: slugify(orgName),
      settings: {
        setup_completed: true,
        industry_type: industry,
        applicable_standards: STANDARDS_BY_INDUSTRY[industry],
        active_modules: [...INDUSTRY_CONFIG[industry].recommendedModules] as ModuleKey[],
        company_name: orgName,
      },
      createdAt: now(), updatedAt: now(),
    }
    const profile: Profile = {
      id: profileId, email: email.toLowerCase(), fullName, role: 'admin',
      passwordHash: hashPassword(password),
      organizationId: orgId, active: true,
      createdAt: now(), updatedAt: now(),
    }
    const session = cuid()
    set({
      organizations: [...state.organizations, org],
      profiles: [...state.profiles, profile],
      sessions: { ...state.sessions, [session]: { profileId, expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString() } },
    })
    get().addAudit(orgId, 'CREATE', 'organizations', orgId, profile, undefined, org as any)
    get().addAudit(orgId, 'CREATE', 'profiles', profileId, profile, undefined, profile as any)
    return { ok: true, session, profile, organization: org }
  },

  login: async (email, password) => {
    const state = get()
    const profile = state.profiles.find(p => p.email.toLowerCase() === email.toLowerCase())
    if (!profile || !profile.active) return { ok: false, error: 'Identifiants invalides' }
    if (!verifyPassword(password, profile.passwordHash)) return { ok: false, error: 'Identifiants invalides' }
    const org = state.organizations.find(o => o.id === profile.organizationId)
    if (!org) return { ok: false, error: 'Organisation introuvable' }
    const session = cuid()
    set({
      sessions: { ...state.sessions, [session]: { profileId: profile.id, expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString() } },
      profiles: state.profiles.map(p => p.id === profile.id ? { ...p, lastLoginAt: now() } : p),
    })
    get().addAudit(org.id, 'LOGIN', 'profiles', profile.id, profile)
    return { ok: true, session, profile, organization: org }
  },

  logout: (session) => {
    const state = get()
    const next = { ...state.sessions }
    delete next[session]
    set({ sessions: next })
  },

  getProfileFromSession: (session) => {
    const state = get()
    const s = state.sessions[session]
    if (!s) return null
    if (new Date(s.expiresAt) < new Date()) {
      const next = { ...state.sessions }
      delete next[session]
      set({ sessions: next })
      return null
    }
    return state.profiles.find(p => p.id === s.profileId) || null
  },

  getOrganizationFromSession: (session) => {
    const profile = get().getProfileFromSession(session)
    if (!profile) return null
    return get().organizations.find(o => o.id === profile.organizationId) || null
  },

  updateOrgSettings: (orgId, settings) => {
    set(state => ({
      organizations: state.organizations.map(o => o.id === orgId
        ? { ...o, settings: { ...o.settings, ...settings }, updatedAt: now() }
        : o)
    }))
  },

  addAudit: (orgId, action, table, recordId, user, oldValues, newValues) => {
    const state = get()
    const chain = state.auditChain[orgId] || { lastSequence: 0, lastHash: 'GENESIS' }
    const seq = chain.lastSequence + 1
    const timestamp = now()
    const hash = computeAuditHash(orgId, seq, chain.lastHash, action, table, recordId, user?.id, timestamp)
    const entry: AuditTrailEntry = {
      id: cuid(), sequenceNumber: seq, previousHash: chain.lastHash, hash,
      auditAction: action, tableName: table, recordId,
      userId: user?.id, userEmail: user?.email,
      oldValues, newValues, organizationId: orgId, createdAt: timestamp,
    }
    set({
      auditTrails: [entry, ...state.auditTrails],
      auditChain: { ...state.auditChain, [orgId]: { lastSequence: seq, lastHash: hash } },
    })
  },

  // --------------------------- Documents ---------------------------
  listDocuments: (orgId) => get().documents.filter(d => d.organizationId === orgId),
  createDocument: (orgId, userId, data) => {
    const doc: Document = {
      id: cuid(), documentNumber: data.documentNumber || `DOC-${Date.now()}`,
      title: data.title || '', docType: data.docType || 'PROCEDURE',
      version: data.version || '1.0', status: data.status || 'Draft',
      classification: data.classification || 'Internal',
      code: data.code, isoClause: data.isoClause,
      documentLevel: data.documentLevel || 4,
      parentDocumentId: data.parentDocumentId, departmentCode: data.departmentCode,
      isPrerequisite: data.isPrerequisite || false,
      reviewCycleMonths: data.reviewCycleMonths || 12,
      validationPhase: data.validationPhase,
      effectiveDate: data.effectiveDate, expirationDate: data.expirationDate,
      lastReviewed: data.lastReviewed, nextReview: data.nextReview,
      owner: data.owner, retentionPeriod: data.retentionPeriod,
      docScope: data.docScope, docReferences: data.docReferences,
      content: data.content, summary: data.summary,
      isTemplate: data.isTemplate || false,
      templateReferenceId: data.templateReferenceId,
      templateReferenceVersion: data.templateReferenceVersion,
      typeSpecificData: data.typeSpecificData, customFields: data.customFields,
      organizationId: orgId, authorId: userId, createdById: userId,
      createdAt: now(), updatedAt: now(),
    }
    set(state => ({ documents: [doc, ...state.documents] }))
    const user = get().profiles.find(p => p.id === userId) || null
    get().addAudit(orgId, 'CREATE', 'documents', doc.id, user, undefined, doc as any)
    return doc
  },
  updateDocument: (orgId, userId, id, patch) => {
    const state = get()
    const existing = state.documents.find(d => d.id === id && d.organizationId === orgId)
    if (!existing) return null
    const updated = { ...existing, ...patch, updatedAt: now() }
    set(state => ({ documents: state.documents.map(d => d.id === id ? updated : d) }))
    const user = get().profiles.find(p => p.id === userId) || null
    get().addAudit(orgId, 'UPDATE', 'documents', id, user, existing, updated)
    return updated
  },
  deleteDocument: (orgId, userId, id) => {
    const existing = get().documents.find(d => d.id === id && d.organizationId === orgId)
    set(state => ({ documents: state.documents.filter(d => d.id !== id) }))
    const user = get().profiles.find(p => p.id === userId) || null
    if (existing) get().addAudit(orgId, 'DELETE', 'documents', id, user, existing, undefined)
  },

  // --------------------------- CAPAs ---------------------------
  listCapas: (orgId) => get().capas.filter(c => c.organizationId === orgId),
  createCapa: (orgId, userId, data) => {
    const capa: CAPA = {
      id: cuid(), capaNumber: data.capaNumber || nextNumber(get(), orgId, 'CAPA'),
      title: data.title || '', capaType: data.capaType || 'Corrective', status: data.status || 'Open',
      priority: data.priority || 'Medium', source: data.source || 'Non-Conformance',
      sourceReferenceId: data.sourceReferenceId, sourceRecordType: data.sourceRecordType,
      description: data.description, problemStatement: data.problemStatement,
      investigationDetails: data.investigationDetails,
      rootCauseAnalysis: data.rootCauseAnalysis, rootCauseCategory: data.rootCauseCategory,
      fiveWhys: data.fiveWhys || [], correctiveAction: data.correctiveAction,
      effectivenessVerificationMethod: data.effectivenessVerificationMethod,
      effectivenessCriteria: data.effectivenessCriteria,
      effectivenessResult: data.effectivenessResult,
      linkedDocumentId: data.linkedDocumentId, linkedNcrId: data.linkedNcrId,
      linkedAuditId: data.linkedAuditId, linkedCapaId: data.linkedCapaId,
      templateId: data.templateId, templateVersion: data.templateVersion,
      assignedToId: data.assignedToId, ownerId: data.ownerId || userId,
      dueDate: data.dueDate, createdDate: now(), closedDate: data.closedDate,
      organizationId: orgId, createdById: userId, createdAt: now(), updatedAt: now(),
    }
    set(state => ({ capas: [capa, ...state.capas] }))
    const user = get().profiles.find(p => p.id === userId) || null
    get().addAudit(orgId, 'CREATE', 'capas', capa.id, user, undefined, capa as any)
    return capa
  },
  updateCapa: (orgId, userId, id, patch) => {
    const existing = get().capas.find(c => c.id === id && c.organizationId === orgId)
    if (!existing) return null
    const updated = { ...existing, ...patch, updatedAt: now() }
    if (patch.status === 'Closed' && !existing.closedDate) updated.closedDate = now()
    set(state => ({ capas: state.capas.map(c => c.id === id ? updated : c) }))
    const user = get().profiles.find(p => p.id === userId) || null
    get().addAudit(orgId, 'UPDATE', 'capas', id, user, existing, updated)
    return updated
  },
  deleteCapa: (orgId, userId, id) => {
    const existing = get().capas.find(c => c.id === id && c.organizationId === orgId)
    set(state => ({ capas: state.capas.filter(c => c.id !== id) }))
    const user = get().profiles.find(p => p.id === userId) || null
    if (existing) get().addAudit(orgId, 'DELETE', 'capas', id, user, existing, undefined)
  },

  // --------------------------- NCRs ---------------------------
  listNcrs: (orgId) => get().ncrs.filter(n => n.organizationId === orgId),
  createNcr: (orgId, userId, data) => {
    const ncr: NonConformance = {
      id: cuid(), ncrNumber: data.ncrNumber || nextNumber(get(), orgId, 'NCR'),
      title: data.title || '', ncrType: data.ncrType || 'Process', status: data.status || 'Open',
      severity: data.severity || 'Minor', source: data.source, description: data.description,
      lotNumber: data.lotNumber, quantityAffected: data.quantityAffected,
      disposition: data.disposition || 'Pending',
      isOosOot: data.isOosOot || false, analyticalMethod: data.analyticalMethod,
      measuredValue: data.measuredValue, measuredUnit: data.measuredUnit, specLimit: data.specLimit,
      phase1Conclusion: data.phase1Conclusion, phase2Required: data.phase2Required || false,
      phase2Conclusion: data.phase2Conclusion, rejectLot: data.rejectLot || false,
      linkedCapaId: data.linkedCapaId, linkedProcedureRef: data.linkedProcedureRef, supplierId: data.supplierId,
      impactAssessment: data.impactAssessment, containmentActions: data.containmentActions, affectedProduct: data.affectedProduct,
      closedSignatureHash: data.closedSignatureHash, closedSignedAt: data.closedSignedAt,
      closedById: data.closedById, closedReason: data.closedReason,
      assignedToId: data.assignedToId, ownerId: data.ownerId || userId, dueDate: data.dueDate,
      createdDate: now(), organizationId: orgId, createdAt: now(), updatedAt: now(),
    }
    set(state => ({ ncrs: [ncr, ...state.ncrs] }))
    const user = get().profiles.find(p => p.id === userId) || null
    get().addAudit(orgId, 'CREATE', 'non_conformances', ncr.id, user, undefined, ncr as any)
    return ncr
  },
  updateNcr: (orgId, userId, id, patch) => {
    const existing = get().ncrs.find(n => n.id === id && n.organizationId === orgId)
    if (!existing) return null
    const updated = { ...existing, ...patch, updatedAt: now() }
    set(state => ({ ncrs: state.ncrs.map(n => n.id === id ? updated : n) }))
    const user = get().profiles.find(p => p.id === userId) || null
    get().addAudit(orgId, 'UPDATE', 'non_conformances', id, user, existing, updated)
    return updated
  },
  deleteNcr: (orgId, userId, id) => {
    const existing = get().ncrs.find(n => n.id === id && n.organizationId === orgId)
    set(state => ({ ncrs: state.ncrs.filter(n => n.id !== id) }))
    const user = get().profiles.find(p => p.id === userId) || null
    if (existing) get().addAudit(orgId, 'DELETE', 'non_conformances', id, user, existing, undefined)
  },

  // --------------------------- Deviations ---------------------------
  listDeviations: (orgId) => get().deviations.filter(d => d.organizationId === orgId),
  createDeviation: (orgId, userId, data) => {
    const dev: Deviation = {
      id: cuid(), devNumber: data.devNumber || nextNumber(get(), orgId, 'DEV'),
      title: data.title || '', deviationType: data.deviationType || 'Unplanned', status: data.status || 'Open',
      severity: data.severity || 'Minor', category: data.category || 'Process',
      description: data.description, deviationDetails: data.deviationDetails, justification: data.justification,
      riskAssessment: data.riskAssessment, correctiveAction: data.correctiveAction, preventiveAction: data.preventiveAction,
      sopReference: data.sopReference, expectedResult: data.expectedResult, actualResult: data.actualResult,
      productStage: data.productStage, quarantine: data.quarantine || false,
      impactOnValidatedState: data.impactOnValidatedState, impactOnRegulatoryFiling: data.impactOnRegulatoryFiling,
      containmentAction: data.containmentAction, detectedDate: data.detectedDate,
      isPlannedDeviation: data.isPlannedDeviation || false,
      lotNumber: data.lotNumber, productCode: data.productCode, quantityAffected: data.quantityAffected,
      linkedCapaId: data.linkedCapaId, linkedDocumentId: data.linkedDocumentId,
      assignedToId: data.assignedToId, ownerId: data.ownerId || userId,
      dueDate: data.dueDate, closedDate: data.closedDate,
      organizationId: orgId, createdAt: now(), updatedAt: now(),
    }
    set(state => ({ deviations: [dev, ...state.deviations] }))
    const user = get().profiles.find(p => p.id === userId) || null
    get().addAudit(orgId, 'CREATE', 'deviations', dev.id, user, undefined, dev as any)
    return dev
  },
  updateDeviation: (orgId, userId, id, patch) => {
    const existing = get().deviations.find(d => d.id === id && d.organizationId === orgId)
    if (!existing) return null
    const updated = { ...existing, ...patch, updatedAt: now() }
    if (patch.status === 'Closed' && !existing.closedDate) (updated as any).closedDate = now()
    set(state => ({ deviations: state.deviations.map(d => d.id === id ? updated : d) }))
    const user = get().profiles.find(p => p.id === userId) || null
    get().addAudit(orgId, 'UPDATE', 'deviations', id, user, existing, updated)
    return updated
  },
  deleteDeviation: (orgId, userId, id) => {
    const existing = get().deviations.find(d => d.id === id && d.organizationId === orgId)
    set(state => ({ deviations: state.deviations.filter(d => d.id !== id) }))
    const user = get().profiles.find(p => p.id === userId) || null
    if (existing) get().addAudit(orgId, 'DELETE', 'deviations', id, user, existing, undefined)
  },

  // --------------------------- ChangeControls ---------------------------
  listChangeControls: (orgId) => get().changeControls.filter(c => c.organizationId === orgId),
  createChangeControl: (orgId, userId, data) => {
    const cc: ChangeControl = {
      id: cuid(), ccNumber: data.ccNumber || nextNumber(get(), orgId, 'CC'),
      title: data.title || '', ccType: data.ccType || 'Planned', status: data.status || 'Requested',
      priority: data.priority || 'Medium', category: data.category || 'Process',
      description: data.description, justification: data.justification, proposedChange: data.proposedChange,
      detailedChangeDescription: data.detailedChangeDescription, businessComplianceJustification: data.businessComplianceJustification,
      riskAssessment: data.riskAssessment, impactAnalysis: data.impactAnalysis, affectedAreas: data.affectedAreas,
      impactOnValidatedSystems: data.impactOnValidatedSystems || false, implementationPlan: data.implementationPlan,
      implementationDate: data.implementationDate, estimatedCostImpact: data.estimatedCostImpact, completionDate: data.completionDate,
      regulatoryTrigger: data.regulatoryTrigger, emergencyFlag: data.emergencyFlag || false,
      linkedDocumentId: data.linkedDocumentId, linkedCapaId: data.linkedCapaId, additionalReferences: data.additionalReferences,
      assignedToId: data.assignedToId, requestedById: data.requestedBy || userId,
      approvedById: data.approvedById, ownerId: data.ownerId || userId,
      dueDate: data.dueDate, organizationId: orgId, createdAt: now(), updatedAt: now(),
    }
    set(state => ({ changeControls: [cc, ...state.changeControls] }))
    const user = get().profiles.find(p => p.id === userId) || null
    get().addAudit(orgId, 'CREATE', 'change_controls', cc.id, user, undefined, cc as any)
    return cc
  },
  updateChangeControl: (orgId, userId, id, patch) => {
    const existing = get().changeControls.find(c => c.id === id && c.organizationId === orgId)
    if (!existing) return null
    const updated = { ...existing, ...patch, updatedAt: now() }
    set(state => ({ changeControls: state.changeControls.map(c => c.id === id ? updated : c) }))
    const user = get().profiles.find(p => p.id === userId) || null
    get().addAudit(orgId, 'UPDATE', 'change_controls', id, user, existing, updated)
    return updated
  },
  deleteChangeControl: (orgId, userId, id) => {
    const existing = get().changeControls.find(c => c.id === id && c.organizationId === orgId)
    set(state => ({ changeControls: state.changeControls.filter(c => c.id !== id) }))
    const user = get().profiles.find(p => p.id === userId) || null
    if (existing) get().addAudit(orgId, 'DELETE', 'change_controls', id, user, existing, undefined)
  },

  // --------------------------- Audits ---------------------------
  listAudits: (orgId) => get().audits.filter(a => a.organizationId === orgId),
  createAudit: (orgId, userId, data) => {
    const audit: Audit = {
      id: cuid(), auditNumber: data.auditNumber || nextNumber(get(), orgId, 'AUD'),
      title: data.title || '', auditType: data.auditType || 'Internal', status: data.status || 'Planned',
      auditScope: data.auditScope, scheduledDate: data.scheduledDate, completedDate: data.completedDate,
      leadAuditorId: data.leadAuditorId || userId, auditees: data.auditees || [],
      findings: data.findings || [], auditCriteria: data.auditCriteria, complianceRating: data.complianceRating,
      completedSignatureHash: data.completedSignatureHash, completedSignedAt: data.completedSignedAt,
      completedSignedById: data.completedSignedById,
      organizationId: orgId, createdAt: now(), updatedAt: now(),
    }
    set(state => ({ audits: [audit, ...state.audits] }))
    const user = get().profiles.find(p => p.id === userId) || null
    get().addAudit(orgId, 'CREATE', 'audits', audit.id, user, undefined, audit as any)
    return audit
  },
  updateAudit: (orgId, userId, id, patch) => {
    const existing = get().audits.find(a => a.id === id && a.organizationId === orgId)
    if (!existing) return null
    const updated = { ...existing, ...patch, updatedAt: now() }
    set(state => ({ audits: state.audits.map(a => a.id === id ? updated : a) }))
    const user = get().profiles.find(p => p.id === userId) || null
    get().addAudit(orgId, 'UPDATE', 'audits', id, user, existing, updated)
    return updated
  },
  deleteAudit: (orgId, userId, id) => {
    const existing = get().audits.find(a => a.id === id && a.organizationId === orgId)
    set(state => ({ audits: state.audits.filter(a => a.id !== id) }))
    const user = get().profiles.find(p => p.id === userId) || null
    if (existing) get().addAudit(orgId, 'DELETE', 'audits', id, user, existing, undefined)
  },

  // --------------------------- Risks ---------------------------
  listRisks: (orgId) => get().risks.filter(r => r.organizationId === orgId),
  createRisk: (orgId, userId, data) => {
    const p = data.probability || 3, i = data.impact || 3, d = data.detectability || 3
    const rpn = calcRpn(p, i, d)
    const risk: Risk = {
      id: cuid(), riskNumber: data.riskNumber || nextNumber(get(), orgId, 'RSK'),
      title: data.title || '', category: data.category || 'Process', status: data.status || 'Open',
      hazardDescription: data.hazardDescription, riskOwner: data.riskOwner, regulatoryReference: data.regulatoryReference,
      controlType: data.controlType, verificationMethod: data.verificationMethod,
      riskAcceptability: data.riskAcceptability || 'ALARP', priorityNotes: data.priorityNotes,
      probability: p, impact: i, detectability: d, rpn, riskLevel: rpnToLevel(rpn),
      mitigation: data.mitigation, residualRisk: data.residualRisk,
      residualProbability: data.residualProbability, residualImpact: data.residualImpact,
      residualDetectability: data.residualDetectability, residualRpn: data.residualRpn,
      linkedDocumentId: data.linkedDocumentId, linkedCapaId: data.linkedCapaId,
      ownerId: data.ownerId || userId,
      organizationId: orgId, createdAt: now(), updatedAt: now(),
    }
    set(state => ({ risks: [risk, ...state.risks] }))
    const user = get().profiles.find(p => p.id === userId) || null
    get().addAudit(orgId, 'CREATE', 'risks', risk.id, user, undefined, risk as any)
    return risk
  },
  updateRisk: (orgId, userId, id, patch) => {
    const existing = get().risks.find(r => r.id === id && r.organizationId === orgId)
    if (!existing) return null
    const p = patch.probability ?? existing.probability
    const i = patch.impact ?? existing.impact
    const d = patch.detectability ?? existing.detectability
    const rpn = (patch.probability || patch.impact || patch.detectability) ? calcRpn(p, i, d) : existing.rpn
    const updated = { ...existing, ...patch, probability: p, impact: i, detectability: d, rpn, riskLevel: rpnToLevel(rpn), updatedAt: now() }
    set(state => ({ risks: state.risks.map(r => r.id === id ? updated : r) }))
    const user = get().profiles.find(p => p.id === userId) || null
    get().addAudit(orgId, 'UPDATE', 'risks', id, user, existing, updated)
    return updated
  },
  deleteRisk: (orgId, userId, id) => {
    const existing = get().risks.find(r => r.id === id && r.organizationId === orgId)
    set(state => ({ risks: state.risks.filter(r => r.id !== id) }))
    const user = get().profiles.find(p => p.id === userId) || null
    if (existing) get().addAudit(orgId, 'DELETE', 'risks', id, user, existing, undefined)
  },

  // --------------------------- Trainings ---------------------------
  listTrainings: (orgId) => get().trainings.filter(t => t.organizationId === orgId).map(t => ({ ...t, status: getEffectiveTrainingStatus(t.status, t.dueDate) })),
  createTraining: (orgId, userId, data) => {
    const training: Training = {
      id: cuid(), title: data.title || '', description: data.description,
      trainingType: data.trainingType || 'SOP', status: data.status || 'Planned',
      assignedToId: data.assignedToId || userId, dueDate: data.dueDate, completedDate: data.completedDate,
      documentId: data.documentId, metadata: data.metadata,
      organizationId: orgId, createdAt: now(), updatedAt: now(),
    }
    set(state => ({ trainings: [training, ...state.trainings] }))
    const user = get().profiles.find(p => p.id === userId) || null
    get().addAudit(orgId, 'CREATE', 'training', training.id, user, undefined, training as any)
    return training
  },
  updateTraining: (orgId, userId, id, patch) => {
    const existing = get().trainings.find(t => t.id === id && t.organizationId === orgId)
    if (!existing) return null
    const updated = { ...existing, ...patch, updatedAt: now() }
    set(state => ({ trainings: state.trainings.map(t => t.id === id ? updated : t) }))
    const user = get().profiles.find(p => p.id === userId) || null
    get().addAudit(orgId, 'UPDATE', 'training', id, user, existing, updated)
    return updated
  },
  deleteTraining: (orgId, userId, id) => {
    const existing = get().trainings.find(t => t.id === id && t.organizationId === orgId)
    set(state => ({ trainings: state.trainings.filter(t => t.id !== id) }))
    const user = get().profiles.find(p => p.id === userId) || null
    if (existing) get().addAudit(orgId, 'DELETE', 'training', id, user, existing, undefined)
  },

  // --------------------------- BatchRecords ---------------------------
  listBatchRecords: (orgId) => get().batchRecords.filter(b => b.organizationId === orgId),
  createBatchRecord: (orgId, userId, data) => {
    const batch: BatchRecord = {
      id: cuid(), lotNumber: data.lotNumber || `LOT-${Date.now()}`,
      productName: data.productName || '', productCode: data.productCode,
      batchSize: data.batchSize, batchSizeUnit: data.batchSizeUnit || 'units',
      masterFormulaId: data.masterFormulaId, sopReference: data.sopReference,
      manufacturingDate: data.manufacturingDate, expiryDate: data.expiryDate,
      status: data.status || 'In Progress', isLocked: data.isLocked || false,
      qaReleaseDate: data.qaReleaseDate, qaReleasedById: data.qaReleasedById,
      steps: data.steps || [], rawMaterials: data.rawMaterials || [],
      organizationId: orgId, createdAt: now(), updatedAt: now(),
    }
    set(state => ({ batchRecords: [batch, ...state.batchRecords] }))
    const user = get().profiles.find(p => p.id === userId) || null
    get().addAudit(orgId, 'CREATE', 'batch_records', batch.id, user, undefined, batch as any)
    return batch
  },
  updateBatchRecord: (orgId, userId, id, patch) => {
    const existing = get().batchRecords.find(b => b.id === id && b.organizationId === orgId)
    if (!existing) return null
    const updated = { ...existing, ...patch, updatedAt: now() }
    if (patch.status === 'Released' && !existing.qaReleaseDate) {
      updated.qaReleaseDate = now(); updated.qaReleasedById = userId; updated.isLocked = true
    }
    set(state => ({ batchRecords: state.batchRecords.map(b => b.id === id ? updated : b) }))
    const user = get().profiles.find(p => p.id === userId) || null
    get().addAudit(orgId, 'UPDATE', 'batch_records', id, user, existing, updated)
    return updated
  },
  deleteBatchRecord: (orgId, userId, id) => {
    const existing = get().batchRecords.find(b => b.id === id && b.organizationId === orgId)
    set(state => ({ batchRecords: state.batchRecords.filter(b => b.id !== id) }))
    const user = get().profiles.find(p => p.id === userId) || null
    if (existing) get().addAudit(orgId, 'DELETE', 'batch_records', id, user, existing, undefined)
  },

  // --------------------------- Suppliers ---------------------------
  listSuppliers: (orgId) => get().suppliers.filter(s => s.organizationId === orgId),
  createSupplier: (orgId, userId, data) => {
    const supplier: Supplier = {
      id: cuid(), supplierCode: data.supplierCode || `SUP-${Date.now()}`,
      name: data.name || '', category: data.category || 'Raw Material',
      status: data.status || 'Under Evaluation',
      qualificationDate: data.qualificationDate, nextReviewDate: data.nextReviewDate,
      certifications: data.certifications || [], performanceScore: data.performanceScore,
      qualificationDocId: data.qualificationDocId, qualificationMethod: data.qualificationMethod,
      qualificationDocRef: data.qualificationDocRef,
      website: data.website, primaryContactName: data.primaryContactName,
      primaryContactEmail: data.primaryContactEmail, primaryContactPhone: data.primaryContactPhone,
      street: data.street, city: data.city, stateProvince: data.stateProvince,
      postalCode: data.postalCode, country: data.country,
      emergencyContactName: data.emergencyContactName, emergencyContactPhone: data.emergencyContactPhone,
      notes: data.notes,
      organizationId: orgId, createdAt: now(), updatedAt: now(),
    }
    set(state => ({ suppliers: [supplier, ...state.suppliers] }))
    const user = get().profiles.find(p => p.id === userId) || null
    get().addAudit(orgId, 'CREATE', 'suppliers', supplier.id, user, undefined, supplier as any)
    return supplier
  },
  updateSupplier: (orgId, userId, id, patch) => {
    const existing = get().suppliers.find(s => s.id === id && s.organizationId === orgId)
    if (!existing) return null
    const updated = { ...existing, ...patch, updatedAt: now() }
    set(state => ({ suppliers: state.suppliers.map(s => s.id === id ? updated : s) }))
    const user = get().profiles.find(p => p.id === userId) || null
    get().addAudit(orgId, 'UPDATE', 'suppliers', id, user, existing, updated)
    return updated
  },
  deleteSupplier: (orgId, userId, id) => {
    const existing = get().suppliers.find(s => s.id === id && s.organizationId === orgId)
    set(state => ({ suppliers: state.suppliers.filter(s => s.id !== id) }))
    const user = get().profiles.find(p => p.id === userId) || null
    if (existing) get().addAudit(orgId, 'DELETE', 'suppliers', id, user, existing, undefined)
  },

  // --------------------------- Forms ---------------------------
  listFormTemplates: (orgId) => get().formTemplates.filter(t => t.organizationId === orgId),
  listFormInstances: (orgId) => get().formInstances.filter(i => i.organizationId === orgId),
  createFormInstance: (orgId, userId, data) => {
    const template = get().formTemplates.find(t => t.id === data.templateId && t.organizationId === orgId)
    if (!template) throw new Error('Template introuvable')
    if (template.status !== 'Approved') throw new Error('Le template doit être Approved pour créer une instance')
    const instance: FormInstance = {
      id: cuid(), templateId: template.id, templateVersion: template.version,
      referenceNumber: data.referenceNumber || nextNumber(get(), orgId, template.moduleType.toUpperCase().slice(0, 4)),
      values: data.values || {}, status: 'Draft', isLocked: false,
      submittedById: data.submittedById, submittedAt: data.submittedAt,
      signatures: [], currentApprovalStep: 0, approvalHistory: [],
      parentDocumentId: data.parentDocumentId,
      linkedRecordId: data.linkedRecordId, linkedRecordType: data.linkedRecordType,
      recordTypeSlug: data.recordTypeSlug || template.moduleType,
      organizationId: orgId, createdById: userId, createdAt: now(), updatedAt: now(),
    }
    set(state => ({ formInstances: [instance, ...state.formInstances] }))
    const user = get().profiles.find(p => p.id === userId) || null
    get().addAudit(orgId, 'CREATE', 'form_instances', instance.id, user, undefined, instance as any)
    return instance
  },
  transitionFormInstance: (orgId, userId, id, target, signatureHash, comment) => {
    const state = get()
    const instance = state.formInstances.find(i => i.id === id && i.organizationId === orgId)
    if (!instance) return { ok: false, error: 'Instance introuvable' }
    const template = state.formTemplates.find(t => t.id === instance.templateId)
    if (!template) return { ok: false, error: 'Template introuvable' }
    if (template.status !== 'Approved') return { ok: false, error: 'Template parent non Approved' }
    const wf = template.workflow
    if (wf?.lockAfterSubmission && instance.status === 'Submitted' && target === 'Draft') {
      return { ok: false, error: 'Instance verrouillée après soumission' }
    }
    if (wf?.eSignatureRequired && (target === 'Approved' || target === 'Rejected') && !signatureHash) {
      return { ok: false, error: 'Signature électronique requise' }
    }
    const profile = state.profiles.find(p => p.id === userId)
    if ((target === 'Approved' || target === 'Rejected') && profile && !['admin', 'quality_manager'].includes(profile.role)) {
      return { ok: false, error: 'Rôle insuffisant pour approuver/rejeter' }
    }
    const updated: FormInstance = { ...instance, status: target, updatedAt: now() }
    if (target === 'Submitted') {
      updated.submittedById = userId; updated.submittedAt = now()
    }
    if ((target === 'Approved' || target === 'Rejected') && signatureHash && profile) {
      const entry: any = {
        step: updated.currentApprovalStep + 1,
        approverId: userId, approverName: profile.fullName, approverRole: profile.role,
        decision: target, comment, signatureHash, timestamp: now(),
      }
      updated.approvalHistory = [...updated.approvalHistory, entry]
      updated.currentApprovalStep += 1
      updated.signatures = [...updated.signatures, {
        id: cuid(), recordId: instance.id, recordType: 'form_instance',
        signedById: userId, signerName: profile.fullName, signerRole: profile.role,
        signatureType: target === 'Approved' ? 'approval' : 'rejection',
        signatureHash, revoked: false, createdAt: now(),
      } as ElectronicSignature]
      if (target === 'Approved') updated.isLocked = true
    }
    set(state => ({ formInstances: state.formInstances.map(i => i.id === id ? updated : i) }))
    get().addAudit(orgId, target === 'Approved' ? 'APPROVE' : target === 'Rejected' ? 'REJECT' : 'UPDATE', 'form_instances', id, profile || null, instance, updated)
    return { ok: true }
  },

  // --------------------------- Record Types ---------------------------
  listRecordTypes: (orgId) => get().recordTypeDefinitions.filter(r => r.organizationId === orgId),
  createRecordType: (orgId, userId, data) => {
    if (!data.slug) return { ok: false, error: 'Slug requis' }
    if (!/^[a-z][a-z0-9_]*$/.test(data.slug)) return { ok: false, error: 'Slug invalide (minuscules, chiffres, _)' }
    if (get().recordTypeDefinitions.find(r => r.organizationId === orgId && r.slug === data.slug)) {
      return { ok: false, error: 'Slug déjà utilisé' }
    }
    if (!data.complianceRefs || data.complianceRefs.length === 0) return { ok: false, error: 'Au moins 1 référence de conformité requise' }
    if (!data.statusFlow || data.statusFlow.length === 0) return { ok: false, error: 'Au moins 1 statut requis' }
    const rt: RecordTypeDefinition = {
      id: cuid(), slug: data.slug, name: data.name || data.slug,
      nameEn: data.nameEn, icon: data.icon || 'FileText', description: data.description,
      statusFlow: data.statusFlow, defaultFields: data.defaultFields || [],
      complianceRefs: data.complianceRefs, codePrefix: data.codePrefix,
      isSystem: false, isActive: true, requiresEsig: data.requiresEsig || false,
      minApproverCount: data.minApproverCount || 1,
      version: 1, organizationId: orgId, createdById: userId, createdAt: now(), updatedAt: now(),
    }
    set(state => ({ recordTypeDefinitions: [...state.recordTypeDefinitions, rt] }))
    const user = get().profiles.find(p => p.id === userId) || null
    get().addAudit(orgId, 'CREATE', 'record_type_definitions', rt.id, user, undefined, rt as any)
    return { ok: true, recordType: rt }
  },
  updateRecordType: (orgId, userId, id, patch) => {
    const existing = get().recordTypeDefinitions.find(r => r.id === id && r.organizationId === orgId)
    if (!existing) return { ok: false, error: 'Type introuvable' }
    if (existing.isSystem && (patch.slug !== undefined || patch.isActive === false)) {
      return { ok: false, error: 'Type système : slug et isActive non modifiables' }
    }
    const updated = { ...existing, ...patch, updatedAt: now() }
    set(state => ({ recordTypeDefinitions: state.recordTypeDefinitions.map(r => r.id === id ? updated : r) }))
    const user = get().profiles.find(p => p.id === userId) || null
    get().addAudit(orgId, 'UPDATE', 'record_type_definitions', id, user, existing, updated)
    return { ok: true }
  },
  deleteRecordType: (orgId, userId, id) => {
    const existing = get().recordTypeDefinitions.find(r => r.id === id && r.organizationId === orgId)
    if (!existing) return { ok: false, error: 'Type introuvable' }
    if (existing.isSystem) return { ok: false, error: 'Type système : suppression interdite' }
    set(state => ({ recordTypeDefinitions: state.recordTypeDefinitions.filter(r => r.id !== id) }))
    const user = get().profiles.find(p => p.id === userId) || null
    get().addAudit(orgId, 'DELETE', 'record_type_definitions', id, user, existing, undefined)
    return { ok: true }
  },

  // --------------------------- Record Links ---------------------------
  listRecordLinks: (orgId, recordId, recordType) => {
    let links = get().recordLinks.filter(l => l.organizationId === orgId)
    if (recordId && recordType) {
      links = links.filter(l =>
        (l.sourceRecordId === recordId && l.sourceRecordType === recordType) ||
        (l.targetRecordId === recordId && l.targetRecordType === recordType)
      )
    }
    return links
  },
  createRecordLink: (orgId, userId, data) => {
    if (data.sourceRecordId === data.targetRecordId && data.sourceRecordType === data.targetRecordType) {
      return { ok: false, error: 'Lien auto-référent interdit' }
    }
    const exists = get().recordLinks.find(l =>
      l.organizationId === orgId &&
      l.sourceRecordId === data.sourceRecordId && l.sourceRecordType === data.sourceRecordType &&
      l.targetRecordId === data.targetRecordId && l.targetRecordType === data.targetRecordType &&
      l.linkType === data.linkType
    )
    if (exists) return { ok: false, error: 'Ce lien existe déjà' }
    const link: RecordLink = {
      id: cuid(), sourceRecordId: data.sourceRecordId!, sourceRecordType: data.sourceRecordType!,
      targetRecordId: data.targetRecordId!, targetRecordType: data.targetRecordType!,
      linkType: data.linkType || 'related', description: data.description,
      organizationId: orgId, createdById: userId, createdAt: now(),
    }
    set(state => ({ recordLinks: [link, ...state.recordLinks] }))
    const user = get().profiles.find(p => p.id === userId) || null
    get().addAudit(orgId, 'CREATE', 'record_links', link.id, user, undefined, link as any)
    return { ok: true, link }
  },
  deleteRecordLink: (orgId, userId, id) => {
    const existing = get().recordLinks.find(l => l.id === id && l.organizationId === orgId)
    set(state => ({ recordLinks: state.recordLinks.filter(l => l.id !== id) }))
    const user = get().profiles.find(p => p.id === userId) || null
    if (existing) get().addAudit(orgId, 'DELETE', 'record_links', id, user, existing, undefined)
  },

  // --------------------------- Audit Trail ---------------------------
  listAuditTrail: (orgId, filters) => {
    let entries = get().auditTrails.filter(a => a.organizationId === orgId)
    if (filters?.action) entries = entries.filter(e => e.auditAction === filters.action)
    if (filters?.tableName) entries = entries.filter(e => e.tableName === filters.tableName)
    if (filters?.userId) entries = entries.filter(e => e.userId === filters.userId)
    return entries
  },

  // --------------------------- Signatures ---------------------------
  signRecord: (orgId, userId, recordId, recordType, type, signer) => {
    const sig: ElectronicSignature = {
      id: cuid(), recordId, recordType,
      signedById: userId, signerName: signer.fullName, signerRole: signer.role,
      signatureType: type, signatureHash: generateSignatureHash(userId, recordId, type),
      revoked: false, createdAt: now(),
    }
    set(state => ({ electronicSignatures: [sig, ...state.electronicSignatures] }))
    get().addAudit(orgId, 'SIGN', recordType, recordId, signer, undefined, { type, signatureHash: sig.signatureHash })
    return sig
  },
}))

// ============================================================================
// Seed demo data (organization MediQuality + 4 users + records across modules)
// ============================================================================
async function seedDemoData() {
  const state = useQmsStore.getState()
  if (state.organizations.length > 0) return

  const orgId = 'org_demo_001'
  const org: Organization = {
    id: orgId, name: 'MediQuality Devices SARL', slug: 'mediquality-devices',
    settings: {
      setup_completed: true,
      industry_type: 'medical_device',
      applicable_standards: STANDARDS_BY_INDUSTRY.medical_device,
      active_modules: [...INDUSTRY_CONFIG.medical_device.recommendedModules] as ModuleKey[],
      company_name: 'MediQuality Devices SARL',
      country: 'France', city: 'Lyon', org_size: '50-200',
      notifications: { capa_overdue: true, ncr_overdue: true, document_expiry: true, training_overdue: true, audit_due: true },
    },
    createdAt: now(), updatedAt: now(),
  }
  const pwd = hashPassword('admin123')
  const users: Profile[] = [
    { id: 'u_admin', email: 'admin@mediquality.fr', fullName: 'Sophie Martin', role: 'admin', department: 'DIRECTION', jobTitle: 'Directrice Générale', passwordHash: pwd, organizationId: orgId, active: true, createdAt: now(), updatedAt: now() },
    { id: 'u_qm', email: 'quality@mediquality.fr', fullName: 'Pierre Dubois', role: 'quality_manager', department: 'AQ', jobTitle: 'Responsable Qualité', passwordHash: pwd, organizationId: orgId, active: true, createdAt: now(), updatedAt: now() },
    { id: 'u_dc', email: 'doc@mediquality.fr', fullName: 'Marie Leroy', role: 'document_controller', department: 'DOC', jobTitle: 'Gestionnaire Documentaire', passwordHash: pwd, organizationId: orgId, active: true, createdAt: now(), updatedAt: now() },
    { id: 'u_aud', email: 'auditor@mediquality.fr', fullName: 'Jean Bernard', role: 'auditor', department: 'AUDIT_INT', jobTitle: 'Auditeur Interne', passwordHash: pwd, organizationId: orgId, active: true, createdAt: now(), updatedAt: now() },
    { id: 'u_op', email: 'operator@mediquality.fr', fullName: 'Lucas Petit', role: 'operator', department: 'PROD', jobTitle: 'Opérateur Production', passwordHash: pwd, organizationId: orgId, active: true, createdAt: now(), updatedAt: now() },
  ]
  setInternal({ organizations: [org], profiles: users })

  // Seed Record Type Definitions (10 system types)
  const rts: RecordTypeDefinition[] = SYSTEM_RECORD_TYPE_SLUGS.map(slug => ({
    id: cuid(), slug, name: slugToName(slug), nameEn: slug,
    icon: slugIcon(slug), description: slugDescription(slug),
    statusFlow: (FALLBACK_STATUS_FLOWS[slug as keyof typeof FALLBACK_STATUS_FLOWS] || FALLBACK_STATUS_FLOWS.general).linear.map((s, i) => ({ status: s, label: s })),
    defaultFields: [], complianceRefs: slugComplianceRefs(slug),
    isSystem: true, isActive: true, requiresEsig: (FALLBACK_STATUS_FLOWS[slug as keyof typeof FALLBACK_STATUS_FLOWS]?.eSigRequired || []).length > 0,
    minApproverCount: 1, version: 1, organizationId: orgId, createdAt: now(), updatedAt: now(),
  }))
  setInternal({ recordTypeDefinitions: rts })

  // Seed documents
  const docs = [
    { documentNumber: 'MQ-001', title: 'Manuel Qualité', docType: 'MANUEL' as DocumentType, status: 'Approved' as DocumentStatus, version: '3.1', classification: 'Internal', code: 'MQ-001', isoClause: '4.2.1', documentLevel: 1 as DocumentLevel, departmentCode: 'AQ', owner: 'Pierre Dubois', summary: 'Manuel Qualité ISO 13485:2016', effectiveDate: '2024-01-20', nextReview: '2026-01-20', isTemplate: false, isPrerequisite: true, retentionPeriod: '10 ans', reviewCycleMonths: 24, authorId: 'u_qm', approverId: 'u_admin' },
    { documentNumber: 'PR-4.2.4', title: 'Procédure de Contrôle des Enregistrements', docType: 'PROCEDURE' as DocumentType, status: 'Approved' as DocumentStatus, version: '2.0', classification: 'Internal', code: 'PR-4.2.4', isoClause: '4.2.4', documentLevel: 2 as DocumentLevel, departmentCode: 'DOC', owner: 'Marie Leroy', summary: 'Maîtrise des enregistrements qualité', effectiveDate: '2024-03-01', nextReview: '2026-03-01', isTemplate: false, retentionPeriod: '5 ans', reviewCycleMonths: 24, authorId: 'u_dc', approverId: 'u_qm' },
    { documentNumber: 'PR-8.5.2', title: 'Procédure CAPA', docType: 'PROCEDURE' as DocumentType, status: 'Approved' as DocumentStatus, version: '1.5', classification: 'Internal', code: 'PR-8.5.2', isoClause: '8.5.2', documentLevel: 2 as DocumentLevel, departmentCode: 'AQ', owner: 'Pierre Dubois', summary: 'Actions correctives et préventives', effectiveDate: '2024-04-15', nextReview: '2026-04-15', isTemplate: false, retentionPeriod: '5 ans', reviewCycleMonths: 24, authorId: 'u_qm', approverId: 'u_admin' },
    { documentNumber: 'PR-8.2.4', title: 'Procédure d\'Audit Interne', docType: 'PROCEDURE' as DocumentType, status: 'Approved' as DocumentStatus, version: '1.2', classification: 'Internal', code: 'PR-8.2.4', isoClause: '8.2.4', documentLevel: 2 as DocumentLevel, departmentCode: 'AUDIT_INT', owner: 'Pierre Dubois', summary: 'Planification et réalisation des audits internes', effectiveDate: '2024-02-01', nextReview: '2026-02-01', isTemplate: false, retentionPeriod: '5 ans', reviewCycleMonths: 24, authorId: 'u_aud', approverId: 'u_qm' },
    { documentNumber: 'PR-7.1', title: 'Procédure de Gestion des Risques', docType: 'PROCEDURE' as DocumentType, status: 'Approved' as DocumentStatus, version: '1.5', classification: 'Internal', code: 'PR-7.1', isoClause: '7.1', documentLevel: 2 as DocumentLevel, departmentCode: 'AQ', owner: 'Pierre Dubois', summary: 'Gestion des risques selon ISO 14971', effectiveDate: '2024-04-15', nextReview: '2026-04-15', isTemplate: false, retentionPeriod: '5 ans', reviewCycleMonths: 24, authorId: 'u_qm', approverId: 'u_admin' },
    { documentNumber: 'WI-PROD-001', title: 'Instruction de Contrôle Final', docType: 'INSTRUCTION' as DocumentType, status: 'Approved' as DocumentStatus, version: '4.0', classification: 'Internal', code: 'WI-PROD-001', isoClause: '7.5.1', documentLevel: 4 as DocumentLevel, departmentCode: 'PROD', owner: 'Lucas Petit', summary: 'Contrôle final du produit DM-100', effectiveDate: '2024-05-10', nextReview: '2025-11-10', isTemplate: false, retentionPeriod: '3 ans', reviewCycleMonths: 18, authorId: 'u_op', approverId: 'u_qm' },
    { documentNumber: 'FORM-NC-001', title: 'Formulaire de Non-Conformité', docType: 'FORMULAIRE' as DocumentType, status: 'Approved' as DocumentStatus, version: '1.0', classification: 'Internal', code: 'FORM-NC-001', isoClause: '8.3', documentLevel: 4 as DocumentLevel, departmentCode: 'AQ', owner: 'Pierre Dubois', summary: 'Enregistrement des non-conformités', effectiveDate: '2024-01-15', nextReview: '2026-01-15', isTemplate: false, retentionPeriod: '5 ans', reviewCycleMonths: 24, authorId: 'u_qm', approverId: 'u_admin' },
    { documentNumber: 'FORM-CAPA-001', title: 'Formulaire CAPA', docType: 'FORMULAIRE' as DocumentType, status: 'Approved' as DocumentStatus, version: '1.0', classification: 'Internal', code: 'FORM-CAPA-001', isoClause: '8.5.2', documentLevel: 4 as DocumentLevel, departmentCode: 'AQ', owner: 'Pierre Dubois', summary: 'Formulaire d\'action corrective et préventive', effectiveDate: '2024-01-15', nextReview: '2026-01-15', isTemplate: false, retentionPeriod: '5 ans', reviewCycleMonths: 24, authorId: 'u_qm', approverId: 'u_admin' },
    { documentNumber: 'POL-001', title: 'Politique Qualité', docType: 'POLITIQUE' as DocumentType, status: 'Approved' as DocumentStatus, version: '2.0', classification: 'Internal', code: 'POL-001', isoClause: '5.3', documentLevel: 1 as DocumentLevel, departmentCode: 'DIRECTION', owner: 'Sophie Martin', summary: 'Politique qualité de l\'entreprise', effectiveDate: '2024-01-05', nextReview: '2026-01-05', isTemplate: false, retentionPeriod: '10 ans', reviewCycleMonths: 24, authorId: 'u_admin', approverId: 'u_admin' },
    { documentNumber: 'DL-001', title: 'Dossier Maître de Lot - DM-100', docType: 'MASTER_BATCH' as DocumentType, status: 'Approved' as DocumentStatus, version: '2.0', classification: 'Internal', code: 'DL-001', isoClause: '7.5.1', documentLevel: 2 as DocumentLevel, departmentCode: 'PROD', owner: 'Lucas Petit', summary: 'Dossier maître pour la fabrication du DM-100', effectiveDate: '2024-06-01', nextReview: '2026-06-01', isTemplate: true, retentionPeriod: '15 ans', reviewCycleMonths: 36, authorId: 'u_op', approverId: 'u_qm' },
  ]
  for (const d of docs) {
    useQmsStore.getState().createDocument(orgId, 'u_qm', d as any)
  }

  // Seed CAPAs
  const capa1 = useQmsStore.getState().createCapa(orgId, 'u_qm', {
    title: 'Correctif étiquetage lot 2024-045', capaType: 'Corrective', priority: 'High',
    source: 'Non-Conformance', description: 'Ré-étiquetage et quarantaine du lot',
    problemStatement: '50 unités avec date de péremption incorrecte',
    investigationDetails: 'Erreur opérateur identifiée durant le conditionnement',
    rootCauseAnalysis: 'Formation insuffisante sur le nouveau système d\'étiquetage',
    rootCauseCategory: 'Man', fiveWhys: ['Pourquoi 1: Opérateur non formé', 'Pourquoi 2: Pas de procédure de formation documentée', 'Pourquoi 3: Récente mise en place du nouvel équipement'],
    correctiveAction: 'Ré-étiquetage complet du lot + formation renforcée opérateurs',
    effectivenessVerificationMethod: 'Audit de poste sur 3 mois',
    effectivenessCriteria: '0 NC étiquetage sur 3 mois',
    effectivenessResult: 'Effective',
    status: 'Closed', dueDate: '2024-04-15', assignedToId: 'u_qm',
  } as any)
  const capa2 = useQmsStore.getState().createCapa(orgId, 'u_qm', {
    title: 'Mise à jour procédure contrôle réception', capaType: 'Corrective', priority: 'Medium',
    source: 'Process Monitoring', description: 'Révision de la procédure pour inclure contrôle dimensionnel',
    problemStatement: 'Contrôle dimensionnel non réalisé sur lot matière première',
    rootCauseAnalysis: 'Procédure de réception incomplète',
    rootCauseCategory: 'Method', fiveWhys: ['Pourquoi 1: Procédure ne mentionne pas le contrôle', 'Pourquoi 2: Révision oubliée lors du dernier changement fournisseur'],
    correctiveAction: 'Révision PR-7.4.1 + formation équipe réception',
    effectivenessVerificationMethod: 'Vérification mensuelle des fiches de réception',
    effectivenessCriteria: '100% des fiches avec contrôle dimensionnel',
    effectivenessResult: 'Pending Review',
    status: 'Implementation', dueDate: '2024-09-30', assignedToId: 'u_dc',
  } as any)
  const capa3 = useQmsStore.getState().createCapa(orgId, 'u_qm', {
    title: 'Prévention défauts emballage', capaType: 'Preventive', priority: 'Medium',
    source: 'Process Monitoring', description: 'Renforcement du contrôle emballage en fin de ligne',
    problemStatement: '3 réclamations client sur emballage endommagé en 6 mois',
    rootCauseAnalysis: 'Pas de contrôle systématique post-conditionnement',
    rootCauseCategory: 'Method',
    correctiveAction: 'Installation caméra de contrôle + procédure WI-PACK-002',
    status: 'Investigation', dueDate: '2024-11-30', assignedToId: 'u_qm',
  } as any)

  // Seed NCRs (with link to CAPAs)
  const ncr1 = useQmsStore.getState().createNcr(orgId, 'u_qm', {
    title: 'Étiquetage non conforme lot 2024-045', ncrType: 'Product', severity: 'Major',
    source: 'Audit interne', description: 'Date de péremption incorrecte sur 50 unités',
    lotNumber: '2024-045', quantityAffected: '50', disposition: 'Rework',
    linkedCapaId: capa1.id, affectedProduct: 'DM-100', containmentActions: 'Quarantaine immédiate du lot',
    impactAssessment: 'Impact qualité mineur - produit toujours conforme mais étiquetage erroné',
    status: 'Closed', dueDate: '2024-04-01',
  } as any)
  const ncr2 = useQmsStore.getState().createNcr(orgId, 'u_op', {
    title: 'Écart procédure de contrôle réception', ncrType: 'Process', severity: 'Minor',
    source: 'Processus', description: 'Contrôle dimensionnel non réalisé sur lot matière première PAL-2024-08',
    lotNumber: 'PAL-2024-08', quantityAffected: '1 palette', disposition: 'Use As Is',
    linkedCapaId: capa2.id, affectedProduct: 'Matière première POLY-001',
    status: 'Pending Disposition', dueDate: '2024-09-15',
  } as any)
  const ncr3 = useQmsStore.getState().createNcr(orgId, 'u_qm', {
    title: 'Réclamation client - défaut d\'emballage', ncrType: 'Product', severity: 'Major',
    source: 'Customer Complaint', description: '3 réclamations client sur emballage endommagé en 6 mois',
    lotNumber: '2024-031, 2024-038, 2024-042', quantityAffected: '5 unités', disposition: 'Pending',
    linkedCapaId: capa3.id, affectedProduct: 'DM-100',
    status: 'Under Investigation', dueDate: '2024-10-30',
  } as any)

  // Seed deviations
  useQmsStore.getState().createDeviation(orgId, 'u_op', {
    title: 'Déviation température salle de conditionnement', deviationType: 'Unplanned', severity: 'Major',
    category: 'Environment', description: 'Température dépassée de 2°C pendant 30 minutes',
    deviationDetails: 'Salle 3 - température 24°C au lieu de 22°C ±2',
    justification: 'Maintenance HVAC en cours', riskAssessment: 'Faible - produit non sensible',
    correctiveAction: 'Vérification HVAC', preventiveAction: 'Calendrier de maintenance révisé',
    sopReference: 'PR-HVAC-001', expectedResult: '22°C ±2', actualResult: '24°C pendant 30min',
    productStage: 'In-Process', quarantine: false,
    lotNumber: '2024-050', productCode: 'DM-100', quantityAffected: '500',
    status: 'Pending QA Review', dueDate: '2024-09-20',
  } as any)
  useQmsStore.getState().createDeviation(orgId, 'u_dc', {
    title: 'Déviation procédure - signature manquante', deviationType: 'Unplanned', severity: 'Minor',
    category: 'Documentation', description: 'Document PR-7.5.1 libéré sans signature QA',
    deviationDetails: 'Document effectif sans signature approbateur',
    justification: 'Erreur procédurale', riskAssessment: 'Document conforme mais non signé',
    correctiveAction: 'Re-soumettre pour approbation', preventiveAction: 'Double contrôle à la libération',
    sopReference: 'PR-4.2.3', expectedResult: 'Document signé avant effet', actualResult: 'Document en vigueur non signé',
    productStage: 'Finished Product', quarantine: false,
    status: 'Open', dueDate: '2024-10-15',
  } as any)

  // Seed change controls
  useQmsStore.getState().createChangeControl(orgId, 'u_dc', {
    title: 'Mise à jour procédure d\'audit interne', ccType: 'Planned', priority: 'Medium',
    category: 'Document', description: 'Révision PR-8.2.4 pour intégrer les exigences MDSAP',
    justification: 'Préparation à la certification MDSAP', proposedChange: 'Ajout section MDSAP',
    detailedChangeDescription: 'Ajout des critères MDSAP dans la checklist d\'audit',
    riskAssessment: 'Faible', impactAnalysis: 'Aucun impact produit',
    affectedAreas: 'Département Qualité', impactOnValidatedSystems: false,
    implementationPlan: 'Révision + formation + déploiement', implementationDate: '2024-10-01',
    regulatoryTrigger: 'MDSAP', emergencyFlag: false,
    status: 'In Implementation', dueDate: '2024-10-01', requestedById: 'u_dc',
  } as any)
  useQmsStore.getState().createChangeControl(orgId, 'u_qm', {
    title: 'Changement fournisseur matière première', ccType: 'Planned', priority: 'High',
    category: 'Material', description: 'Changement de fournisseur pour POLY-001',
    justification: 'Rupture de stock fournisseur actuel', proposedChange: 'Validation nouveau fournisseur AltMat SARL',
    detailedChangeDescription: 'Qualification AltMat SARL, mise à jour du dossier d\'enregistrement',
    riskAssessment: 'Moyen', impactAnalysis: 'Impact sur dossier CE à évaluer',
    affectedAreas: 'Production, Qualité, Réglementaire', impactOnValidatedSystems: true,
    implementationPlan: 'Qualification + 3 lots de validation', implementationDate: '2024-12-01',
    regulatoryTrigger: 'Marquage CE', emergencyFlag: false,
    status: 'Under Review', dueDate: '2024-11-15', requestedById: 'u_qm',
  } as any)

  // Seed audits with findings linked to CAPAs
  useQmsStore.getState().createAudit(orgId, 'u_aud', {
    title: 'Audit interne QMS 2024 T1', auditType: 'Internal', status: 'Completed',
    auditScope: 'SMQ complet selon ISO 13485', scheduledDate: '2024-03-15', completedDate: '2024-03-15',
    leadAuditorId: 'u_aud', auditees: ['Pierre Dubois', 'Marie Leroy'],
    auditCriteria: 'ISO 13485:2016, FDA 21 CFR 820, procédures internes',
    complianceRating: 'Compliant with minor gaps',
    findings: [
      { id: 'f1', description: 'Étiquetage non conforme lot 2024-045', severity: 'Major', referenceClause: '7.5.1', correctiveActionRequired: true, capaId: capa1.id },
      { id: 'f2', description: 'Procédure de réception incomplète', severity: 'Minor', referenceClause: '7.4.1', correctiveActionRequired: true, capaId: capa2.id },
      { id: 'f3', description: 'Absence de revue documentaire pour PR-7.5.1', severity: 'Observation', referenceClause: '4.2.3', correctiveActionRequired: false },
    ],
    completedSignatureHash: 'AUD-DEMO-HASH', completedSignedAt: '2024-03-15', completedSignedById: 'u_aud',
  } as any)
  useQmsStore.getState().createAudit(orgId, 'u_aud', {
    title: 'Audit fournisseur Plasticorp SAS', auditType: 'Supplier', status: 'Completed',
    auditScope: 'Évaluation système qualité fournisseur matière première',
    scheduledDate: '2024-09-10', completedDate: '2024-09-10',
    leadAuditorId: 'u_aud', auditees: ['Marc Petit (Plasticorp)'],
    auditCriteria: 'ISO 13485:2016, cahier des charges MQ-CD-001',
    complianceRating: 'Compliant',
    findings: [
      { id: 'f4', description: 'Système qualité acceptable', severity: 'Observation', referenceClause: '4.1', correctiveActionRequired: false },
    ],
    completedSignatureHash: 'AUD-DEMO-HASH-2', completedSignedAt: '2024-09-10', completedSignedById: 'u_aud',
  } as any)
  useQmsStore.getState().createAudit(orgId, 'u_aud', {
    title: 'Audit interne QMS 2024 T3 - Production', auditType: 'Internal', status: 'Planned',
    auditScope: 'Processus production', scheduledDate: '2024-10-20',
    leadAuditorId: 'u_aud', auditees: ['Lucas Petit'],
    auditCriteria: 'ISO 13485:2016 §7.5',
    findings: [],
  } as any)

  // Seed risks
  useQmsStore.getState().createRisk(orgId, 'u_qm', {
    title: 'Risque de contamination du produit', category: 'Product', status: 'Mitigated',
    hazardDescription: 'Contamination microbiologique durant la production',
    riskOwner: 'Pierre Dubois', regulatoryReference: 'ISO 14971 §5.4',
    controlType: 'protective_measures', verificationMethod: 'Contrôles microbiologiques hebdomadaires',
    riskAcceptability: 'ALARP', priorityNotes: 'Critique pour dispositif stérile',
    probability: 3, impact: 5, detectability: 2,
    mitigation: 'Salle blanche ISO 7 + contrôles microbiologiques + double emballage stérile',
    residualRisk: 'Faible', residualProbability: 1, residualImpact: 5, residualDetectability: 2, residualRpn: 10,
  } as any)
  useQmsStore.getState().createRisk(orgId, 'u_qm', {
    title: 'Erreur d\'étiquetage', category: 'Process', status: 'Mitigated',
    hazardDescription: 'Erreur sur étiquetage final (lot, date, produit)',
    riskOwner: 'Lucas Petit', regulatoryReference: 'ISO 13485 §7.5.1',
    controlType: 'protective_measures', verificationMethod: 'Double contrôle visuel',
    riskAcceptability: 'ALARP', priorityNotes: '',
    probability: 2, impact: 4, detectability: 3,
    mitigation: 'Vérification double contrôle + système caméra',
    residualRisk: 'Très faible', residualProbability: 1, residualImpact: 4, residualDetectability: 2, residualRpn: 8,
  } as any)
  useQmsStore.getState().createRisk(orgId, 'u_qm', {
    title: 'Défaillance logiciel embarqué', category: 'Product', status: 'Open',
    hazardDescription: 'Bug possible dans le logiciel de contrôle du DM-200',
    riskOwner: 'Marie Leroy', regulatoryReference: 'IEC 62304',
    controlType: 'inherent_safe_design', verificationMethod: 'Tests unitaires + validation IEC 62304',
    riskAcceptability: 'ALARP', priorityNotes: 'En cours d\'analyse',
    probability: 2, impact: 5, detectability: 4,
    mitigation: 'Tests unitaires + validation IEC 62304 en cours',
  } as any)

  // Seed trainings
  useQmsStore.getState().createTraining(orgId, 'u_qm', {
    title: 'Formation ISO 13485:2016', trainingType: 'Regulatory', status: 'Completed',
    assignedToId: 'u_op', dueDate: '2024-02-10', completedDate: '2024-02-10',
    description: 'Sensibilisation à la norme ISO 13485',
    metadata: { deliveryMethod: 'Classroom', trainer: 'Pierre Dubois', passingScore: 80, category: 'GMP' },
  } as any)
  useQmsStore.getState().createTraining(orgId, 'u_qm', {
    title: 'Gestion des risques ISO 14971', trainingType: 'Skill', status: 'Completed',
    assignedToId: 'u_qm', dueDate: '2024-03-01', completedDate: '2024-03-01',
    description: 'Analyse des risques produits selon ISO 14971',
    metadata: { deliveryMethod: 'Online', passingScore: 70, category: 'Quality' },
  } as any)
  useQmsStore.getState().createTraining(orgId, 'u_aud', {
    title: 'Audit interne - Techniques et méthodes', trainingType: 'Skill', status: 'Completed',
    assignedToId: 'u_aud', dueDate: '2024-01-20', completedDate: '2024-01-20',
    description: 'Formation aux techniques d\'audit interne',
    metadata: { deliveryMethod: 'Classroom', passingScore: 75, category: 'Quality' },
  } as any)
  useQmsStore.getState().createTraining(orgId, 'u_qm', {
    title: 'Formation IEC 62304 - Logiciels médicaux', trainingType: 'Technical' as any, status: 'Planned',
    assignedToId: 'u_dc', dueDate: '2024-12-15',
    description: 'Cycle de vie logiciel médical',
    metadata: { deliveryMethod: 'Webinar', category: 'GMP' },
  } as any)
  useQmsStore.getState().createTraining(orgId, 'u_qm', {
    title: 'Sécurité au travail - SST 2024', trainingType: 'Skill', status: 'In Progress',
    assignedToId: 'u_op', dueDate: '2024-09-30',
    description: 'Formation SST annuelle',
    metadata: { deliveryMethod: 'Blended', category: 'Safety' },
  } as any)

  // Seed batch records
  useQmsStore.getState().createBatchRecord(orgId, 'u_op', {
    lotNumber: 'LOT-2024-045', productName: 'DM-100 - Cathéter', productCode: 'DM-100',
    batchSize: '5000', batchSizeUnit: 'units', masterFormulaId: 'DL-001',
    sopReference: 'WI-PROD-001', manufacturingDate: '2024-09-01', expiryDate: '2027-09-01',
    status: 'Released', isLocked: true, qaReleaseDate: '2024-09-10', qaReleasedById: 'u_qm',
    steps: [
      { id: 's1', stepOrder: 1, stepName: 'Pesée matière première', expectedValue: '5000g', actualValue: '5000g', status: 'Completed', stepType: 'Weighing', operatorId: 'u_op', performedAt: '2024-09-01T08:00:00Z', signatureHash: 'STEP-HASH-1' },
      { id: 's2', stepOrder: 2, stepName: 'Mélange', expectedValue: '30min à 200rpm', actualValue: '30min à 200rpm', status: 'Completed', stepType: 'Mixing', operatorId: 'u_op', performedAt: '2024-09-01T09:00:00Z', signatureHash: 'STEP-HASH-2' },
      { id: 's3', stepOrder: 3, stepName: 'Contrôle QC', expectedValue: 'Conforme', actualValue: 'Conforme', status: 'Completed', stepType: 'QC Testing', operatorId: 'u_qm', performedAt: '2024-09-02T10:00:00Z', signatureHash: 'STEP-HASH-3' },
      { id: 's4', stepOrder: 4, stepName: 'Conditionnement', expectedValue: '5000 unités', actualValue: '5000 unités', status: 'Completed', stepType: 'Packaging', operatorId: 'u_op', performedAt: '2024-09-03T08:00:00Z', signatureHash: 'STEP-HASH-4' },
    ],
    rawMaterials: [
      { material: 'POLY-001', lotNumber: 'PAL-2024-08', supplier: 'Plasticorp SAS', status: 'Verified' },
      { material: 'ADD-002', lotNumber: 'ADD-2024-12', supplier: 'MedPack Solutions', status: 'Verified' },
    ],
  } as any)
  useQmsStore.getState().createBatchRecord(orgId, 'u_op', {
    lotNumber: 'LOT-2024-050', productName: 'DM-100 - Cathéter', productCode: 'DM-100',
    batchSize: '5000', batchSizeUnit: 'units', masterFormulaId: 'DL-001',
    sopReference: 'WI-PROD-001', manufacturingDate: '2024-09-20', expiryDate: '2027-09-20',
    status: 'Pending QA Review', isLocked: false,
    steps: [
      { id: 's5', stepOrder: 1, stepName: 'Pesée matière première', expectedValue: '5000g', actualValue: '5000g', status: 'Completed', stepType: 'Weighing', operatorId: 'u_op', performedAt: '2024-09-20T08:00:00Z' },
      { id: 's6', stepOrder: 2, stepName: 'Mélange', expectedValue: '30min à 200rpm', actualValue: '32min à 195rpm', status: 'Completed', stepType: 'Mixing', operatorId: 'u_op', performedAt: '2024-09-20T09:00:00Z' },
      { id: 's7', stepOrder: 3, stepName: 'Inspection visuelle', expectedValue: '0 défaut', actualValue: 'En cours', status: 'In Progress', stepType: 'Inspection', operatorId: 'u_op' },
    ],
    rawMaterials: [
      { material: 'POLY-001', lotNumber: 'PAL-2024-10', supplier: 'Plasticorp SAS', status: 'Pending' },
    ],
  } as any)

  // Seed suppliers
  useQmsStore.getState().createSupplier(orgId, 'u_qm', {
    supplierCode: 'SUP-001', name: 'Plasticorp SAS', category: 'Raw Material', status: 'Qualified',
    qualificationDate: '2024-01-15', nextReviewDate: '2026-01-15',
    certifications: ['ISO 13485:2016', 'ISO 9001:2015'], performanceScore: 92,
    qualificationMethod: 'On-Site Audit', qualificationDocRef: 'AUD-2024-001',
    website: 'https://plasticorp.fr', primaryContactName: 'Marc Petit', primaryContactEmail: 'contact@plasticorp.fr', primaryContactPhone: '+33 4 78 00 00 00',
    street: '15 rue des Polymères', city: 'Lyon', stateProvince: 'Rhône', postalCode: '69000', country: 'France',
    emergencyContactName: 'Marc Petit', emergencyContactPhone: '+33 6 00 00 00 00',
    notes: 'Fournisseur stratégique certifié ISO 13485',
  } as any)
  useQmsStore.getState().createSupplier(orgId, 'u_qm', {
    supplierCode: 'SUP-002', name: 'MedPack Solutions', category: 'Packaging', status: 'Qualified',
    qualificationDate: '2024-02-01', nextReviewDate: '2026-02-01',
    certifications: ['ISO 13485:2016', 'ISO 11607'], performanceScore: 85,
    qualificationMethod: 'Questionnaire', qualificationDocRef: 'QUAL-2024-002',
    primaryContactName: 'Laura Garcia', primaryContactEmail: 'sales@medpack.com', primaryContactPhone: '+33 1 42 00 00 00',
    city: 'Paris', country: 'France',
    notes: 'Bon fournisseur d\'emballages stériles',
  } as any)
  useQmsStore.getState().createSupplier(orgId, 'u_qm', {
    supplierCode: 'SUP-003', name: 'TechComponents Ltd', category: 'Equipment', status: 'Conditional',
    qualificationDate: '2024-05-10', nextReviewDate: '2024-11-10',
    certifications: ['ISO 9001:2015'], performanceScore: 65,
    qualificationMethod: 'Certificate Review',
    website: 'https://techcomponents.com', primaryContactName: 'John Smith', primaryContactEmail: 'info@techcomponents.com', primaryContactPhone: '+44 20 7000 0000',
    city: 'London', country: 'UK',
    notes: 'À ré-évaluer suite à retard de livraison',
  } as any)
  useQmsStore.getState().createSupplier(orgId, 'u_qm', {
    supplierCode: 'SUP-004', name: 'LogiTrans', category: 'Service', status: 'Under Evaluation',
    certifications: [], qualificationMethod: 'Historical Performance',
    primaryContactName: 'Ahmed Benali', primaryContactEmail: 'contact@logitrans.fr', primaryContactPhone: '+33 4 91 00 00 00',
    city: 'Marseille', country: 'France',
    notes: 'Nouveau fournisseur transport en cours d\'évaluation',
  } as any)

  // Seed record links (showing cross-module interactions)
  // CAPA1 caused_by NCR1, NCR1 corrected_by CAPA1
  useQmsStore.getState().createRecordLink(orgId, 'u_qm', {
    sourceRecordId: capa1.id, sourceRecordType: 'capa',
    targetRecordId: ncr1.id, targetRecordType: 'ncr',
    linkType: 'caused_by', description: 'CAPA causée par cette NCR',
  } as any)
  useQmsStore.getState().createRecordLink(orgId, 'u_qm', {
    sourceRecordId: ncr1.id, sourceRecordType: 'ncr',
    targetRecordId: capa1.id, targetRecordType: 'capa',
    linkType: 'corrected_by', description: 'NCR corrigée par cette CAPA',
  } as any)
  // NCR2 → CAPA2
  useQmsStore.getState().createRecordLink(orgId, 'u_qm', {
    sourceRecordId: ncr2.id, sourceRecordType: 'ncr',
    targetRecordId: capa2.id, targetRecordType: 'capa',
    linkType: 'corrected_by', description: 'NCR corrigée par CAPA',
  } as any)
  // NCR3 → CAPA3
  useQmsStore.getState().createRecordLink(orgId, 'u_qm', {
    sourceRecordId: ncr3.id, sourceRecordType: 'ncr',
    targetRecordId: capa3.id, targetRecordType: 'capa',
    linkType: 'corrected_by', description: 'Réclamation traitée par CAPA préventive',
  } as any)
  // CAPA1 linked_to Document PR-8.5.2 (procédure CAPA)
  const docCapaProc = useQmsStore.getState().documents.find(d => d.documentNumber === 'PR-8.5.2')
  if (docCapaProc) {
    useQmsStore.getState().createRecordLink(orgId, 'u_qm', {
      sourceRecordId: capa1.id, sourceRecordType: 'capa',
      targetRecordId: docCapaProc.id, targetRecordType: 'document',
      linkType: 'references', description: 'CAPA suit la procédure PR-8.5.2',
    } as any)
  }
  // CAPA3 derived_from CAPA1 (CAPA préventive dérivée d'une CAPA corrective)
  useQmsStore.getState().createRecordLink(orgId, 'u_qm', {
    sourceRecordId: capa3.id, sourceRecordType: 'capa',
    targetRecordId: capa1.id, targetRecordType: 'capa',
    linkType: 'derived_from', description: 'CAPA préventive dérivée de la CAPA corrective initiale',
  } as any)

  console.log('[QMS] Demo data seeded successfully')
}

// Internal setter helper to bypass action layer for bulk seeds
function setInternal(patch: Partial<QmsState>) {
  useQmsStore.setState(patch as any)
}

// ============================================================================
// Slug/name/icon/description/compliance helpers for system record types
// ============================================================================
function slugToName(slug: string): string {
  const map: Record<string, string> = {
    capa: 'CAPA', ncr: 'Non-Conformité', deviation: 'Déviation',
    change_control: 'Contrôle des Changements', audit: 'Audit',
    risk: 'Risque', training: 'Formation', supplier: 'Fournisseur',
    batch_record: 'Dossier de Lot', oos_oot: 'OOS/OOT',
  }
  return map[slug] || slug
}
function slugIcon(slug: string): string {
  const map: Record<string, string> = {
    capa: 'Shield', ncr: 'AlertTriangle', deviation: 'AlertOctagon',
    change_control: 'ArrowLeftRight', audit: 'ClipboardCheck',
    risk: 'BarChart3', training: 'GraduationCap', supplier: 'Truck',
    batch_record: 'Package', oos_oot: 'FlaskConical',
  }
  return map[slug] || 'FileText'
}
function slugDescription(slug: string): string {
  const map: Record<string, string> = {
    capa: 'Actions Correctives et Préventives (ISO 13485 §8.5.2 / §8.5.3)',
    ncr: 'Non-Conformités produit et processus (ISO 13485 §8.3)',
    deviation: 'Déviations planifiées et non planifiées (ISO 13485 §7.1)',
    change_control: 'Contrôle des Changements (ISO 13485 §7.3.7 / §8.5.1)',
    audit: 'Audits internes et externes (ISO 13485 §8.2.4)',
    risk: 'Gestion des Risques (ISO 14971 + ISO 13485 §7.1)',
    training: 'Formations et compétences (ISO 13485 §6.2)',
    supplier: 'Fournisseurs et achats (ISO 13485 §7.4)',
    batch_record: 'Dossiers de Lot et traçabilité (ISO 13485 §7.5.1 / §7.5.9)',
    oos_oot: 'Hors Spécification / Hors Tendance (ISO 13485 §8.2.6)',
  }
  return map[slug] || ''
}
function slugComplianceRefs(slug: string): ComplianceRef[] {
  const map: Record<string, ComplianceRef[]> = {
    capa: [{ standard: 'ISO 13485', clause: '8.5.2', description: 'Action corrective' }, { standard: 'ISO 13485', clause: '8.5.3', description: 'Action préventive' }],
    ncr: [{ standard: 'ISO 13485', clause: '8.3', description: 'Maîtrise du produit non conforme' }],
    deviation: [{ standard: 'ISO 13485', clause: '7.1', description: 'Planification de la réalisation' }],
    change_control: [{ standard: 'ISO 13485', clause: '7.3.7', description: 'Maîtrise des modifications' }],
    audit: [{ standard: 'ISO 13485', clause: '8.2.4', description: 'Audit interne' }],
    risk: [{ standard: 'ISO 14971', clause: '5.4', description: 'Identification des dangers' }, { standard: 'ISO 13485', clause: '7.1', description: 'Planification (risques)' }],
    training: [{ standard: 'ISO 13485', clause: '6.2', description: 'Ressources humaines' }],
    supplier: [{ standard: 'ISO 13485', clause: '7.4', description: 'Achats' }],
    batch_record: [{ standard: 'ISO 13485', clause: '7.5.1', description: 'Maîtrise de la production' }, { standard: 'ISO 13485', clause: '7.5.9', description: 'Traçabilité' }],
    oos_oot: [{ standard: 'ISO 13485', clause: '8.2.6', description: 'Surveillance et mesure du produit' }],
  }
  return map[slug] || []
}

// Re-export for convenience
export { rolePermissions }
