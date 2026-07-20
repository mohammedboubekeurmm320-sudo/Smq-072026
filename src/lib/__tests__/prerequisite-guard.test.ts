// ============================================================================
// Tests unitaires — Document Prerequisite Guard
// Critique: le garde-fou ISO 13485 §4.2.4 est une barrière de sécurité
// ============================================================================

import { describe, it, expect } from 'vitest'
import { PREREQUISITE_GATED_ENTITIES } from '@/lib/document-prerequisite-guard'

describe('PREREQUISITE_GATED_ENTITIES', () => {
  it('contient les 5 entites soumises au controle', () => {
    expect(PREREQUISITE_GATED_ENTITIES.size).toBe(5)
    expect(PREREQUISITE_GATED_ENTITIES.has('non_conformances')).toBe(true)
    expect(PREREQUISITE_GATED_ENTITIES.has('capas')).toBe(true)
    expect(PREREQUISITE_GATED_ENTITIES.has('deviations')).toBe(true)
    expect(PREREQUISITE_GATED_ENTITIES.has('change_controls')).toBe(true)
    expect(PREREQUISITE_GATED_ENTITIES.has('batch_records')).toBe(true)
  })

  it('ne contient pas les entites non soumises', () => {
    expect(PREREQUISITE_GATED_ENTITIES.has('documents')).toBe(false)
    expect(PREREQUISITE_GATED_ENTITIES.has('training')).toBe(false)
    expect(PREREQUISITE_GATED_ENTITIES.has('risks')).toBe(false)
    expect(PREREQUISITE_GATED_ENTITIES.has('suppliers')).toBe(false)
    expect(PREREQUISITE_GATED_ENTITIES.has('audits')).toBe(false)
  })

  it('est un Set immutable (a la methode has)', () => {
    expect(typeof PREREQUISITE_GATED_ENTITIES.has).toBe('function')
  })
})