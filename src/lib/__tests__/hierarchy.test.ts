// ============================================================================
// Tests unitaires — Hierarchy Service (pure functions only)
// Critique: la hiérarchie documentaire est le cœur du §4.2.1 ISO 13485
// ============================================================================

import { describe, it, expect } from 'vitest'

// We only test the pure buildHierarchyTree function.
// The server-side functions (getHierarchy, getFilteredHierarchy, etc.) require
// Supabase connection and are tested via integration/e2e tests.

// Inline the HierarchyNode type and buildHierarchyTree logic for testing
// (avoids importing server-with-context which needs env vars)

interface HierarchyNode {
  id: string
  organization_id: string
  document_number: string | null
  title: string
  doc_type: string | null
  status: string
  level: number | null
  parent_document_id: string | null
  depth: number
  path_ids: string[]
}

interface HierarchyTree extends HierarchyNode {
  children: HierarchyTree[]
}

// Replicate the pure function from hierarchy-service.ts for unit testing
function buildHierarchyTree(nodes: HierarchyNode[]): HierarchyTree[] {
  const map = new Map<string, HierarchyTree>()
  const roots: HierarchyTree[] = []

  for (const node of nodes) {
    map.set(node.id, { ...node, children: [] })
  }

  for (const node of map.values()) {
    if (node.parent_document_id && map.has(node.parent_document_id)) {
      map.get(node.parent_document_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  const sortTree = (nodes: HierarchyTree[]) => {
    nodes.sort((a, b) => (a.level ?? 4) - (b.level ?? 4) || a.title.localeCompare(b.title))
    for (const n of nodes) sortTree(n.children)
  }
  sortTree(roots)

  return roots
}

describe('buildHierarchyTree', () => {
  const makeNode = (overrides: Partial<HierarchyNode> & { id: string }): HierarchyNode => ({
    organization_id: 'org-1',
    document_number: null,
    title: 'Doc',
    doc_type: null,
    status: 'Draft',
    level: 1,
    parent_document_id: null,
    depth: 0,
    path_ids: [],
    ...overrides,
  })

  it('construit un arbre vide a partir d un tableau vide', () => {
    const tree = buildHierarchyTree([])
    expect(tree).toEqual([])
  })

  it('place les documents sans parent a la racine', () => {
    const nodes: HierarchyNode[] = [
      makeNode({ id: '1', title: 'Manuel QSE', level: 1, parent_document_id: null }),
      makeNode({ id: '2', title: 'SOP Controle', level: 2, parent_document_id: null }),
    ]
    const tree = buildHierarchyTree(nodes)
    expect(tree).toHaveLength(2)
    expect(tree[0].title).toBe('Manuel QSE')
    expect(tree[1].title).toBe('SOP Controle')
  })

  it('imbrique les enfants sous leurs parents', () => {
    const nodes: HierarchyNode[] = [
      makeNode({ id: '1', title: 'Manuel', level: 1, parent_document_id: null }),
      makeNode({ id: '2', title: 'SOP', level: 2, parent_document_id: '1' }),
      makeNode({ id: '3', title: 'WI', level: 3, parent_document_id: '2' }),
    ]
    const tree = buildHierarchyTree(nodes)
    expect(tree).toHaveLength(1)
    expect(tree[0].children).toHaveLength(1)
    expect(tree[0].children[0].title).toBe('SOP')
    expect(tree[0].children[0].children[0].title).toBe('WI')
  })

  it('gere plusieurs enfants sous un meme parent', () => {
    const nodes: HierarchyNode[] = [
      makeNode({ id: '1', title: 'Parent', level: 1, parent_document_id: null }),
      makeNode({ id: '2', title: 'Enfant A', level: 2, parent_document_id: '1' }),
      makeNode({ id: '3', title: 'Enfant B', level: 2, parent_document_id: '1' }),
      makeNode({ id: '4', title: 'Enfant C', level: 2, parent_document_id: '1' }),
    ]
    const tree = buildHierarchyTree(nodes)
    expect(tree).toHaveLength(1)
    expect(tree[0].children).toHaveLength(3)
  })

  it('trie par niveau puis par titre', () => {
    const nodes: HierarchyNode[] = [
      makeNode({ id: '1', title: 'Z-Manual', level: 1, parent_document_id: null }),
      makeNode({ id: '2', title: 'A-Procedure', level: 2, parent_document_id: null }),
      makeNode({ id: '3', title: 'B-Instruction', level: 2, parent_document_id: null }),
    ]
    const tree = buildHierarchyTree(nodes)
    expect(tree[0].title).toBe('Z-Manual')
    expect(tree[1].title).toBe('A-Procedure')
    expect(tree[2].title).toBe('B-Instruction')
  })

  it('traite les enfants avec parent inexistant comme racines', () => {
    const nodes: HierarchyNode[] = [
      makeNode({ id: '1', title: 'Orphelin', level: 3, parent_document_id: 'non-existent' }),
    ]
    const tree = buildHierarchyTree(nodes)
    expect(tree).toHaveLength(1)
    expect(tree[0].title).toBe('Orphelin')
  })

  it('construit un arbre profond multi-niveaux', () => {
    const nodes: HierarchyNode[] = Array.from({ length: 5 }, (_, i) =>
      makeNode({
        id: String(i + 1),
        title: `Niveau ${i + 1}`,
        level: i + 1,
        parent_document_id: i === 0 ? null : String(i),
      }),
    )
    const tree = buildHierarchyTree(nodes)
    expect(tree).toHaveLength(1)
    let current = tree[0]
    for (let i = 1; i <= 4; i++) {
      expect(current.children).toHaveLength(1)
      current = current.children[0]
    }
    expect(current.children).toHaveLength(0)
  })

  it('preserve les metadonnees du noeud dans l arbre', () => {
    const nodes: HierarchyNode[] = [
      makeNode({
        id: '1', title: 'Doc Test', level: 1, parent_document_id: null,
        document_number: 'DOC-001', doc_type: 'MANUEL', status: 'Effective',
        depth: 0, path_ids: ['1'],
      }),
    ]
    const tree = buildHierarchyTree(nodes)
    expect(tree[0].document_number).toBe('DOC-001')
    expect(tree[0].doc_type).toBe('MANUEL')
    expect(tree[0].status).toBe('Effective')
  })
})
