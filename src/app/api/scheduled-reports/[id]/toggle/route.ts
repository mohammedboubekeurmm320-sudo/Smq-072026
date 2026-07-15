// ============================================================
// POST /api/scheduled-reports/[id]/toggle
// Toggle a scheduled report active/inactive
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
// POST /api/scheduled-reports/[id]/toggle
// Toggle a scheduled report between active and inactive
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

    // Fetch current state
    const { data: current, error: fetchError } = await client
      .from('scheduled_reports')
      .select('id, is_active')
      .eq('id', id)
      .single()

    if (fetchError || !current) return err('Scheduled report not found', 404)

    const newActive = !current.is_active

    const { data, error } = await client
      .from('scheduled_reports')
      .update({ is_active: newActive })
      .eq('id', id)
      .select()
      .single()

    if (error) return err(error.message)
    return ok({ ...data, toggledTo: newActive ? 'active' : 'inactive' })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return err('Non authentifié', 401)
    if (e.message === 'Permissions insuffisantes') return err('Permissions insuffisantes', 403)
    return err(e.message || 'Server error', 500)
  }
}