// ============================================================
// GET / PUT / DELETE a single document by ID with version management
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server-with-context'
import { getServerSession, requireAuth, requirePermission } from '@/lib/auth-server'

function ok(data: any, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}
function err(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

/**
 * GET /api/documents/[id]
 * Retrieve a single document with its metadata
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    const { id } = await params

    const { client } = await getAuthenticatedClient(request)
    if (!client) return err('Unauthorized', 401)

    const { data, error } = await client
      .from('documents')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) return err('Document not found', 404)

    return ok(data)
  } catch (e: any) {
    if (e.message === 'Non authentifié') return err('Non authentifié', 401)
    return err(e.message || 'Server error', 500)
  }
}

/**
 * PUT /api/documents/[id]
 * Update a document. Creates a new version if content changes.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePermission('documents.update')
    const { id } = await params

    const { client } = await getAuthenticatedClient(request)
    if (!client) return err('Unauthorized', 401)

    // Fetch current document
    const { data: current, error: fetchError } = await client
      .from('documents')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !current) return err('Document not found', 404)

    const body = await request.json()
    if (!body || typeof body !== 'object') return err('Body requis')

    const updateData: Record<string, any> = {}
    const allowedFields = [
      'title', 'description', 'doc_type', 'status', 'classification',
      'level', 'effective_date', 'review_date', 'content',
      'file_url', 'file_size', 'file_mime_type',
      'department_id', 'retention_years', 'validation_phase',
    ]

    for (const key of allowedFields) {
      if (body[key] !== undefined) updateData[key] = body[key]
    }

    if (Object.keys(updateData).length === 0) {
      return err('No valid fields to update')
    }

    // Auto-increment version if content or status changes significantly
    if (updateData.content !== undefined && updateData.content !== current.content) {
      const currentVersion = parseInt(current.version?.replace('v', '') || '1', 10)
      updateData.version = `v${currentVersion + 1}`
      updateData.updated_by = session.profile.id
    }

    const { data, error } = await client
      .from('documents')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) return err(error.message)
    return ok(data)
  } catch (e: any) {
    if (e.message === 'Non authentifié') return err('Non authentifié', 401)
    if (e.message === 'Permissions insuffisantes') return err('Permissions insuffisantes', 403)
    return err(e.message || 'Server error', 500)
  }
}

/**
 * DELETE /api/documents/[id]
 * Soft delete (archive) a document
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePermission('documents.delete')
    const { id } = await params

    const { client } = await getAuthenticatedClient(request)
    if (!client) return err('Unauthorized', 401)

    const { searchParams } = new URL(request.url)
    const hard = searchParams.get('hard') === 'true'

    if (hard) {
      const { error } = await client
        .from('documents')
        .delete()
        .eq('id', id)
      if (error) return err(error.message)
      return ok({ deleted: true })
    }

    const { error } = await client
      .from('documents')
      .update({ status: 'Archived' })
      .eq('id', id)

    if (error) return err(error.message)
    return ok({ archived: true })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return err('Non authentifié', 401)
    if (e.message === 'Permissions insuffisantes') return err('Permissions insuffisantes', 403)
    return err(e.message || 'Server error', 500)
  }
}