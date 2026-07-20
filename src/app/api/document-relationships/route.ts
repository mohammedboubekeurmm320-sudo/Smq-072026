// ============================================================
// GET / POST / DELETE /api/document-relationships
// Manage document_relationships table
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server-with-context'
import { requireAuth } from '@/lib/auth-server'

function ok(data: any, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}
function err(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

const VALID_RELATIONSHIP_TYPES = [
  'parent_child',
  'references',
  'supersedes',
  'obsoletes',
  'amends',
] as const

// GET /api/document-relationships?documentId=xxx
// Returns all relationships where the document is parent OR child,
// enriched with parent/child document info.
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

    const { data, error } = await client
      .from('document_relationships')
      .select('*')
      .or(`parent_document_id.eq.${documentId},child_document_id.eq.${documentId}`)
      .order('created_at', { ascending: false })

    if (error) return err(error.message)

    // Enrich with parent and child document info
    const docIds = new Set<string>()
    for (const r of data ?? []) {
      docIds.add(r.parent_document_id)
      docIds.add(r.child_document_id)
    }

    if (docIds.size > 0) {
      const { data: docs } = await client
        .from('documents')
        .select('id, title, document_number, doc_type')
        .in('id', Array.from(docIds))

      const docMap = new Map<string, any>()
      for (const d of docs ?? []) docMap.set(d.id, d)

      for (const r of data) {
        r.parent_document = docMap.get(r.parent_document_id) ?? null
        r.child_document = docMap.get(r.child_document_id) ?? null
      }
    }

    return ok({ items: data ?? [] })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return err('Non authentifié', 401)
    return err(e.message || 'Server error', 500)
  }
}

// POST /api/document-relationships
// Body: { parentDocumentId, childDocumentId, relationshipType, description? }
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const { client, profileId } = await getAuthenticatedClient(request)
    if (!client) return err('Unauthorized', 401)

    const body = await request.json()
    const {
      parentDocumentId,
      childDocumentId,
      relationshipType,
    } = body as {
      parentDocumentId: string
      childDocumentId: string
      relationshipType: string
      description?: string
    }

    if (!parentDocumentId) return err('parentDocumentId is required')
    if (!childDocumentId) return err('childDocumentId is required')
    if (
      !relationshipType ||
      !VALID_RELATIONSHIP_TYPES.includes(relationshipType as any)
    ) {
      return err(
        `relationshipType must be one of: ${VALID_RELATIONSHIP_TYPES.join(', ')}`,
      )
    }

    if (parentDocumentId === childDocumentId) {
      return err(
        'Le document parent et enfant doivent être différents',
      )
    }

    const orgId =
      request.headers.get('x-org-id') || session.profile.organizationId

    const { data, error } = await client
      .from('document_relationships')
      .insert({
        parent_document_id: parentDocumentId,
        child_document_id: childDocumentId,
        relationship_type: relationshipType,
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

// DELETE /api/document-relationships
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
      .from('document_relationships')
      .delete()
      .eq('id', id)

    if (error) return err(error.message)
    return ok({ deleted: true })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return err('Non authentifié', 401)
    return err(e.message || 'Server error', 500)
  }
}