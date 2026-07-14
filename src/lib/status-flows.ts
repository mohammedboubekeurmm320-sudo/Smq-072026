// ============================================================================
// Status Flow Definitions — ISO 13485 QMS Workflow Engine
// Adapted for API-driven architecture (no Zustand dependency)
// ============================================================================

import { FALLBACK_STATUS_FLOWS, type StatusFlowDefinition, type UserRole } from '@/types/qms'

// Map entity slugs (URL) → record type slugs (workflow keys)
const SLUG_TO_WORKFLOW_KEY: Record<string, string> = {
  capas: 'capa',
  ncrs: 'ncr',
  deviations: 'deviation',
  'change-controls': 'change_control',
  audits: 'audit',
  risks: 'risk',
  training: 'training',
  'batch-records': 'batch_record',
  suppliers: 'supplier',
}

/** Get the workflow key for a given URL entity slug */
export function getWorkflowKey(entitySlug: string): string {
  return SLUG_TO_WORKFLOW_KEY[entitySlug] || entitySlug
}

/** Get the status flow definition for a given entity slug */
export function getStatusFlow(entitySlug: string): StatusFlowDefinition {
  const key = getWorkflowKey(entitySlug)
  return FALLBACK_STATUS_FLOWS[key] || FALLBACK_STATUS_FLOWS.general
}

/** Get all possible next statuses from the current status */
export function getNextStatuses(entitySlug: string, currentStatus: string): string[] {
  const flow = getStatusFlow(entitySlug)
  const next: string[] = []

  // Linear forward transition
  const idx = flow.linear.indexOf(currentStatus)
  if (idx >= 0 && idx < flow.linear.length - 1) {
    next.push(flow.linear[idx + 1])
  }

  // Branch transitions from current status
  if (flow.branches[currentStatus]) {
    next.push(...flow.branches[currentStatus])
  }

  // Reverse branches (e.g., Rejected → Requested)
  for (const [from, tos] of Object.entries(flow.branches)) {
    if (tos.includes(currentStatus) && !next.includes(from)) {
      next.push(from)
    }
  }

  return next
}

export interface TransitionResult {
  allowed: boolean
  reason?: string
  requiresESignature?: boolean
  nextStatus?: string
}

/** Check if a status transition is allowed */
export function canTransition(
  entitySlug: string,
  currentStatus: string,
  targetStatus: string,
  userRole: UserRole
): TransitionResult {
  const next = getNextStatuses(entitySlug, currentStatus)

  if (!next.includes(targetStatus)) {
    return {
      allowed: false,
      reason: `Transition non autorisée de "${currentStatus}" à "${targetStatus}". Transitions possibles : ${next.join(', ') || 'aucune'}`,
    }
  }

  const flow = getStatusFlow(entitySlug)
  const requiresESig = flow.eSigRequired.includes(targetStatus)

  if (requiresESig && !['admin', 'quality_manager'].includes(userRole)) {
    return {
      allowed: false,
      reason: 'Signature électronique requise — rôle admin ou quality_manager nécessaire',
    }
  }

  return { allowed: true, requiresESignature: requiresESig, nextStatus: targetStatus }
}

/** Get the primary (linear) next status */
export function getPrimaryNextStatus(entitySlug: string, currentStatus: string): string | undefined {
  const next = getNextStatuses(entitySlug, currentStatus)
  return next[0]
}

/** Check if e-signature is required for a target status */
export function isESigRequired(entitySlug: string, targetStatus: string): boolean {
  const flow = getStatusFlow(entitySlug)
  return flow.eSigRequired.includes(targetStatus)
}

/** Check if a status is terminal (no further transitions) */
export function isTerminalStatus(entitySlug: string, status: string): boolean {
  const flow = getStatusFlow(entitySlug)
  return flow.terminal.includes(status)
}

/** Get the full linear flow as an array of { status, index, isCurrent, isTerminal } */
export function getFlowSteps(entitySlug: string, currentStatus: string) {
  const flow = getStatusFlow(entitySlug)
  return flow.linear.map((status, index) => ({
    status,
    index,
    isCurrent: status === currentStatus,
    isTerminal: flow.terminal.includes(status),
    requiresESig: flow.eSigRequired.includes(status),
    isCompleted: flow.linear.indexOf(currentStatus) > index,
  }))
}

/** Map entity slug to Supabase table name for record_links */
export function getRecordTypeFromSlug(entitySlug: string): string {
  const map: Record<string, string> = {
    capas: 'capa',
    ncrs: 'ncr',
    deviations: 'deviation',
    'change-controls': 'change_control',
    audits: 'audit',
    risks: 'risk',
    training: 'training',
    'batch-records': 'batch_record',
    suppliers: 'supplier',
    documents: 'document',
  }
  return map[entitySlug] || entitySlug
}