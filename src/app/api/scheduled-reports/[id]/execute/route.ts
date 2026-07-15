// ============================================================
// POST /api/scheduled-reports/[id]/execute
// Manually execute a scheduled report now
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

/**
// POST /api/scheduled-reports/[id]/execute
// Manually trigger execution of a scheduled report immediately.
// Fetches the report config, queries relevant data, and returns the result.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePermission('reports.view')
    const { id } = await params

    const { client } = await getAuthenticatedClient(request)
    if (!client) return err('Unauthorized', 401)

    // Fetch the scheduled report config
    const { data: report, error: fetchError } = await client
      .from('scheduled_reports')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !report) return err('Scheduled report not found', 404)

    // Update last_run_at and next_run_at
    const now = new Date()
    const nextRun = calculateNextRun(report.frequency, now)

    await client
      .from('scheduled_reports')
      .update({
        last_run_at: now.toISOString(),
        next_run_at: nextRun.toISOString(),
      })
      .eq('id', id)

    // Execute the report based on report_type
    let reportData: any = null

    switch (report.report_type) {
      case 'open_capas': {
        const { data } = await client
          .from('capas')
          .select('*')
          .neq('status', 'Closed')
          .order('created_at', { ascending: false })
          .limit(500)
        reportData = { type: 'open_capas', records: data, generatedAt: now.toISOString() }
        break
      }
      case 'open_ncrs': {
        const { data } = await client
          .from('non_conformances')
          .select('*')
          .neq('status', 'Closed')
          .order('created_at', { ascending: false })
          .limit(500)
        reportData = { type: 'open_ncrs', records: data, generatedAt: now.toISOString() }
        break
      }
      case 'overdue_training': {
        const { data } = await client
          .from('training')
          .select('*')
          .neq('status', 'Completed')
          .lt('due_date', now.toISOString())
          .order('due_date', { ascending: true })
          .limit(500)
        reportData = { type: 'overdue_training', records: data, generatedAt: now.toISOString() }
        break
      }
      case 'risk_summary': {
        const { data } = await client
          .from('risks')
          .select('*')
          .neq('status', 'Closed')
          .order('rpn', { ascending: false })
          .limit(500)
        reportData = { type: 'risk_summary', records: data, generatedAt: now.toISOString() }
        break
      }
      case 'audit_schedule': {
        const { data } = await client
          .from('audits')
          .select('*')
          .in('status', ['Planned', 'In Progress'])
          .order('planned_start_date', { ascending: true })
          .limit(500)
        reportData = { type: 'audit_schedule', records: data, generatedAt: now.toISOString() }
        break
      }
      case 'document_expiring': {
        const { data } = await client
          .from('documents')
          .select('*')
          .neq('status', 'Obsolete')
          .neq('status', 'Archived')
          .neq('status', 'Withdrawn')
          .order('review_date', { ascending: true })
          .limit(500)
        reportData = { type: 'document_expiring', records: data, generatedAt: now.toISOString() }
        break
      }
      default: {
        reportData = {
          type: report.report_type,
          message: 'Report type requires custom execution logic',
          generatedAt: now.toISOString(),
          config: report,
        }
      }
    }

    return ok({
      reportId: id,
      reportName: report.name,
      executedAt: now.toISOString(),
      data: reportData,
    })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return err('Non authentifié', 401)
    if (e.message === 'Permissions insuffisantes') return err('Permissions insuffisantes', 403)
    return err(e.message || 'Server error', 500)
  }
}

/** Calculate next run time based on frequency */
function calculateNextRun(frequency: string, from: Date): Date {
  const next = new Date(from)
  switch (frequency) {
    case 'daily':
      next.setDate(next.getDate() + 1)
      break
    case 'weekly':
      next.setDate(next.getDate() + 7)
      break
    case 'monthly':
      next.setMonth(next.getMonth() + 1)
      break
    case 'quarterly':
      next.setMonth(next.getMonth() + 3)
      break
    case 'yearly':
      next.setFullYear(next.getFullYear() + 1)
      break
    default:
      next.setDate(next.getDate() + 1)
  }
  return next
}