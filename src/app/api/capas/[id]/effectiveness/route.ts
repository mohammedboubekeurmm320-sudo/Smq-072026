// ============================================================
// GET / POST /api/capas/[id]/effectiveness
// GET retrieves effectiveness check for a CAPA
// POST creates/updates effectiveness check
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

const VALID_RESULTS = ['Effective', 'Not Effective', 'Pending Review']

/**
// GET /api/capas/[id]/effectiveness
// Retrieve the effectiveness check data for a CAPA
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    const { id } = await params

    const { client } = await getAuthenticatedClient(request)
    if (!client) return err('Unauthorized', 401)

    const { data: capa, error } = await client
      .from('capas')
      .select('id, title, effectiveness_check, effectiveness_result, effectiveness_date')
      .eq('id', id)
      .single()

    if (error || !capa) return err('CAPA not found', 404)

    const check = capa.effectiveness_check
      ? (typeof capa.effectiveness_check === 'string' ? JSON.parse(capa.effectiveness_check) : capa.effectiveness_check)
      : null

    return ok({
      capaId: id,
      title: capa.title,
      effectivenessResult: capa.effectiveness_result,
      effectivenessDate: capa.effectiveness_date,
      effectivenessCheck: check,
    })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return err('Non authentifié', 401)
    return err(e.message || 'Server error', 500)
  }
}

/**
// POST /api/capas/[id]/effectiveness
// Create or update the effectiveness check for a CAPA
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePermission('capa.approve')
    const { id } = await params

    const { client } = await getAuthenticatedClient(request)
    if (!client) return err('Unauthorized', 401)

    // Verify CAPA exists
    const { data: capa, error: capaError } = await client
      .from('capas')
      .select('id, status')
      .eq('id', id)
      .single()

    if (capaError || !capa) return err('CAPA not found', 404)

    if (capa.status !== 'Effectiveness Check' && capa.status !== 'Closed') {
      return err('CAPA must be in Effectiveness Check or Closed status to record effectiveness', 400)
    }

    const body = await request.json()
    const { result, criteria, evidence, comments, dueDate } = body as {
      result: string
      criteria?: string[]
      evidence?: string[]
      comments?: string
      dueDate?: string
    }

    if (!result || !VALID_RESULTS.includes(result)) {
      return err(`result must be one of: ${VALID_RESULTS.join(', ')}`)
    }

    const effectivenessCheck = {
      criteria: criteria || [],
      evidence: evidence || [],
      comments: comments || null,
      evaluatedBy: session.profile.id,
      evaluatedAt: new Date().toISOString(),
    }

    const updateData: Record<string, any> = {
      effectiveness_check: JSON.stringify(effectivenessCheck),
      effectiveness_result: result,
      effectiveness_date: new Date().toISOString(),
    }

    // Auto-close if effective
    if (result === 'Effective') {
      updateData.status = 'Closed'
      updateData.closed_at = new Date().toISOString()
    }

    const { data, error } = await client
      .from('capas')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) return err(error.message)
    return ok({ effectivenessCheck, updatedCapa: data })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return err('Non authentifié', 401)
    if (e.message === 'Permissions insuffisantes') return err('Permissions insuffisantes', 403)
    return err(e.message || 'Server error', 500)
  }
}