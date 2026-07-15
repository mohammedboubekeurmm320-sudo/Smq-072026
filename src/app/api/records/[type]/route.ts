// ============================================================
// GET /api/records/[type]
// Get records by record type slug
// Uses record_type_definitions to determine which table to query
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

/** Map record type slugs to their corresponding database tables */
const SLUG_TO_TABLE: Record<string, string> = {
  capa: 'capas',
  ncr: 'non_conformances',
  deviation: 'deviations',
  change_control: 'change_controls',
  audit: 'audits',
  risk: 'risks',
  training: 'training',
  supplier: 'suppliers',
  batch_record: 'batch_records',
  oos_oot: 'non_conformances', // OOS/OOT stored in non_conformances with type filter
  document: 'documents',
}

/**
 * GET /api/records/[type]?status=Open&limit=50&offset=0
 * Retrieve records by their record type slug
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    await requireAuth()
    const { type } = await params

    const { client } = await getAuthenticatedClient(request)
    if (!client) return err('Unauthorized', 401)

    const tableName = SLUG_TO_TABLE[type]
    if (!tableName) {
      // Check if it's a custom record type
      const { data: customDef, error: defError } = await client
        .from('record_type_definitions')
        .select('id, slug, table_name, fields')
        .eq('slug', type)
        .eq('is_system', false)
        .single()

      if (defError || !customDef) {
        return err(`Unknown record type: ${type}`, 404)
      }

      // Query the custom table
      const { searchParams } = new URL(request.url)
      const limit = parseInt(searchParams.get('limit') || '50')
      const offset = parseInt(searchParams.get('offset') || '0')

      let query = client
        .from(customDef.table_name || 'records')
        .select('*', { count: 'exact' })
        .eq('record_type_id', customDef.id)
        .order('created_at', { ascending: false })

      const status = searchParams.get('status')
      if (status) query = query.eq('status', status)

      const { data, count, error } = await query.range(offset, offset + limit - 1)

      if (error) return err(error.message)
      return ok({
        items: data,
        count: count ?? 0,
        typeDefinition: customDef,
      })
    }

    // System record type — query the mapped table
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = client
      .from(tableName as any)
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    // Apply filters
    const status = searchParams.get('status')
    if (status) query = query.eq('status', status)

    // For OOS/OOT, add type filter
    if (type === 'oos_oot') {
      query = query.in('ncr_type', ['OOS', 'OOT'])
    }

    const skip = ['status', 'limit', 'offset', 'sort', 'order']
    for (const [key, value] of searchParams.entries()) {
      if (!skip.includes(key) && value) {
        if (value.includes(',')) {
          query = query.in(key, value.split(','))
        } else {
          query = query.eq(key, value)
        }
      }
    }

    const { data, count, error } = await query.range(offset, offset + limit - 1)

    if (error) return err(error.message)
    return ok({ items: data, count: count ?? 0 })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return err('Non authentifié', 401)
    return err(e.message || 'Server error', 500)
  }
}