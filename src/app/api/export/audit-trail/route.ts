// ============================================================
// GET /api/export/audit-trail
// Export audit trail as CSV
// Supports date range and entity type filters
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server-with-context'
import { requireAuth, requirePermission } from '@/lib/auth-server'

function err(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

function csvEscape(val: any): string {
  if (val === null || val === undefined) return ''
  const str = String(val)
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * GET /api/export/audit-trail?from=YYYY-MM-DD&to=YYYY-MM-DD&entity=documents
 * Export audit trail as CSV file download
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requirePermission('admin.audit_trail')

    const { client } = await getAuthenticatedClient(request)
    if (!client) return err('Unauthorized', 401)

    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const entityType = searchParams.get('entity')
    const limit = parseInt(searchParams.get('limit') || '10000')

    let query = client
      .from('audit_trails')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (from) query = query.gte('created_at', from)
    if (to) query = query.lte('created_at', `${to}T23:59:59`)
    if (entityType) query = query.eq('table_name', entityType)

    const { data, error } = await query
    if (error) return err(error.message)

    // Flatten for CSV: convert JSON columns to strings
    const rows = (data || []).map((row: any) => ({
      id: row.id,
      timestamp: row.created_at,
      action: row.audit_action,
      table: row.table_name,
      record_id: row.record_id,
      user_id: row.user_id,
      user_email: row.user_email,
      ip_address: row.ip_address,
      old_values: row.old_values ? JSON.stringify(row.old_values) : '',
      new_values: row.new_values ? JSON.stringify(row.new_values) : '',
    }))

    if (rows.length === 0) {
      return new NextResponse('id,timestamp,action,table,record_id,user_id,user_email,ip_address,old_values,new_values\n', {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="audit_trail_${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      })
    }

    const headers = Object.keys(rows[0])
    const lines = [headers.map(csvEscape).join(',')]
    for (const row of rows) {
      lines.push(headers.map(h => csvEscape(row[h as keyof typeof row])).join(','))
    }

    return new NextResponse(lines.join('\n'), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="audit_trail_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return err('Non authentifié', 401)
    if (e.message === 'Permissions insuffisantes') return err('Permissions insuffisantes', 403)
    return err(e.message || 'Server error', 500)
  }
}