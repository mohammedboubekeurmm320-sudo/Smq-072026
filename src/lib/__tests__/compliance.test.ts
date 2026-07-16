// ============================================================================
// Tests unitaires — Compliance Checklists & Scoring
// Critique: le score de conformite est utilise par les rapports et le dashboard
// ============================================================================

import { describe, it, expect } from 'vitest'
import { buildComplianceData, CHECKLISTS, statusFromPct } from '@/lib/compliance-checklists'

// ─── statusFromPct ─────────────────────────────────────────────────────────

describe('statusFromPct', () => {
  it('retourne "compliant" pour >= 80%', () => {
    expect(statusFromPct(80)).toBe('compliant')
    expect(statusFromPct(100)).toBe('compliant')
  })

  it('retourne "partially" pour >= 50% et < 80%', () => {
    expect(statusFromPct(50)).toBe('partially')
    expect(statusFromPct(79)).toBe('partially')
  })

  it('retourne "non_compliant" pour > 0 et < 50%', () => {
    expect(statusFromPct(1)).toBe('non_compliant')
    expect(statusFromPct(49)).toBe('non_compliant')
  })

  it('retourne "not_assessed" pour 0%', () => {
    expect(statusFromPct(0)).toBe('not_assessed')
  })
})

// ─── buildComplianceData ───────────────────────────────────────────────────

describe('buildComplianceData', () => {
  it('construit des donnees avec des tableaux vides', () => {
    const data = buildComplianceData({
      documents: [],
      capas: [],
      ncrs: [],
      audits: [],
      training: [],
      risks: [],
      batchRecords: [],
      suppliers: [],
      changeControls: [],
      deviations: [],
    })

    expect(data.totalDocCount).toBe(0)
    expect(data.approvedDocCount).toBe(0)
    expect(data.totalCapa).toBe(0)
    expect(data.closedCapa).toBe(0)
  })

  it('compte correctement les documents approuves', () => {
    const data = buildComplianceData({
      documents: [
        { status: 'Effective' },
        { status: 'Draft' },
        { status: 'Approved' },
        { status: 'Under Review' },
      ],
      capas: [],
      ncrs: [],
      audits: [],
      training: [],
      risks: [],
      batchRecords: [],
      suppliers: [],
      changeControls: [],
      deviations: [],
    })

    expect(data.totalDocCount).toBe(4)
    expect(data.approvedDocCount).toBe(2) // Effective + Approved
  })

  it('compte correctement les CAPAs fermees', () => {
    const data = buildComplianceData({
      documents: [],
      capas: [
        { status: 'Open' },
        { status: 'In Progress' },
        { status: 'Closed' },
        { status: 'Closed' },
      ],
      ncrs: [],
      audits: [],
      training: [],
      risks: [],
      batchRecords: [],
      suppliers: [],
      changeControls: [],
      deviations: [],
    })

    expect(data.totalCapa).toBe(4)
    expect(data.closedCapa).toBe(2)
  })

  it('compte correctement les risques ouverts', () => {
    const data = buildComplianceData({
      documents: [],
      capas: [],
      ncrs: [],
      audits: [],
      training: [],
      risks: [
        { status: 'Open' },
        { status: 'Open' },
        { status: 'Mitigated' },
        { status: 'Closed' },
      ],
      batchRecords: [],
      suppliers: [],
      changeControls: [],
      deviations: [],
    })

    expect(data.totalRisk).toBe(4)
    expect(data.openRisk).toBe(2)
  })
})

// ─── CHECKLISTS structure ──────────────────────────────────────────────────

describe('CHECKLISTS', () => {
  it('contient les 3 normes attendues', () => {
    const ids = CHECKLISTS.map(c => c.id)
    expect(ids).toContain('iso13485')
    expect(ids).toContain('ichq10')
    expect(ids).toContain('ivdr')
  })

  it('chaque checklist a des clauses', () => {
    for (const cl of CHECKLISTS) {
      expect(cl.clauses.length).toBeGreaterThan(0)
    }
  })

  it('ISO 13485 a au moins 15 clauses (couverture complete)', () => {
    const iso = CHECKLISTS.find(c => c.id === 'iso13485')
    expect(iso).toBeDefined()
    expect(iso!.clauses.length).toBeGreaterThanOrEqual(15)
  })
})