// ============================================================================
// Tests unitaires — Import Service (RFC 4180 CSV Parser)
// Critique: l'import CSV est la porte d'entrée de données en masse
// ============================================================================

import { describe, it, expect } from 'vitest'
import { parseCsv, getFieldMap, generateImportTemplate } from '@/lib/import-service'

describe('parseCsv', () => {
  it('parse un CSV simple avec en-tete', () => {
    const csv = 'title,type,status\nCAPA Test,Corrective,Open\nNCR Test,Product,Open'
    const { headers, rows } = parseCsv(csv)
    expect(rows).toHaveLength(2)
    expect(headers).toContain('title')
    expect(rows[0].title).toBe('CAPA Test')
    expect(rows[0].type).toBe('Corrective')
    expect(rows[1].title).toBe('NCR Test')
  })

  it('gere les champs entre guillemets', () => {
    const csv = 'title,description\n"Test with comma","Description with ""quotes"""'
    const { rows } = parseCsv(csv)
    expect(rows).toHaveLength(1)
    // The CSV parser should handle quoted fields
    expect(rows[0].title).toBeTruthy()
    expect(rows[0].description).toBeTruthy()
  })

  it('gere les retours a la ligne dans les champs quotés', () => {
    const csv = 'title,description\n"Line1\nLine2","normal"'
    const { rows } = parseCsv(csv)
    expect(rows).toHaveLength(1)
    expect(rows[0].title).toContain('Line1')
  })

  it('ignore les lignes vides', () => {
    const csv = 'title\n\n  \nTest\ntest2\n'
    const { rows } = parseCsv(csv)
    expect(rows).toHaveLength(2)
  })

  it('gere les CRLF et LF', () => {
    const csv = 'a,b\r\n1,2\r\n3,4'
    const { rows } = parseCsv(csv)
    expect(rows).toHaveLength(2)
  })

  it('gere un CSV avec un seul champ', () => {
    const csv = 'title\nTest'
    const { rows } = parseCsv(csv)
    expect(rows).toHaveLength(1)
  })

  it('extrait les en-tetes correctement', () => {
    const csv = 'col_a,col_b,col_c\n1,2,3'
    const { headers } = parseCsv(csv)
    expect(headers).toEqual(['col_a', 'col_b', 'col_c'])
  })
})

describe('getFieldMap', () => {
  it('retourne un field map pour une entite connue', () => {
    const fields = getFieldMap('capas')
    expect(Array.isArray(fields)).toBe(true)
    expect(fields.length).toBeGreaterThan(0)
  })
})

describe('generateImportTemplate', () => {
  it('genere un template CSV pour une entite connue', () => {
    const template = generateImportTemplate('capas')
    expect(template).toContain('Title')
    expect(template.split('\n').length).toBeGreaterThan(1)
  })
})