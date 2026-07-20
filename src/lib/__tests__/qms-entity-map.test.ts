// ============================================================================
// Tests unitaires — QMS Entity Map
// Critique: l'entity map est utilise par toutes les routes dynamiques
// ============================================================================

import { describe, it, expect } from 'vitest'
import {
  QMS_ENTITIES,
  getEntityConfig,
  getAllEntities,
  SIDEBAR_NAV,
} from '@/lib/qms-entity-map'

describe('QMS_ENTITIES', () => {
  it('contient les 12 entites QMS attendues', () => {
    const slugs = Object.keys(QMS_ENTITIES)
    expect(slugs).toHaveLength(12)
    expect(slugs).toContain('capas')
    expect(slugs).toContain('ncrs')
    expect(slugs).toContain('deviations')
    expect(slugs).toContain('change-controls')
    expect(slugs).toContain('risks')
    expect(slugs).toContain('audits')
    expect(slugs).toContain('training')
    expect(slugs).toContain('batch-records')
    expect(slugs).toContain('suppliers')
    expect(slugs).toContain('documents')
    expect(slugs).toContain('oos-oot')
    expect(slugs).toContain('forms')
  })

  it('chaque entite a les champs requis', () => {
    for (const [slug, config] of Object.entries(QMS_ENTITIES)) {
      expect(config.slug).toBe(slug)
      expect(config.table).toBeTruthy()
      expect(config.label).toBeTruthy()
      expect(config.labelPlural).toBeTruthy()
      expect(config.icon).toBeTruthy()
      expect(config.description).toBeTruthy()
      expect(config.statusField).toBeTruthy()
      expect(config.defaultSort).toBeTruthy()
      expect(config.color).toBeTruthy()
      expect(config.specializedRoute).toBeTruthy()
    }
  })

  it('oos-oot pointe vers la table non_conformances', () => {
    expect(QMS_ENTITIES['oos-oot'].table).toBe('non_conformances')
    expect(QMS_ENTITIES['oos-oot'].numberField).toBe('ncrNumber')
    expect(QMS_ENTITIES['oos-oot'].numberPrefix).toBe('OOS')
  })
})

describe('getEntityConfig', () => {
  it('retourne la config pour un slug existant', () => {
    const config = getEntityConfig('capas')
    expect(config).toBeDefined()
    expect(config!.table).toBe('capas')
  })

  it('retourne undefined pour un slug inexistant', () => {
    expect(getEntityConfig('nonexistent')).toBeUndefined()
  })
})

describe('getAllEntities', () => {
  it('retourne un tableau avec toutes les entites', () => {
    const entities = getAllEntities()
    expect(entities).toHaveLength(12)
    expect(entities[0].slug).toBeTruthy()
  })
})

describe('SIDEBAR_NAV', () => {
  it('contient 5 groupes de navigation', () => {
    expect(SIDEBAR_NAV).toHaveLength(5)
  })

  it('chaque groupe a un label et des items', () => {
    for (const group of SIDEBAR_NAV) {
      expect(group.label).toBeTruthy()
      expect(group.items.length).toBeGreaterThan(0)
      for (const item of group.items) {
        expect(item.slug).toBeTruthy()
        expect(item.label).toBeTruthy()
        expect(item.icon).toBeTruthy()
      }
    }
  })

  it('contient document-hierarchy dans le groupe Conformite', () => {
    const conformite = SIDEBAR_NAV.find(g => g.label === 'Conformité')
    expect(conformite).toBeDefined()
    const hierarchy = conformite!.items.find(i => i.slug === 'document-hierarchy')
    expect(hierarchy).toBeDefined()
    expect(hierarchy!.icon).toBe('Network')
  })

  it('tous les items specialized ont un specialized: true', () => {
    for (const group of SIDEBAR_NAV) {
      for (const item of group.items) {
        if (item.specialized) {
          expect(item.specialized).toBe(true)
        }
      }
    }
  })
})