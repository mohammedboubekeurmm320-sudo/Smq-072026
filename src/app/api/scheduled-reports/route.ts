// ============================================================
// GET / POST /api/scheduled-reports
// GET lists scheduled reports for the org
// POST creates a new scheduled report
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server-with-context'
import { requireAuth, requirePermission } from '@/lib/auth-server'

function ok(data: any, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}
function err(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

const VALID_FREQUENCIES = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly']
const VALID_FORMATS = ['csv', 'pdf', 'html', 'json']
const VALID_REPORT_TYPES = [
  'open_capas', 'open_ncrs', 'overdue_training', 'risk_summary',
  'audit_schedule', 'compliance_score', 'document_expiring', 'kpi_dashboard',
  'custom',
]

/**
// GET /api/scheduled-reports?active=true
// List scheduled reports for the organization
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const { client } = await getAuthenticatedClient(request)
    if (!client) return err('Unauthorized', 401)

    const { searchParams } = new URL(request.url)
    const active = searchParams.get('active')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = client
      .from('scheduled_reports')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (active !== null) {
      query = query.eq('is_active', active === 'true')
    }

    const { data, count, error } = await query
      .range(offset, offset + limit - 1)

    if (error) return err(error.message)
    return ok({ items: data, count: count ?? 0 })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return err('Non authentifié', 401)
    return err(e.message || 'Server error', 500)
  }
}

/**
// POST /api/scheduled-reports
// Create a new scheduled report
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission('reports.view')
    const { client, profileId } = await getAuthenticatedClient(request)
    if (!client) return err('Unauthorized', 401)

    const body = await request.json()
    const {
      name, reportType, frequency, format,
      filters, recipients, description,
    } = body as {
      name: string
      reportType: string
      frequency: string
      format: string
      filters?: Record<string, any>
      recipients?: string[]
      description?: string
    }

    if (!name || typeof name !== 'string') return err('name is required')
    if (!reportType || !VALID_REPORT_TYPES.includes(reportType)) {
      return err(`reportType must be one of: ${VALID_REPORT_TYPES.join(', ')}`)
    }
    if (!frequency || !VALID_FREQUENCIES.includes(frequency)) {
      return err(`frequency must be one of: ${VALID_FREQUENCIES.join(', ')}`)
    }
    if (!format || !VALID_FORMATS.includes(format)) {
      return err(`format must be one of: ${VALID_FORMATS.join(', ')}`)
    }

    const { data, error } = await client
      .from('scheduled_reports')
      .insert({
        name: name.trim(),
        report_type: reportType,
        frequency,
        output_format: format,
        filters: filters ? JSON.stringify(filters) : null,
        recipients: recipients ? JSON.stringify(recipients) : null,
        description: description || null,
        is_active: true,
        last_run_at: null,
        next_run_at: new Date().toISOString(), // First run is immediate or next scheduled
        created_by: profileId,
        organization_id: session.profile.organizationId,
      })
      .select()
      .single()

    if (error) return err(error.message)
    return ok(data, 201)
  } catch (e: any) {
    if (e.message === 'Non authentifié') return err('Non authentifié', 401)
    if (e.message === 'Permissions insuffisantes') return err('Permissions insuffisantes', 403)
    return err(e.message || 'Server error', 500)
  }
}