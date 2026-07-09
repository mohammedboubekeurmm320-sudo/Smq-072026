'use client'

import { useMemo } from 'react'
import { useQmsStore } from '@/lib/demo-store'
import { FALLBACK_STATUS_FLOWS, type StatusFlowDefinition, type UserRole, FORM_TEMPLATE_TRANSITIONS, type FormTemplateStatus } from '@/types/qms'

export interface TransitionResult {
  allowed: boolean
  reason?: string
  nextStatus?: string
  requiresESignature?: boolean
}

export function useRecordWorkflow() {
  const recordTypes = useQmsStore(s => s.recordTypeDefinitions)

  const getStatusFlow = (slug: string): StatusFlowDefinition => {
    // Try to load from store (custom flows)
    const rt = recordTypes.find(r => r.slug === slug)
    if (rt && rt.statusFlow && rt.statusFlow.length > 0) {
      const linear = rt.statusFlow.map(s => s.status)
      const eSigRequired = rt.statusFlow.filter(s => s.requiresESignature).map(s => s.status)
      // For system types, fallback branches/terminal from FALLBACK_STATUS_FLOWS
      const fallback = FALLBACK_STATUS_FLOWS[slug as keyof typeof FALLBACK_STATUS_FLOWS]
      return {
        linear,
        branches: fallback?.branches || {},
        eSigRequired,
        terminal: fallback?.terminal || [linear[linear.length - 1]],
      }
    }
    return FALLBACK_STATUS_FLOWS[slug as keyof typeof FALLBACK_STATUS_FLOWS] || FALLBACK_STATUS_FLOWS.general
  }

  const getNextStatuses = (slug: string, currentStatus: string): string[] => {
    const flow = getStatusFlow(slug)
    const idx = flow.linear.indexOf(currentStatus)
    const next: string[] = []
    if (idx >= 0 && idx < flow.linear.length - 1) next.push(flow.linear[idx + 1])
    // Branches
    if (flow.branches[currentStatus]) next.push(...flow.branches[currentStatus])
    // Reverse branches (e.g., Rejected can go back to Requested)
    for (const [from, tos] of Object.entries(flow.branches)) {
      if (tos.includes(currentStatus) && !next.includes(from)) next.push(from)
    }
    return next
  }

  const canTransition = (slug: string, currentStatus: string, targetStatus: string, userRole: UserRole): TransitionResult => {
    const next = getNextStatuses(slug, currentStatus)
    if (!next.includes(targetStatus)) {
      return { allowed: false, reason: `Transition non autorisée de "${currentStatus}" à "${targetStatus}". Transitions possibles: ${next.join(', ') || 'aucune'}` }
    }
    const flow = getStatusFlow(slug)
    const requiresESig = flow.eSigRequired.includes(targetStatus)
    // E-sig statuses require admin or quality_manager
    if (requiresESig && !['admin', 'quality_manager'].includes(userRole)) {
      return { allowed: false, reason: 'Signature électronique requise — rôle admin ou quality_manager nécessaire' }
    }
    return { allowed: true, requiresESignature: requiresESig, nextStatus: targetStatus }
  }

  const getPrimaryNextStatus = (slug: string, currentStatus: string): string | undefined => {
    const next = getNextStatuses(slug, currentStatus)
    return next[0]
  }

  const isESigRequired = (slug: string, targetStatus: string): boolean => {
    const flow = getStatusFlow(slug)
    return flow.eSigRequired.includes(targetStatus)
  }

  const isTerminal = (slug: string, status: string): boolean => {
    const flow = getStatusFlow(slug)
    return flow.terminal.includes(status)
  }

  const moduleTypeLabels = useMemo(() => {
    const map: Record<string, string> = {}
    for (const rt of recordTypes) map[rt.slug] = rt.name
    return map
  }, [recordTypes])

  return {
    recordTypes,
    isLoadingRecordTypes: false,
    getStatusFlow,
    getNextStatuses,
    canTransition,
    getPrimaryNextStatus,
    isESigRequired,
    isTerminal,
    moduleTypeLabels,
  }
}

// Form template transitions (Layer 1) — used outside React hooks context too
export function getFormTemplateNextStatuses(current: FormTemplateStatus): FormTemplateStatus[] {
  return FORM_TEMPLATE_TRANSITIONS[current] || []
}

export function canTransitionFormTemplate(current: FormTemplateStatus, target: FormTemplateStatus, role: UserRole): boolean {
  const allowed = FORM_TEMPLATE_TRANSITIONS[current] || []
  if (!allowed.includes(target)) return false
  const key = `${current}→${target}`
  const roles = (FORM_TEMPLATE_TRANSITIONS as any)[key] as UserRole[] | undefined
  // We use a separate map
  const roleMap: Record<string, UserRole[]> = {
    'Draft→Under_Review': ['admin', 'quality_manager', 'document_controller'],
    'Under_Review→Approved': ['admin', 'quality_manager'],
    'Under_Review→Draft': ['admin', 'quality_manager', 'document_controller'],
    'Approved→Obsolete': ['admin', 'quality_manager'],
    'Approved→Draft': ['admin', 'quality_manager'],
  }
  return roleMap[key]?.includes(role) ?? false
}
