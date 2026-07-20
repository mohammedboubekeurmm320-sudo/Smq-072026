// ============================================================================
// Tests unitaires — Status Flows
// Critique: les transitions de statut sont critiques pour la conformite QMS
// ============================================================================

import { describe, it, expect } from 'vitest'
import {
  FALLBACK_STATUS_FLOWS,
  type StatusFlowDefinition,
} from '@/types/qms'
import {
  getNextStatuses,
  canTransition,
  isTerminalStatus,
  isESigRequired,
  getFlowSteps,
  getWorkflowKey,
} from '@/lib/status-flows'

// Helper to check if a transition is valid
function isValidTransition(flow: StatusFlowDefinition, from: string, to: string): boolean {
  // Check linear flow
  const fromIdx = flow.linear.indexOf(from)
  if (fromIdx !== -1) {
    const nextInLinear = flow.linear[fromIdx + 1]
    if (nextInLinear === to) return true
  }
  // Check branches
  const branchTargets = flow.branches[from]
  if (branchTargets && branchTargets.includes(to)) return true
  return false
}

describe('FALLBACK_STATUS_FLOWS structure', () => {
  it('contient tous les types d enregistrement systeme', () => {
    const slugs = Object.keys(FALLBACK_STATUS_FLOWS)
    expect(slugs).toContain('capa')
    expect(slugs).toContain('ncr')
    expect(slugs).toContain('deviation')
    expect(slugs).toContain('change_control')
    expect(slugs).toContain('audit')
    expect(slugs).toContain('risk')
    expect(slugs).toContain('training')
    expect(slugs).toContain('supplier')
    expect(slugs).toContain('batch_record')
    expect(slugs).toContain('oos_oot')
  })

  it('chaque flow a un statut initial dans linear[0]', () => {
    for (const [slug, flow] of Object.entries(FALLBACK_STATUS_FLOWS)) {
      expect(flow.linear.length).toBeGreaterThan(0)
      expect(flow.terminal.length).toBeGreaterThan(0)
    }
  })

  it('les statuts terminaux sont definis comme points finaux', () => {
    for (const [slug, flow] of Object.entries(FALLBACK_STATUS_FLOWS)) {
      expect(flow.terminal.length).toBeGreaterThan(0)
      // Every terminal status should appear somewhere in the linear flow
      // (Rejected is an exception — it's a branch-from status that's also terminal)
      for (const terminal of flow.terminal) {
        const inLinear = flow.linear.includes(terminal)
        const isBranchOrigin = !!flow.branches[terminal]
        // Either it's in the linear flow, or it's a branch origin (like Rejected)
        const isReachable = inLinear || isBranchOrigin ||
          // Or it appears as a target in some branch
          Object.values(flow.branches).some(targets => targets.includes(terminal))
        expect(isReachable).toBe(true)
      }
    }
  })

  it('les eSig sont definis pour les statuts critiques', () => {
    // Au minimum, chaque flow devrait avoir des eSig pour au moins un statut
    for (const [slug, flow] of Object.entries(FALLBACK_STATUS_FLOWS)) {
      expect(flow.eSigRequired.length).toBeGreaterThan(0)
    }
  })
})

describe('CAPA status flow', () => {
  const flow = FALLBACK_STATUS_FLOWS.capa

  it('Open → Investigation est valide', () => {
    expect(isValidTransition(flow, 'Open', 'Investigation')).toBe(true)
  })

  it('Closed est terminal', () => {
    expect(flow.terminal).toContain('Closed')
  })

  it('ne permet pas de sauter Open → Closed directement', () => {
    expect(isValidTransition(flow, 'Open', 'Closed')).toBe(false)
  })

  it('Closed requiert une signature electronique', () => {
    expect(flow.eSigRequired).toContain('Closed')
  })
})

describe('Change Control status flow', () => {
  const flow = FALLBACK_STATUS_FLOWS.change_control

  it('a une branche de rejet', () => {
    expect(flow.branches['Rejected']).toBeDefined()
    expect(flow.branches['Rejected']).toContain('Requested')
  })

  it('Requested → Under Review est valide', () => {
    expect(isValidTransition(flow, 'Requested', 'Under Review')).toBe(true)
  })

  it('Completed et Rejected sont terminaux', () => {
    expect(flow.terminal).toContain('Completed')
    expect(flow.terminal).toContain('Rejected')
  })
})

describe('Audit status flow', () => {
  const flow = FALLBACK_STATUS_FLOWS.audit

  it('a 3 etapes lineaires', () => {
    expect(flow.linear).toEqual(['Planned', 'In Progress', 'Completed'])
  })

  it('Completed est terminal et requiert eSig', () => {
    expect(flow.terminal).toContain('Completed')
    expect(flow.eSigRequired).toContain('Completed')
  })
})

describe('Risk status flow', () => {
  const flow = FALLBACK_STATUS_FLOWS.risk

  it('peut passer de Mitigated a Closed', () => {
    expect(isValidTransition(flow, 'Mitigated', 'Closed')).toBe(true)
  })

  it('peut passer de Open a Accepted puis Closed', () => {
    expect(flow.branches['Accepted']).toBeDefined()
    expect(flow.branches['Accepted']).toContain('Closed')
  })
})

// Test STATUS_FLOWS coherence — getWorkflowKey maps all known slugs

describe('getWorkflowKey', () => {
  it('mappe les slugs URL vers les cles de workflow', () => {
    expect(getWorkflowKey('capas')).toBe('capa')
    expect(getWorkflowKey('ncrs')).toBe('ncr')
    expect(getWorkflowKey('deviations')).toBe('deviation')
    expect(getWorkflowKey('change-controls')).toBe('change_control')
    expect(getWorkflowKey('audits')).toBe('audit')
    expect(getWorkflowKey('risks')).toBe('risk')
    expect(getWorkflowKey('training')).toBe('training')
    expect(getWorkflowKey('batch-records')).toBe('batch_record')
    expect(getWorkflowKey('suppliers')).toBe('supplier')
  })

  it('retourne le slug tel quel si non mappe', () => {
    expect(getWorkflowKey('custom-type')).toBe('custom-type')
  })
})

describe('getNextStatuses', () => {
  it('CAPA Open → [Investigation]', () => {
    expect(getNextStatuses('capas', 'Open')).toContain('Investigation')
  })

  it('CAPA Closed → [] (terminal)', () => {
    expect(getNextStatuses('capas', 'Closed')).toEqual([])
  })

  it('Change Control Rejected → [Requested] (branche inverse)', () => {
    expect(getNextStatuses('change-controls', 'Rejected')).toContain('Requested')
  })
})

describe('canTransition', () => {
  it('autorise Open → Investigation pour un admin', () => {
    const result = canTransition('capas', 'Open', 'Investigation', 'admin')
    expect(result.allowed).toBe(true)
  })

  it('bloque une transition invalide', () => {
    const result = canTransition('capas', 'Open', 'Closed', 'admin')
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('non autorisée')
  })

  it('exige eSig pour les roles non autorises', () => {
    const result = canTransition('capas', 'Effectiveness Check', 'Closed', 'operator')
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('Signature électronique')
  })

  it('autorise eSig pour admin', () => {
    const result = canTransition('capas', 'Effectiveness Check', 'Closed', 'admin')
    expect(result.allowed).toBe(true)
    expect(result.requiresESignature).toBe(true)
  })
})

describe('isTerminalStatus', () => {
  it('Closed est terminal pour CAPA', () => {
    expect(isTerminalStatus('capas', 'Closed')).toBe(true)
  })

  it('Open n est pas terminal pour CAPA', () => {
    expect(isTerminalStatus('capas', 'Open')).toBe(false)
  })
})

describe('isESigRequired', () => {
  it('Closed requiert eSig pour CAPA', () => {
    expect(isESigRequired('capas', 'Closed')).toBe(true)
  })

  it('Open ne requiert pas eSig pour CAPA', () => {
    expect(isESigRequired('capas', 'Open')).toBe(false)
  })
})

describe('getFlowSteps', () => {
  it('retourne les etapes du flow CAPA avec le statut courant marque', () => {
    const steps = getFlowSteps('capas', 'Investigation')
    expect(steps.length).toBe(5)
    const current = steps.find(s => s.isCurrent)
    expect(current?.status).toBe('Investigation')
  })

  it('marque les statuts terminaux', () => {
    const steps = getFlowSteps('capas', 'Open')
    const terminal = steps.find(s => s.isTerminal)
    expect(terminal?.status).toBe('Closed')
  })
})
