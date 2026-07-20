// ============================================================================
// Hierarchy Service — Server-side document hierarchy operations
// ISO 13485 §4.2.1 / §4.2.2 — Document control and record control
// ============================================================================
// Provides typed access to the document_hierarchy view and related RPCs.
// Replaces the client-side tree building with server-side SQL operations.
// ============================================================================

import { getAuthenticatedClient } from '@/lib/supabase/server-with-context'
import type { Request } from 'next/server'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HierarchyNode {
  id: string
  organization_id: string
  document_number: string | null
  title: string
  doc_type: string | null
  status: string
  level: number | null
  parent_document_id: string | null
  department_code: string | null
  iso_clause: string | null
  depth: number
  path_ids: string[]
  path_numbers: (string | null)[]
}

export interface HierarchyTree extends HierarchyNode {
  children: HierarchyTree[]
}

export interface HierarchyStats {
  total_documents: number
  root_documents: number
  max_depth: number
  avg_depth: number
  level_1_count: number
  level_2_count: number
  level_3_count: number
  level_4_count: number
  orphan_level_3_4: number
  documents_with_children: number
  avg_children_per_parent: number
}

export interface DocumentChild {
  id: string
  document_number: string | null
  title: string
  doc_type: string | null
  status: string
  document_level: number | null
  department_code: string | null
  iso_clause: string | null
  child_count: number
}

export interface DocumentAncestor {
  id: string
  document_number: string | null
  title: string
  doc_type: string | null
  status: string
  document_level: number | null
  depth: number
}

export interface HierarchyFilterOptions {
 level?: number
  status?: string
  docType?: string
  search?: string
  parentId?: string | null
  limit?: number
}

// ---------------------------------------------------------------------------
// Core: Fetch flat hierarchy from the SQL view
// ---------------------------------------------------------------------------

/**
 * Fetch the full document hierarchy for the current organization.
 * Uses the recursive CTE view — server-side, no client-side tree building needed.
 */
export async function getHierarchy(request: Request): Promise<{ data: HierarchyNode[] | null; error: string | null }> {
  const { client, organizationId, error } = await getAuthenticatedClient(request)
  if (error || !client || !organizationId) return { data: null, error }

  const { data, error: qError } = await client
    .from('document_hierarchy')
    .select('*')
    .eq('organization_id', organizationId)
    .order('depth', { ascending: true })
    .order('document_number', { ascending: true })

  return { data: (data as HierarchyNode[]) || null, error: qError?.message }
}

/**
 * Fetch hierarchy with filters applied server-side.
 */
export async function getFilteredHierarchy(
  request: Request,
  filters: HierarchyFilterOptions,
): Promise<{ data: HierarchyNode[] | null; error: string | null }> {
  const { client, organizationId, error } = await getAuthenticatedClient(request)
  if (error || !client || !organizationId) return { data: null, error }

  let query = client
    .from('document_hierarchy')
    .select('*')
    .eq('organization_id', organizationId)

  if (filters.level !== undefined) {
    query = query.eq('level', filters.level)
  }
  if (filters.status) {
    query = query.eq('status', filters.status)
  }
  if (filters.docType) {
    query = query.eq('doc_type', filters.docType)
  }
  if (filters.parentId !== undefined) {
    if (filters.parentId === null) {
      query = query.is('parent_document_id', null)
    } else {
      query = query.eq('parent_document_id', filters.parentId)
    }
  }
  if (filters.search) {
    query = query.or(`title.ilike.%${filters.search}%,document_number.ilike.%${filters.search}%`)
  }
  if (filters.limit) {
    query = query.limit(filters.limit)
  }

  query = query.order('depth', { ascending: true }).order('document_number', { ascending: true })

  const { data, error: qError } = await query
  return { data: (data as HierarchyNode[]) || null, error: qError?.message }
}

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

/**
 * Get hierarchy statistics for the current organization.
 * Uses the optimized get_hierarchy_stats RPC.
 */
export async function getHierarchyStats(request: Request): Promise<{ data: HierarchyStats | null; error: string | null }> {
  const { client, organizationId, error } = await getAuthenticatedClient(request)
  if (error || !client || !organizationId) return { data: null, error }

  const { data, error: qError } = await client.rpc('get_hierarchy_stats', { p_org_id: organizationId })

  if (qError || !data) return { data: null, error: qError?.message }

  // The RPC returns a single row — Supabase returns it as an array or single object
  const row = Array.isArray(data) ? data[0] : data
  return {
    data: {
      total_documents: row.total_documents ?? 0,
      root_documents: row.root_documents ?? 0,
      max_depth: row.max_depth ?? 0,
      avg_depth: row.avg_depth ?? 0,
      level_1_count: row.level_1_count ?? 0,
      level_2_count: row.level_2_count ?? 0,
      level_3_count: row.level_3_count ?? 0,
      level_4_count: row.level_4_count ?? 0,
      orphan_level_3_4: row.orphan_level_3_4 ?? 0,
      documents_with_children: row.documents_with_children ?? 0,
      avg_children_per_parent: row.avg_children_per_parent ?? 0,
    },
    error: null,
  }
}

// ---------------------------------------------------------------------------
// Tree building (client-compatible) — builds nested tree from flat nodes
// ---------------------------------------------------------------------------

/**
 * Convert a flat list of hierarchy nodes into a nested tree structure.
 * Can be used client-side after fetching from the API.
 */
export function buildHierarchyTree(nodes: HierarchyNode[]): HierarchyTree[] {
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

  // Sort: by level ascending, then title alphabetically
  const sortTree = (nodes: HierarchyTree[]) => {
    nodes.sort((a, b) => (a.level ?? 4) - (b.level ?? 4) || a.title.localeCompare(b.title))
    for (const n of nodes) sortTree(n.children)
  }
  sortTree(roots)

  return roots
}

// ---------------------------------------------------------------------------
// Children & Ancestors
// ---------------------------------------------------------------------------

/**
 * Get direct children of a specific document.
 */
export async function getDocumentChildren(
  request: Request,
  documentId: string,
): Promise<{ data: DocumentChild[] | null; error: string | null }> {
  const { client, organizationId, error } = await getAuthenticatedClient(request)
  if (error || !client || !organizationId) return { data: null, error }

  const { data, error: qError } = await client.rpc('get_document_children', {
    p_doc_id: documentId,
    p_org_id: organizationId,
  })

  return { data: (Array.isArray(data) ? data : []) as DocumentChild[] || null, error: qError?.message }
}

/**
 * Get the ancestor chain (breadcrumb) from root to a specific document.
 */
export async function getDocumentAncestors(
  request: Request,
  documentId: string,
): Promise<{ data: DocumentAncestor[] | null; error: string | null }> {
  const { client, organizationId, error } = await getAuthenticatedClient(request)
  if (error || !client || !organizationId) return { data: null, error }

  // get_document_ancestors doesn't need org_id (walks up via parent_document_id)
  const { data, error: qError } = await client.rpc('get_document_ancestors', {
    p_doc_id: documentId,
  })

  return { data: (Array.isArray(data) ? data : []) as DocumentAncestor[] || null, error: qError?.message }
}

// ---------------------------------------------------------------------------
// Link / Unlink operations (with validation)
// ---------------------------------------------------------------------------

/**
 * Link a child document to a parent document.
 * Server-side validation: level consistency is enforced by the DB trigger,
 * but we also validate here for better error messages.
 */
export async function linkDocument(
  request: Request,
  childId: string,
  parentId: string,
): Promise<{ data: any; error: string | null }> {
  const { client, organizationId, error } = await getAuthenticatedClient(request)
  if (error || !client || !organizationId) return { data: null, error }

  // Fetch both documents for validation
  const [childRes, parentRes] = await Promise.all([
    client.from('documents').select('id, document_level, parent_document_id').eq('id', childId).eq('organization_id', organizationId).single(),
    client.from('documents').select('id, document_level').eq('id', parentId).eq('organization_id', organizationId).single(),
  ])

  if (childRes.error || !childRes.data) return { data: null, error: 'Document enfant introuvable' }
  if (parentRes.error || !parentRes.data) return { data: null, error: 'Document parent introuvable' }

  const childLevel = childRes.data.document_level ?? 4
  const parentLevel = parentRes.data.document_level ?? 1

  if (parentLevel >= childLevel) {
    return {
      data: null,
      error: `Incohérence de niveau : le parent (N${parentLevel}) doit avoir un niveau inférieur à l'enfant (N${childLevel})`,
    }
  }

  // Cannot link to self
  if (childId === parentId) {
    return { data: null, error: 'Un document ne peut pas être son propre parent' }
  }

  const { data, error: qError } = await client
    .from('documents')
    .update({ parent_document_id: parentId })
    .eq('id', childId)
    .eq('organization_id', organizationId)
    .select()
    .single()

  return { data, error: qError?.message }
}

/**
 * Unlink a document from its parent (set parent_document_id to null).
 */
export async function unlinkDocument(
  request: Request,
  documentId: string,
): Promise<{ data: any; error: string | null }> {
  const { client, organizationId, error } = await getAuthenticatedClient(request)
  if (error || !client || !organizationId) return { data: null, error }

  const { data, error: qError } = await client
    .from('documents')
    .update({ parent_document_id: null })
    .eq('id', documentId)
    .eq('organization_id', organizationId)
    .select()
    .single()

  return { data, error: qError?.message }
}
