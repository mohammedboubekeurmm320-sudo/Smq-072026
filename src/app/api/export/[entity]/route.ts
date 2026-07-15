// ============================================================
// GET /api/export/[entity]
// Export any entity data as CSV
// Query params: entity (in path), format=csv, optional filters
// Returns CSV file download
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server-with-context'
import { requireAuth, requirePermission } from '@/lib/auth-server'
import type { CrudEntity } from '@/lib/crud-service'

const EXPORTABLE_ENTITIES: CrudEntity[] = [
  'documents', 'capas', 'non_conformances', 'deviations', 'change_controls',
  'audits', 'training', 'risks', 'suppliers', 'batch_records',
  'form_templates', 'form_instances', 'departments', 'record_type_definitions',
]

function err(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

/** Escape a CSV field according to RFC 4180 */
function csvEscape(val: any): string {
  if (val === null || val === undefined) return ''
  const str = String(val)
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/** Convert array of objects to CSV string */
function toCsv(rows: Record<string, any>[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const lines = [headers.map(csvEscape).join(',')]
  for (const row of rows) {
    lines.push(headers.map(h => csvEscape(row[h])).join(','))
  }
  return lines.join('\n')
}

/**
 * GET /api/export/[entity]?format=csv
 * Export entity data as CSV download
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string }> }
) {
  try {
    const session = await requirePermission('reports.export')
    const { entity } = await params

    if (!EXPORTABLE_ENTITIES.includes(entity as CrudEntity)) {
      return err(`Entity '${entity}' is not exportable`)
    }

    const { client } = await getAuthenticatedClient(request)
    if (!client) return err('Unauthorized', 401)

    const { searchParams } = new URL(request.url)

    // Build query with optional filters
    let query = client
      .from(entity as CrudEntity)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10000)

    // Apply filters from query params
    const skip = ['format', 'select', 'sort', 'order', 'limit', 'offset']
    for (const [key, value] of searchParams.entries()) {
      if (!skip.includes(key) && value) {
        if (value.includes(',')) {
          query = query.in(key, value.split(','))
        } else {
          query = query.eq(key, value)
        }
      }
    }

    const limit = parseInt(searchParams.get('limit') || '10000')
    if (limit < 10000) {
      query = query.limit(limit)
    }

    const { data, error } = await query

    if (error) return err(error.message)

    const csvContent = toCsv((data || []) as Record<string, any>[])
    const filename = `${entity}_export_${new Date().toISOString().slice(0, 10)}.csv`

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return err('Non authentifié', 401)
    if (e.message === 'Permissions insuffisantes') return err('Permissions insuffisantes', 403)
    return err(e.message || 'Server error', 500)
  }
}