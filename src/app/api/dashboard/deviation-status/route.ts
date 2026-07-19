// ============================================================
// GET /api/dashboard/deviation-status
// Deviation status distribution for dashboard
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

const ALL_STATUSES = ['Open', 'Under Investigation', 'Pending QA Review', 'Approved', 'Closed']
const ALL_CATEGORIES = ['Process', 'Equipment', 'Material', 'Environment', 'Personnel', 'Documentation']

/**
// GET /api/dashboard/deviation-status
// Return deviation status distribution for the organization.
// Includes status counts, category breakdown, and recent deviations.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const { client } = await getAuthenticatedClient(request)
    if (!client) return err('Unauthorized', 401)

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('recentLimit') || '10')

    // Fetch all deviations
    const { data: deviations, error } = await client
      .from('deviations')
      .select('id, title, status, category, deviation_type, severity, created_at, due_date')
      .order('created_at', { ascending: false })

    if (error) return err(error.message)

    const all = deviations || []

    // Status distribution
    const byStatus: Record<string, number> = {}
    for (const s of ALL_STATUSES) {
      byStatus[s] = all.filter((d: any) => d.status === s).length
    }

    // Category distribution
    const byCategory: Record<string, number> = {}
    for (const c of ALL_CATEGORIES) {
      byCategory[c] = all.filter((d: any) => d.category === c).length
    }

    // Type distribution (Planned vs Unplanned)
    const byType: Record<string, number> = {
      Planned: all.filter((d: any) => d.deviation_type === 'Planned').length,
      Unplanned: all.filter((d: any) => d.deviation_type === 'Unplanned').length,
    }

    // Overdue count
    const now = new Date()
    const overdue = all.filter((d: any) =>
      d.due_date && new Date(d.due_date) < now && d.status !== 'Closed' && d.status !== 'Approved'
    ).length

    // Recent deviations
    const recent = all.slice(0, limit)

    return ok({
      total: all.length,
      byStatus,
      byCategory,
      byType,
      overdue,
      recent,
    })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return err('Non authentifié', 401)
    return err(e.message || 'Server error', 500)
  }
}