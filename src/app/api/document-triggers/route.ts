// ============================================================
// GET / POST / DELETE /api/document-triggers
// Manage document_triggers table with cycle detection
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server-with-context'
import { requireAuth } from '@/lib/auth-server'
import { randomUUID } from 'crypto'

function ok(data: any, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}
function err(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

const VALID_TRIGGER_TYPES = [
  'prerequisite', 'references', 'activates', 'output', 'escalation',
] as const

/**
 * In-memory DFS cycle detection.
 * Builds a directed graph from ALL triggers in the org, then checks
 * whether adding sourceId → targetId would create a cycle.
 */
async function wouldCreateCycle(
  client: any,
  organizationId: string,
  sourceId: string,
  targetId: string,
): Promise<boolean> {
  // Fetch every trigger in the org (source_document_id, target_document_id)
  const { data: allTriggers } = await client
    .from('document_triggers')
    .select('source_document_id, target_document_id')
    .eq('organization_id', organizationId)

  // Build adjacency list (directed: source → target)
  const adj: Record<string, Set<string>> = {}
  for (const t of allTriggers ?? []) {
    if (!adj[t.source_document_id]) adj[t.source_document_id] = new Set()
    adj[t.source_document_id].add(t.target_document_id)
  }

  // Temporarily add the proposed edge
  if (!adj[sourceId]) adj[sourceId] = new Set()
  adj[sourceId].add(targetId)

  // DFS from targetId to see if we can reach sourceId
  const visited = new Set<string>()
  const stack = [targetId]
  while (stack.length > 0) {
    const node = stack.pop()!
    if (node === sourceId) return true // cycle found
    if (visited.has(node)) continue
    visited.add(node)
    for (const neighbor of adj[node] ?? []) {
      stack.push(neighbor)
    }
  }

  return false
}

// GET /api/document-triggers?documentId=xxx
// Returns all triggers where the given document is source OR target,
// enriched with source/target document title and number.
export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    const { client } = await getAuthenticatedClient(request)
    if (!client) return err('Unauthorized', 401)

    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')

    if (!documentId) {
      return err('documentId query parameter is required')
    }

    // Fetch triggers where document is source OR target
    const { data, error } = await client
      .from('document_triggers')
      .select('*')
      .or(`source_document_id.eq.${documentId},target_document_id.eq.${documentId}`)
      .order('created_at', { ascending: false })

    if (error) return err(error.message)

    // Enrich with source and target document info
    const docIds = new Set<string>()
    for (const t of data ?? []) {
      docIds.add(t.source_document_id)
      docIds.add(t.target_document_id)
    }

    if (docIds.size > 0) {
      const { data: docs } = await client
        .from('documents')
        .select('id, title, document_number, doc_type')
        .in('id', Array.from(docIds))

      const docMap = new Map<string, any>()
      for (const d of docs ?? []) docMap.set(d.id, d)

      for (const t of data) {
        t.source_document = docMap.get(t.source_document_id) ?? null
        t.target_document = docMap.get(t.target_document_id) ?? null
      }
    }

    return ok({ items: data ?? [] })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return err('Non authentifié', 401)
    return err(e.message || 'Server error', 500)
  }
}

// POST /api/document-triggers
// Create a new trigger with cycle detection
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const { client, profileId } = await getAuthenticatedClient(request)
    if (!client) return err('Unauthorized', 401)

    const body = await request.json()
    const {
      sourceDocumentId,
      targetDocumentId,
      triggerType,
      description,
      isMandatory,
    } = body as {
      sourceDocumentId: string
      targetDocumentId: string
      triggerType: string
      description?: string
      isMandatory?: boolean
    }

    if (!sourceDocumentId) return err('sourceDocumentId is required')
    if (!targetDocumentId) return err('targetDocumentId is required')
    if (!triggerType || !VALID_TRIGGER_TYPES.includes(triggerType as any)) {
      return err(`triggerType must be one of: ${VALID_TRIGGER_TYPES.join(', ')}`)
    }

    if (sourceDocumentId === targetDocumentId) {
      return err('Le document source et cible doivent être différents')
    }

    const orgId =
      request.headers.get('x-org-id') || session.profile.organizationId

    // Cycle detection
    const hasCycle = await wouldCreateCycle(
      client,
      orgId,
      sourceDocumentId,
      targetDocumentId,
    )

    if (hasCycle) {
      return err(
        'Cycle détecté : l\'ajout de ce déclencheur créerait une boucle circulaire entre les documents.',
        409,
      )
    }

    const { data, error } = await client
      .from('document_triggers')
      .insert({
        id: randomUUID(),
        updated_at: new Date().toISOString(),
        source_document_id: sourceDocumentId,
        target_document_id: targetDocumentId,
        trigger_type: triggerType,
        description: description || null,
        is_mandatory: isMandatory ?? false,
        organization_id: orgId,
      })
      .select()
      .single()

    if (error) return err(error.message)
    return ok(data, 201)
  } catch (e: any) {
    if (e.message === 'Non authentifié') return err('Non authentifié', 401)
    return err(e.message || 'Server error', 500)
  }
}

// DELETE /api/document-triggers
// Body: { id }
export async function DELETE(request: NextRequest) {
  try {
    await requireAuth()
    const { client } = await getAuthenticatedClient(request)
    if (!client) return err('Unauthorized', 401)

    const body = await request.json()
    const { id } = body as { id: string }

    if (!id) return err('id is required')

    const { error } = await client
      .from('document_triggers')
      .delete()
      .eq('id', id)

    if (error) return err(error.message)
    return ok({ deleted: true })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return err('Non authentifié', 401)
    return err(e.message || 'Server error', 500)
  }
}