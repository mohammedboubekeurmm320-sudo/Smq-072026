// ============================================================
// GET / POST /api/record-links
// GET lists record links with filtering by source/target
// POST creates a link between two records
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

const VALID_LINK_TYPES = [
  'related', 'caused_by', 'corrected_by', 'linked_to',
  'derived_from', 'supersedes', 'references', 'depends_on',
]

/**
// GET /api/record-links?sourceId=&targetId=&sourceType=&targetType=&linkType=
// List record links with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const { client } = await getAuthenticatedClient(request)
    if (!client) return err('Unauthorized', 401)

    const { searchParams } = new URL(request.url)
    const sourceId = searchParams.get('sourceId')
    const targetId = searchParams.get('targetId')
    const sourceType = searchParams.get('sourceType')
    const targetType = searchParams.get('targetType')
    const linkType = searchParams.get('linkType')

    let query = client
      .from('record_links')
      .select('*')
      .order('created_at', { ascending: false })

    if (sourceId) query = query.eq('source_record_id', sourceId)
    if (targetId) query = query.eq('target_record_id', targetId)
    if (sourceType) query = query.eq('source_record_type', sourceType)
    if (targetType) query = query.eq('target_record_type', targetType)
    if (linkType) query = query.eq('link_type', linkType)

    const limit = parseInt(searchParams.get('limit') || '50')
    const { data, error } = await query.limit(limit)

    if (error) return err(error.message)
    return ok({ items: data })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return err('Non authentifié', 401)
    return err(e.message || 'Server error', 500)
  }
}

/**
// POST /api/record-links
// Create a new link between two records
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const { client, profileId } = await getAuthenticatedClient(request)
    if (!client) return err('Unauthorized', 401)

    const body = await request.json()
    const {
      sourceRecordId, sourceRecordType,
      targetRecordId, targetRecordType,
      linkType, description,
    } = body as {
      sourceRecordId: string
      sourceRecordType: string
      targetRecordId: string
      targetRecordType: string
      linkType: string
      description?: string
    }

    if (!sourceRecordId || !sourceRecordType) return err('sourceRecordId and sourceRecordType are required')
    if (!targetRecordId || !targetRecordType) return err('targetRecordId and targetRecordType are required')
    if (!linkType || !VALID_LINK_TYPES.includes(linkType)) {
      return err(`linkType must be one of: ${VALID_LINK_TYPES.join(', ')}`)
    }

    if (sourceRecordId === targetRecordId && sourceRecordType === targetRecordType) {
      return err('Cannot link a record to itself')
    }

    const { data, error } = await client
      .from('record_links')
      .insert({
        source_record_id: sourceRecordId,
        source_record_type: sourceRecordType,
        target_record_id: targetRecordId,
        target_record_type: targetRecordType,
        link_type: linkType,
        description: description || null,
        created_by: profileId,
        organization_id: request.headers.get('x-org-id') || session.profile.organizationId,
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