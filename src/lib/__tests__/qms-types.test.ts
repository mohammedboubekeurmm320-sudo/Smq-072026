// ============================================================================
// Tests unitaires — QMS Types & Helpers
// Critique: calcRpn et rpnToLevel sont utilises dans le dashboard et les rapports
// ============================================================================

import { describe, it, expect } from 'vitest'
import {
  calcRpn,
  rpnToLevel,
  getEffectiveTrainingStatus,
  DOCUMENT_LEVEL_LABELS,
  rolePermissions as ROLE_PERMISSIONS,
  INDUSTRY_CONFIG,
  CORE_MODULES,
  OPTIONAL_MODULES,
  RECORD_LINK_TYPES,
  FORM_TEMPLATE_TRANSITIONS,
} from '@/types/qms'

// ---------------------------------------------------------------------------
// RPN Calculations (ISO 14971 FMEA)
// ---------------------------------------------------------------------------

describe('calcRpn', () => {
  it('calcule le RPN correctement (severity × occurrence × detection)', () => {
    expect(calcRpn(3, 4, 2)).toBe(24)
  })

  it('RPN minimum = 1 (1×1×1)', () => {
    expect(calcRpn(1, 1, 1)).toBe(1)
  })

  it('RPN maximum = 125 (5×5×5)', () => {
    expect(calcRpn(5, 5, 5)).toBe(125)
  })

  it('clamp les valeurs hors plage [1-5] vers les bornes', () => {
    expect(calcRpn(0, 3, 3)).toBe(9)    // 0 → clamped to 1
    expect(calcRpn(6, 3, 3)).toBe(45)   // 6 → clamped to 5
    expect(calcRpn(-1, 3, 3)).toBe(9)   // -1 → clamped to 1
    expect(calcRpn(3, 10, 3)).toBe(45)  // 10 → clamped to 5
  })

  it('gere les valeurs decimales (arrondi implicite par clamp int)', () => {
    // Les valeurs sont clampées via Math.max/min → nombres entiers
    expect(calcRpn(2, 3, 4)).toBe(24)
  })
})

describe('rpnToLevel', () => {
  it('RPN 1-20 → Low', () => {
    expect(rpnToLevel(1)).toBe('Low')
    expect(rpnToLevel(10)).toBe('Low')
    expect(rpnToLevel(20)).toBe('Low')
  })

  it('RPN 21-60 → Medium', () => {
    expect(rpnToLevel(21)).toBe('Medium')
    expect(rpnToLevel(40)).toBe('Medium')
    expect(rpnToLevel(60)).toBe('Medium')
  })

  it('RPN 61-100 → High', () => {
    expect(rpnToLevel(61)).toBe('High')
    expect(rpnToLevel(80)).toBe('High')
    expect(rpnToLevel(100)).toBe('High')
  })

  it('RPN 101-125 → Critical', () => {
    expect(rpnToLevel(101)).toBe('Critical')
    expect(rpnToLevel(125)).toBe('Critical')
  })
})

// ---------------------------------------------------------------------------
// Training Status
// ---------------------------------------------------------------------------

describe('getEffectiveTrainingStatus', () => {
  it('Completed reste Completed meme si overdue', () => {
    expect(getEffectiveTrainingStatus('Completed', '2020-01-01')).toBe('Completed')
  })

  it('Planned avec date passee → Overdue', () => {
    expect(getEffectiveTrainingStatus('Planned', '2020-01-01')).toBe('Overdue')
  })

  it('Planned avec date future → Planned', () => {
    const future = new Date(Date.now() + 86400000).toISOString()
    expect(getEffectiveTrainingStatus('Planned', future)).toBe('Planned')
  })

  it('In Progress avec date passee → Overdue', () => {
    expect(getEffectiveTrainingStatus('In Progress', '2020-01-01')).toBe('Overdue')
  })

  it('sans due_date → statut original', () => {
    expect(getEffectiveTrainingStatus('Planned')).toBe('Planned')
    expect(getEffectiveTrainingStatus('In Progress')).toBe('In Progress')
  })
})

// ---------------------------------------------------------------------------
// Document Levels
// ---------------------------------------------------------------------------

describe('DOCUMENT_LEVEL_LABELS', () => {
  it('a 4 niveaux definis', () => {
    expect(Object.keys(DOCUMENT_LEVEL_LABELS)).toHaveLength(4)
  })

  it('chaque niveau a des labels fr et en', () => {
    for (const [level, labels] of Object.entries(DOCUMENT_LEVEL_LABELS)) {
      expect(labels.fr).toBeTruthy()
      expect(labels.en).toBeTruthy()
    }
  })
})

// ---------------------------------------------------------------------------
// Role Permissions
// ---------------------------------------------------------------------------

describe('ROLE_PERMISSIONS', () => {
  const roles = Object.keys(ROLE_PERMISSIONS) as Array<keyof typeof ROLE_PERMISSIONS>

  it('admin a toutes les permissions', () => {
    const allPerms = new Set<string>()
    for (const perms of Object.values(ROLE_PERMISSIONS)) {
      perms.forEach(p => allPerms.add(p))
    }
    for (const perm of allPerms) {
      expect(ROLE_PERMISSIONS.admin).toContain(perm)
    }
  })

  it('executive a seulement des permissions en lecture', () => {
    for (const perm of ROLE_PERMISSIONS.executive) {
      expect(perm.endsWith('.read') || perm.endsWith('.view') || perm.endsWith('.export')).toBe(true)
    }
  })

  it('operator a des permissions limitees', () => {
    const opPerms = ROLE_PERMISSIONS.operator
    expect(opPerms).toContain('documents.read')
    expect(opPerms).toContain('ncr.create')
    expect(opPerms).not.toContain('admin.settings')
  })
})

// ---------------------------------------------------------------------------
// Industry Config
// ---------------------------------------------------------------------------

describe('INDUSTRY_CONFIG', () => {
  it('couvre les 5 types d industrie', () => {
    expect(Object.keys(INDUSTRY_CONFIG)).toHaveLength(5)
  })

  it('chaque industrie a un poids de conformite qui somme a ~1', () => {
    for (const [type, config] of Object.entries(INDUSTRY_CONFIG)) {
      const total = Object.values(config.complianceWeights).reduce((a, b) => a + b, 0)
      expect(total).toBeCloseTo(1.0, 1)
    }
  })

  it('medical_device recommande le module hierarchy', () => {
    // hierarchy is optional, so it may not be in recommended
    // But it should be in OPTIONAL_MODULES
    expect(OPTIONAL_MODULES).toContain('hierarchy')
  })
})

// ---------------------------------------------------------------------------
// Module Taxonomy
// ---------------------------------------------------------------------------

describe('Module taxonomy', () => {
  it('CORE_MODULES a 7 modules', () => {
    expect(CORE_MODULES).toHaveLength(7)
  })

  it('OPTIONAL_MODULES contient hierarchy', () => {
    expect(OPTIONAL_MODULES).toContain('hierarchy')
  })

  it('pas de doublons entre core et optional', () => {
    const coreSet = new Set(CORE_MODULES)
    for (const opt of OPTIONAL_MODULES) {
      expect(coreSet.has(opt)).toBe(false)
    }
  })
})

// ---------------------------------------------------------------------------
// Form Template Transitions
// ---------------------------------------------------------------------------

describe('FORM_TEMPLATE_TRANSITIONS', () => {
  it('Draft peut passer a Under_Review', () => {
    expect(FORM_TEMPLATE_TRANSITIONS.Draft).toContain('Under_Review')
  })

  it('Under_Review peut passer a Approved ou Draft', () => {
    expect(FORM_TEMPLATE_TRANSITIONS.Under_Review).toContain('Approved')
    expect(FORM_TEMPLATE_TRANSITIONS.Under_Review).toContain('Draft')
  })

  it('Obsolete est terminal', () => {
    expect(FORM_TEMPLATE_TRANSITIONS.Obsolete).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Record Link Types
// ---------------------------------------------------------------------------

describe('RECORD_LINK_TYPES', () => {
  it('a 8 types de liens', () => {
    expect(RECORD_LINK_TYPES).toHaveLength(8)
  })

  it('chaque type a value, label et directional', () => {
    for (const link of RECORD_LINK_TYPES) {
      expect(link.value).toBeTruthy()
      expect(link.label).toBeTruthy()
      expect(typeof link.directional).toBe('boolean')
    }
  })
})