// ============================================================
// GET / POST /api/capas/[id]/five-why
// GET retrieves 5-Why analysis for a CAPA
// POST creates/updates 5-Why analysis
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
// GET /api/capas/[id]/five-why
// Retrieve the 5-Why root cause analysis for a CAPA
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
      .select('id, title, root_cause_analysis, five_why_analysis')
      .eq('id', id)
      .single()

    if (error || !capa) return err('CAPA not found', 404)

    // 5-Why analysis can be in root_cause_analysis or a dedicated column
    const analysis = capa.five_why_analysis || capa.root_cause_analysis

    return ok({
      capaId: id,
      title: capa.title,
      analysis: analysis
        ? (typeof analysis === 'string' ? JSON.parse(analysis) : analysis)
        : null,
    })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return err('Non authentifié', 401)
    return err(e.message || 'Server error', 500)
  }
}

/**
// POST /api/capas/[id]/five-why
// Save or update the 5-Why root cause analysis for a CAPA
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePermission('capa.update')
    const { id } = await params

    const { client } = await getAuthenticatedClient(request)
    if (!client) return err('Unauthorized', 401)

    // Verify CAPA exists
    const { data: capa, error: capaError } = await client
      .from('capas')
      .select('id')
      .eq('id', id)
      .single()

    if (capaError || !capa) return err('CAPA not found', 404)

    const body = await request.json()
    const { whys, rootCause, category } = body as {
      whys: string[] // Array of 5 why strings
      rootCause?: string
      category?: string
    }

    if (!whys || !Array.isArray(whys) || whys.length === 0) {
      return err('whys array is required with at least one entry')
    }

    if (whys.length > 5) {
      return err('5-Why analysis should have at most 5 levels')
    }

    const analysis = {
      whys,
      rootCause: rootCause || whys[whys.length - 1],
      category: category || null,
      completedBy: session.profile.id,
      completedAt: new Date().toISOString(),
    }

    // Try to store in five_why_analysis column first, fall back to root_cause_analysis
    const updateData: Record<string, any> = {
      root_cause_analysis: JSON.stringify(analysis),
    }

    // Also try five_why_analysis if column exists
    try {
      updateData.five_why_analysis = JSON.stringify(analysis)
    } catch {
      // Column may not exist, that's ok
    }

    if (category) updateData.root_cause_category = category

    const { data, error } = await client
      .from('capas')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) return err(error.message)
    return ok({ analysis })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return err('Non authentifié', 401)
    if (e.message === 'Permissions insuffisantes') return err('Permissions insuffisantes', 403)
    return err(e.message || 'Server error', 500)
  }
}