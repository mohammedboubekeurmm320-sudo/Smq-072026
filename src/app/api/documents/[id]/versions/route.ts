// ============================================================
// GET / POST document versions
// GET lists versions for a document
// POST creates a new version
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server-with-context'
import { requireAuth, requirePermission } from '@/lib/auth-server'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

function ok(data: any, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}
function err(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

/**
 * GET /api/documents/[id]/versions
 * List all versions for a document
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

    // Check document exists
    const { data: doc, error: docError } = await client
      .from('documents')
      .select('id, title, version')
      .eq('id', id)
      .single()

    if (docError || !doc) return err('Document not found', 404)

    // Query audit trails for this document to reconstruct versions
    const { data: trails, error } = await client
      .from('audit_trails')
      .select('*')
      .eq('table_name', 'documents')
      .eq('record_id', id)
      .in('audit_action', ['CREATE', 'UPDATE'])
      .order('created_at', { ascending: false })

    if (error) return err(error.message)

    // Build version list from audit trail entries
    const versions = (trails || []).map((t: any, idx: number) => ({
      version: t.new_values?.version || `v${(trails || []).length - idx}`,
      modifiedBy: t.user_email || t.user_id,
      modifiedAt: t.created_at,
      changes: t.new_values,
    }))

    // Ensure current version is included
    versions.unshift({
      version: doc.version || 'v1',
      modifiedAt: doc.created_at,
      isCurrent: true,
    })

    return ok({ documentId: id, title: doc.title, versions })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return err('Non authentifié', 401)
    return err(e.message || 'Server error', 500)
  }
}

/**
 * POST /api/documents/[id]/versions
 * Create a new version of a document
 */
export async function POST(
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
    const { content, changeDescription } = body as {
      content?: string
      changeDescription?: string
    }

    if (!content && !changeDescription) {
      return err('content or changeDescription is required')
    }

    // Increment version
    const currentVersion = parseInt(current.version?.replace('v', '') || '1', 10)
    const newVersion = `v${currentVersion + 1}`

    const updateData: Record<string, any> = {
      version: newVersion,
      updated_by: session.profile.id,
    }

    if (content !== undefined) updateData.content = content

    const { data, error } = await client
      .from('documents')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) return err(error.message)

    // Log version change in audit trail
    await client.from('audit_trails').insert({
      id: randomUUID(),
      table_name: 'documents',
      record_id: id,
      audit_action: 'UPDATE',
      user_id: session.profile.id,
      user_email: session.profile.email,
      old_values: { version: current.version },
      new_values: { version: newVersion, changeDescription },
      organization_id: session.profile.organizationId,
    })

    return ok(data, 201)
  } catch (e: any) {
    if (e.message === 'Non authentifié') return err('Non authentifié', 401)
    if (e.message === 'Permissions insuffisantes') return err('Permissions insuffisantes', 403)
    return err(e.message || 'Server error', 500)
  }
}