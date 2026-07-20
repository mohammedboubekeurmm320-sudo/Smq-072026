// ============================================================
// GET / POST / PUT / DELETE /api/document-prerequisites
// Manage document_prerequisites table
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

// Allowed fields for partial update
const UPDATABLE_FIELDS = [
  'record_type',
  'required_doc_type',
  'required_doc_ref',
  'is_mandatory',
  'description',
]

// GET /api/document-prerequisites?recordType=capa
export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    const { client } = await getAuthenticatedClient(request)
    if (!client) return err('Unauthorized', 401)

    const { searchParams } = new URL(request.url)
    const recordType = searchParams.get('recordType')

    let query = client
      .from('document_prerequisites')
      .select('*')
      .order('created_at', { ascending: false })

    if (recordType) {
      query = query.eq('record_type', recordType)
    }

    const limit = parseInt(searchParams.get('limit') || '100')
    const { data, error } = await query.limit(limit)

    if (error) return err(error.message)
    return ok({ items: data ?? [] })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return err('Non authentifié', 401)
    return err(e.message || 'Server error', 500)
  }
}

// POST /api/document-prerequisites
// Body: { recordType, requiredDocType, requiredDocRef?, isMandatory?, description? }
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const { client } = await getAuthenticatedClient(request)
    if (!client) return err('Unauthorized', 401)

    const body = await request.json()
    const {
      recordType,
      requiredDocType,
      requiredDocRef,
      isMandatory,
      description,
    } = body as {
      recordType: string
      requiredDocType: string
      requiredDocRef?: string
      isMandatory?: boolean
      description?: string
    }

    if (!recordType) return err('recordType is required')
    if (!requiredDocType) return err('requiredDocType is required')

    const orgId =
      request.headers.get('x-org-id') || session.profile.organizationId

    const { data, error } = await client
      .from('document_prerequisites')
      .insert({
        record_type: recordType,
        required_doc_type: requiredDocType,
        required_doc_ref: requiredDocRef || null,
        is_mandatory: isMandatory ?? true,
        description: description || null,
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

// PUT /api/document-prerequisites
// Body: { id, ...fields }
export async function PUT(request: NextRequest) {
  try {
    await requireAuth()
    const { client } = await getAuthenticatedClient(request)
    if (!client) return err('Unauthorized', 401)

    const body = await request.json()
    const { id, ...rest } = body as { id: string; [key: string]: any }

    if (!id) return err('id is required')

    // Only allow updatable fields
    const updatePayload: Record<string, any> = {}
    for (const key of UPDATABLE_FIELDS) {
      if (rest[key] !== undefined) {
        updatePayload[key] = rest[key]
      }
    }

    if (Object.keys(updatePayload).length === 0) {
      return err('No valid fields to update')
    }

    const { data, error } = await client
      .from('document_prerequisites')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (error) return err(error.message)
    return ok(data)
  } catch (e: any) {
    if (e.message === 'Non authentifié') return err('Non authentifié', 401)
    return err(e.message || 'Server error', 500)
  }
}

// DELETE /api/document-prerequisites?id=xxx
export async function DELETE(request: NextRequest) {
  try {
    await requireAuth()
    const { client } = await getAuthenticatedClient(request)
    if (!client) return err('Unauthorized', 401)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return err('id query parameter is required')

    const { error } = await client
      .from('document_prerequisites')
      .delete()
      .eq('id', id)

    if (error) return err(error.message)
    return ok({ deleted: true })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return err('Non authentifié', 401)
    return err(e.message || 'Server error', 500)
  }
}