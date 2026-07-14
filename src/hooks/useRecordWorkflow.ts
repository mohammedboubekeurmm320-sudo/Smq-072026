'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiPost } from '@/lib/api-client'
import { useAuth } from '@/contexts/AuthContext'
import {
  canTransition,
  getNextStatuses,
  getPrimaryNextStatus,
  isESigRequired,
  isTerminalStatus,
  getFlowSteps,
  getWorkflowKey,
} from '@/lib/status-flows'
import type { TransitionResult, UserRole } from '@/lib/status-flows'

export type { TransitionResult }

export interface TransitionPayload {
  targetStatus: string
  signatureHash?: string
  reason?: string
}

export function useRecordWorkflow(entitySlug: string, recordId: string, currentStatus: string) {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const userRole = (profile?.role || 'operator') as UserRole

  // Transition mutation
  const transitionMutation = useMutation({
    mutationFn: async (payload: TransitionPayload) => {
      return apiPost(`/api/qms/${entitySlug}/${recordId}/transition`, {
        targetStatus: payload.targetStatus,
        signatureHash: payload.signatureHash,
        reason: payload.reason,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qms', entitySlug] })
    },
  })

  const checkTransition = (targetStatus: string): TransitionResult => {
    return canTransition(entitySlug, currentStatus, targetStatus, userRole)
  }

  const performTransition = async (targetStatus: string, signatureHash?: string, reason?: string) => {
    const check = canTransition(entitySlug, currentStatus, targetStatus, userRole)
    if (!check.allowed) {
      throw new Error(check.reason || 'Transition non autorisée')
    }

    return transitionMutation.mutateAsync({
      targetStatus,
      signatureHash,
      reason,
    })
  }

  return {
    currentStatus,
    userRole,
    getNextStatuses: () => getNextStatuses(entitySlug, currentStatus),
    getPrimaryNextStatus: () => getPrimaryNextStatus(entitySlug, currentStatus),
    checkTransition,
    isESigRequired: (target: string) => isESigRequired(entitySlug, target),
    isTerminal: () => isTerminalStatus(entitySlug, currentStatus),
    getFlowSteps: () => getFlowSteps(entitySlug, currentStatus),
    performTransition,
    isTransitioning: transitionMutation.isPending,
    transitionError: transitionMutation.error,
  }
}