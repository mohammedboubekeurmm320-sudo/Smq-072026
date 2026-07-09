export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'QUALITY_MANAGER' | 'ENGINEER' | 'AUDITOR' | 'VIEWER'

export interface SessionUser {
  id: string
  email: string
  name: string
  role: Role
  organizationId: string
  organizationName?: string
  position?: string | null
  department?: string | null
}

export interface DocumentItem {
  id: string
  code: string
  title: string
  version: string
  status: string
  category: string
  summary?: string | null
  content?: string | null
  ownerId?: string | null
  reviewerId?: string | null
  approverId?: string | null
  effectiveDate?: string | null
  nextReviewDate?: string | null
  createdAt: string
  updatedAt: string
  owner?: { id: string; name: string } | null
  reviewer?: { id: string; name: string } | null
  approver?: { id: string; name: string } | null
}

export interface RiskItem {
  id: string
  title: string
  description?: string | null
  process?: string | null
  hazard?: string | null
  severity: number
  probability: number
  detectability: number
  rpn: number
  mitigation?: string | null
  status: string
  ownerId?: string | null
  owner?: { id: string; name: string } | null
}

export interface AuditItem {
  id: string
  title: string
  type: string
  scope?: string | null
  plannedDate?: string | null
  conductedDate?: string | null
  status: string
  findings?: string | null
  conclusion?: string | null
  leadAuditorId?: string | null
  leadAuditor?: { id: string; name: string } | null
}

export interface NonconformityItem {
  id: string
  reference: string
  title: string
  description?: string | null
  source: string
  severity: string
  status: string
  ownerId?: string | null
  owner?: { id: string; name: string } | null
  detectedDate?: string | null
  closedDate?: string | null
  capas?: { id: string; reference: string; title: string; status: string }[]
}

export interface CapaItem {
  id: string
  reference: string
  type: string
  title: string
  description?: string | null
  rootCause?: string | null
  action?: string | null
  dueDate?: string | null
  completedDate?: string | null
  status: string
  ownerId?: string | null
  nonconformityId?: string | null
  owner?: { id: string; name: string } | null
  nonconformity?: { id: string; reference: string; title: string } | null
}

export interface TrainingItem {
  id: string
  userId: string
  name: string
  description?: string | null
  category: string
  conductedDate?: string | null
  completedDate?: string | null
  status: string
  score?: number | null
  user?: { id: string; name: string; position?: string | null; department?: string | null }
}

export interface SupplierItem {
  id: string
  name: string
  contactName?: string | null
  email?: string | null
  phone?: string | null
  category?: string | null
  evaluation: string
  evaluationDate?: string | null
  riskLevel: string
  notes?: string | null
}

export interface ProcessItem {
  id: string
  name: string
  description?: string | null
  type: string
  ownerId?: string | null
  inputs?: string | null
  outputs?: string | null
  kpi?: string | null
  status: string
  owner?: { id: string; name: string } | null
}

export interface OrgUser {
  id: string
  name: string
  email: string
  role: Role
  position?: string | null
  department?: string | null
  active: boolean
  lastLoginAt?: string | null
  createdAt: string
}

export interface StandardItem {
  id: string
  code: string
  name: string
  version: string
  description?: string | null
}

export interface OrgStandardItem extends StandardItem {
  certified: boolean
  certifiedAt?: string | null
}

export interface DashboardData {
  user: SessionUser
  organization: { id: string; name: string }
  standards: OrgStandardItem[]
  kpis: {
    documents: { total: number; byStatus: Record<string, number>; byCategory: Record<string, number>; toReview: number }
    risks: { total: number; high: number; medium: number; low: number }
    audits: { total: number; planned: number; completed: number }
    nonconformities: { total: number; open: number; bySeverity: Record<string, number>; byStatus: Record<string, number> }
    capas: { total: number; open: number; overdue: number; byStatus: Record<string, number> }
    trainings: { total: number; completed: number; planned: number }
    suppliers: { total: number; approved: number }
    processes: { total: number }
    users: { total: number; active: number }
  }
  recent: { type: string; title: string; code: string; at: string }[]
  users: OrgUser[]
}
