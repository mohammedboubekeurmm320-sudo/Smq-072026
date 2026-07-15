// ============================================================
// GET /api/dashboard/trends
// Monthly trend data for KPIs (last 12 months)
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

/**
// GET /api/dashboard/trends?months=12
// Return monthly trend data for key KPIs over the last N months.
// Each trend point contains the month label and count for that entity.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const { client } = await getAuthenticatedClient(request)
    if (!client) return err('Unauthorized', 401)

    const { searchParams } = new URL(request.url)
    const months = Math.min(parseInt(searchParams.get('months') || '12'), 24)

    // Generate month boundaries
    const monthLabels: string[] = []
    const monthStarts: string[] = []
    const now = new Date()

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      monthLabels.push(d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }))
      monthStarts.push(d.toISOString())
    }

    // Add end boundary (first day of next month)
    const endBoundary = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()

    // Fetch all records created within the range, grouped by month
    const startDate = monthStarts[0]

    const entities = [
      { name: 'documents', table: 'documents' as const },
      { name: 'capas', table: 'capas' as const },
      { name: 'ncrs', table: 'non_conformances' as const },
      { name: 'deviations', table: 'deviations' as const },
      { name: 'changeControls', table: 'change_controls' as const },
      { name: 'audits', table: 'audits' as const },
      { name: 'training', table: 'training' as const },
      { name: 'risks', table: 'risks' as const },
    ]

    const trends: Record<string, number[]> = {}
    for (const entity of entities) {
      trends[entity.name] = []

      const { data, error } = await client
        .from(entity.table)
        .select('created_at')
        .gte('created_at', startDate)
        .lt('created_at', endBoundary)
        .order('created_at', { ascending: true })

      if (error) {
        trends[entity.name] = new Array(months).fill(0)
        continue
      }

      // Bucket records by month
      const records = data || []
      for (let i = 0; i < months; i++) {
        const monthStart = monthStarts[i]
        const monthEnd = i < months - 1 ? monthStarts[i + 1] : endBoundary

        const count = records.filter((r: any) =>
          r.created_at >= monthStart && r.created_at < monthEnd
        ).length

        trends[entity.name].push(count)
      }
    }

    // Calculate closed items trends for CAPA and NCR
    const closedCapas: number[] = []
    const closedNcrs: number[] = []

    for (let i = 0; i < months; i++) {
      const monthStart = monthStarts[i]
      const monthEnd = i < months - 1 ? monthStarts[i + 1] : endBoundary

      const [capaRes, ncrRes] = await Promise.all([
        client
          .from('capas')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'Closed')
          .gte('updated_at', monthStart)
          .lt('updated_at', monthEnd),
        client
          .from('non_conformances')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'Closed')
          .gte('updated_at', monthStart)
          .lt('updated_at', monthEnd),
      ])

      closedCapas.push(capaRes.count ?? 0)
      closedNcrs.push(ncrRes.count ?? 0)
    }

    return ok({
      months: monthLabels,
      created: trends,
      closed: {
        capas: closedCapas,
        ncrs: closedNcrs,
      },
    })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return err('Non authentifié', 401)
    return err(e.message || 'Server error', 500)
  }
}