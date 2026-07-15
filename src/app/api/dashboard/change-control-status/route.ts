// ============================================================
// GET /api/dashboard/change-control-status
// Change control status distribution for dashboard
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server-with-context'
import { requireAuth } from '@/lib/auth-server'

function ok(data: any) {
  return NextResponse.json({ success: true, data })
}
function err(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

const ALL_STATUSES = ['Requested', 'Under Review', 'Approved', 'In Implementation', 'Completed', 'Rejected']
const ALL_CATEGORIES = [
  'Process', 'Equipment', 'Facility', 'Document', 'Material', 'Computer System',
  'Organizational', 'Manufacturing', 'Regulatory', 'Supply Chain', 'Warehouse', 'Other',
]
const ALL_TYPES = ['Planned', 'Unplanned', 'Emergency']

/**
// GET /api/dashboard/change-control-status
// Return change control status distribution for the organization.
// Includes status counts, category/type breakdown, and recent items.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const { client } = await getAuthenticatedClient(request)
    if (!client) return err('Unauthorized', 401)

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('recentLimit') || '10')

    // Fetch all change controls
    const { data: changeControls, error } = await client
      .from('change_controls')
      .select('id, title, status, category, cc_type, priority, created_at, due_date')
      .order('created_at', { ascending: false })

    if (error) return err(error.message)

    const all = changeControls || []

    // Status distribution
    const byStatus: Record<string, number> = {}
    for (const s of ALL_STATUSES) {
      byStatus[s] = all.filter((c: any) => c.status === s).length
    }

    // Category distribution
    const byCategory: Record<string, number> = {}
    for (const c of ALL_CATEGORIES) {
      const count = all.filter((cc: any) => cc.category === c).length
      if (count > 0) byCategory[c] = count
    }

    // Type distribution
    const byType: Record<string, number> = {}
    for (const t of ALL_TYPES) {
      byType[t] = all.filter((c: any) => c.cc_type === t).length
    }

    // Overdue count
    const now = new Date()
    const overdue = all.filter((c: any) =>
      c.due_date && new Date(c.due_date) < now &&
      c.status !== 'Completed' && c.status !== 'Rejected'
    ).length

    // Pending approval (items stuck in Under Review)
    const pendingApproval = all.filter((c: any) => c.status === 'Under Review').length

    // In implementation
    const inImplementation = all.filter((c: any) => c.status === 'In Implementation').length

    // Completion rate
    const total = all.length
    const completed = byStatus['Completed'] || 0
    const rejected = byStatus['Rejected'] || 0
    const completionRate = total > 0 ? Math.round(((completed + rejected) / total) * 100) : 0

    // Recent change controls
    const recent = all.slice(0, limit)

    return ok({
      total,
      byStatus,
      byCategory,
      byType,
      overdue,
      pendingApproval,
      inImplementation,
      completionRate,
      recent,
    })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return err('Non authentifié', 401)
    return err(e.message || 'Server error', 500)
  }
}