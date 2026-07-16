// ============================================================================
// Tests unitaires — Validation Zod (ISO 13485 QMS)
// Critique: ces schemas sont la premiere ligne de defense pour toutes les API
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest'
import {
  loginSchema,
  signupSchema,
  paginationSchema,
  createCapaSchema,
  createNcrSchema,
  createRiskSchema,
  createDocumentSchema,
  createAuditSchema,
} from '@/lib/validation'

// ─── Login ──────────────────────────────────────────────────────────────────

describe('loginSchema', () => {
  it('accepte un email et mot de passe valides', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'password123',
    })
    expect(result.success).toBe(true)
  })

  it('rejette un email invalide', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'password123',
    })
    expect(result.success).toBe(false)
  })

  it('rejette un mot de passe trop court (< 8)', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'short',
    })
    expect(result.success).toBe(false)
  })

  it('rejette les champs manquants', () => {
    const result = loginSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

// ─── Signup ─────────────────────────────────────────────────────────────────

describe('signupSchema', () => {
  const validSignup = {
    email: 'new@example.com',
    password: 'SecurePass123!',
    fullName: 'Jean Dupont',
    orgName: 'MedTech Corp',
    industry: 'medical_device' as const,
  }

  it('accepte des donnees d\'inscription valides', () => {
    const result = signupSchema.safeParse(validSignup)
    expect(result.success).toBe(true)
  })

  it('rejette un mot de passe sans majuscule', () => {
    const result = signupSchema.safeParse({
      ...validSignup,
      password: 'securepass123!',
    })
    expect(result.success).toBe(false)
  })

  it('rejette un mot de passe sans chiffre', () => {
    const result = signupSchema.safeParse({
      ...validSignup,
      password: 'SecurePassword!',
    })
    expect(result.success).toBe(false)
  })

  it('rejette un mot de passe sans caractere special', () => {
    const result = signupSchema.safeParse({
      ...validSignup,
      password: 'SecurePass123',
    })
    expect(result.success).toBe(false)
  })

  it('rejette un mot de passe trop court (< 12)', () => {
    const result = signupSchema.safeParse({
      ...validSignup,
      password: 'Short1!',
    })
    expect(result.success).toBe(false)
  })
})

// ─── Pagination ─────────────────────────────────────────────────────────────

describe('paginationSchema', () => {
  it('applique les valeurs par defaut', () => {
    const result = paginationSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.limit).toBe(50)
      expect(result.data.offset).toBe(0)
      expect(result.data.sort).toBe('created_at')
      expect(result.data.order).toBe('desc')
    }
  })

  it('coerce les strings en nombres', () => {
    const result = paginationSchema.safeParse({
      limit: '10',
      offset: '20',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.limit).toBe(10)
      expect(result.data.offset).toBe(20)
    }
  })

  it('limite le max a 200', () => {
    const result = paginationSchema.safeParse({ limit: 500 })
    expect(result.success).toBe(false)
  })

  it('rejette un ordre invalide', () => {
    const result = paginationSchema.safeParse({ order: 'invalid' })
    expect(result.success).toBe(false)
  })
})

// ─── CAPA ───────────────────────────────────────────────────────────────────

describe('createCapaSchema', () => {
  it('accepte un CAPA valide avec type corrective', () => {
    const result = createCapaSchema.safeParse({
      title: 'Investigation NCR-2024-001',
      type: 'Corrective',
      source: 'Non-Conformance',
      description: 'Analyse approfondie requise pour cette non-conformite repetitive',
    })
    expect(result.success).toBe(true)
  })

  it('accepte le type preventive', () => {
    const result = createCapaSchema.safeParse({
      title: 'Action preventive maintenance',
      type: 'Preventive',
      source: 'Process Monitoring',
      description: 'Prevention des pannes recurrentes sur la ligne A',
    })
    expect(result.success).toBe(true)
  })

  it('rejette un type invalide', () => {
    const result = createCapaSchema.safeParse({
      title: 'Test',
      type: 'invalid_type',
      source: 'Non-Conformance',
      description: 'Description de test suffisamment longue pour passer la validation',
    })
    expect(result.success).toBe(false)
  })

  it('rejette un titre vide', () => {
    const result = createCapaSchema.safeParse({
      title: '',
      type: 'Corrective',
      source: 'Non-Conformance',
      description: 'Description de test suffisamment longue pour passer la validation',
    })
    expect(result.success).toBe(false)
  })

  it('rejette une description trop courte (< 10 car.)', () => {
    const result = createCapaSchema.safeParse({
      title: 'Test CAPA',
      type: 'Corrective',
      source: 'Non-Conformance',
      description: 'Court',
    })
    expect(result.success).toBe(false)
  })
})

// ─── NCR ────────────────────────────────────────────────────────────────────

describe('createNcrSchema', () => {
  it('accepte une NCR valide', () => {
    const result = createNcrSchema.safeParse({
      title: 'Non-conformite lot A-2024-045',
      type: 'Product',
      severity: 'Major',
      description: 'Ecart de specification detecte lors du controle qualite final',
    })
    expect(result.success).toBe(true)
  })

  it('accepte toutes les severites valides', () => {
    for (const severity of ['Critical', 'Major', 'Minor'] as const) {
      const result = createNcrSchema.safeParse({
        title: 'Test NCR',
        type: 'Process',
        severity,
        description: 'Description de test suffisamment longue pour passer',
      })
      expect(result.success).toBe(true)
    }
  })

  it('rejette une severite invalide', () => {
    const result = createNcrSchema.safeParse({
      title: 'Test',
      type: 'Product',
      severity: 'Extreme',
      description: 'Description de test suffisamment longue pour passer',
    })
    expect(result.success).toBe(false)
  })
})

// ─── Risk ───────────────────────────────────────────────────────────────────

describe('createRiskSchema', () => {
  it('accepte un risque valide avec severity/occurrence/detection [1-5]', () => {
    const result = createRiskSchema.safeParse({
      title: 'Risque de contamination',
      category: 'Product',
      severity: 4,
      occurrence: 3,
      detection: 2,
      description: 'Description de test suffisamment longue pour la validation',
    })
    expect(result.success).toBe(true)
  })

  it('rejette une severity hors plage [1-5]', () => {
    const result = createRiskSchema.safeParse({
      title: 'Test risque',
      category: 'Process',
      severity: 8,
      occurrence: 3,
      detection: 3,
      description: 'Description de test suffisamment longue pour la validation',
    })
    expect(result.success).toBe(false)
  })

  it('rejette une detection a 0', () => {
    const result = createRiskSchema.safeParse({
      title: 'Test risque',
      category: 'Product',
      severity: 3,
      occurrence: 3,
      detection: 0,
      description: 'Description de test suffisamment longue pour la validation',
    })
    expect(result.success).toBe(false)
  })
})

// ─── Document ───────────────────────────────────────────────────────────────

describe('createDocumentSchema', () => {
  it('accepte un document valide', () => {
    const result = createDocumentSchema.safeParse({
      title: 'SOP Controle des non-conformites',
      doc_type: 'SOP',
      level: 2,
    })
    expect(result.success).toBe(true)
  })

  it('accepte tous les types de documents valides', () => {
    const types = ['SOP', 'PROCEDURE', 'POLITIQUE', 'MANUEL', 'INDICATEUR', 'REGLEMENTAIRE', 'WI', 'FORMULAIRE', 'REGISTRE']
    for (const dt of types) {
      const result = createDocumentSchema.safeParse({
        title: `Document ${dt}`,
        doc_type: dt,
        level: 1,
      })
      expect(result.success).toBe(true)
    }
  })
})

// ─── Audit ──────────────────────────────────────────────────────────────────

describe('createAuditSchema', () => {
  it('accepte un audit interne valide', () => {
    const result = createAuditSchema.safeParse({
      title: 'Audit interne QMS 2024',
      type: 'Internal',
    })
    expect(result.success).toBe(true)
  })

  it('accepte un audit fournisseur', () => {
    const result = createAuditSchema.safeParse({
      title: 'Audit fournisseur XYZ',
      type: 'Supplier',
    })
    expect(result.success).toBe(true)
  })
})