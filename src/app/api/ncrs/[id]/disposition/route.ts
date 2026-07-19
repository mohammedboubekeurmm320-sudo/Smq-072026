// ============================================================
// GET / POST /api/ncrs/[id]/disposition
// GET retrieves NCR disposition decision
// POST creates/updates NCR disposition
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

const VALID_DISPOSITIONS = [
  'Use As Is', 'Rework', 'Scrap', 'Return to Supplier', 'Concession', 'Pending',
]

/**
// GET /api/ncrs/[id]/disposition
// Retrieve the disposition decision for an NCR
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

    const { data: ncr, error } = await client
      .from('non_conformances')
      .select('id, title, disposition, disposition_data, disposition_by, disposition_at, status')
      .eq('id', id)
      .single()

    if (error || !ncr) return err('NCR not found', 404)

    const dispositionData = ncr.disposition_data
      ? (typeof ncr.disposition_data === 'string' ? JSON.parse(ncr.disposition_data) : ncr.disposition_data)
      : null

    return ok({
      ncrId: id,
      title: ncr.title,
      disposition: ncr.disposition,
      dispositionBy: ncr.disposition_by,
      dispositionAt: ncr.disposition_at,
      status: ncr.status,
      dispositionDetails: dispositionData,
    })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return err('Non authentifié', 401)
    return err(e.message || 'Server error', 500)
  }
}

/**
// POST /api/ncrs/[id]/disposition
// Create or update the disposition decision for an NCR
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePermission('ncr.approve')
    const { id } = await params

    const { client, profileId } = await getAuthenticatedClient(request)
    if (!client) return err('Unauthorized', 401)

    // Verify NCR exists and is in the right status
    const { data: ncr, error: ncrError } = await client
      .from('non_conformances')
      .select('id, status')
      .eq('id', id)
      .single()

    if (ncrError || !ncr) return err('NCR not found', 404)

    if (ncr.status !== 'Pending Disposition' && ncr.status !== 'Open' && ncr.status !== 'Under Investigation') {
      return err('NCR must be in Pending Disposition, Open, or Under Investigation status', 400)
    }

    const body = await request.json()
    const {
      disposition, reason, investigationSummary,
      reworkInstructions, scrapQuantity, lotNumbers,
      requiresCapa, capaReference,
    } = body as {
      disposition: string
      reason: string
      investigationSummary?: string
      reworkInstructions?: string
      scrapQuantity?: number
      lotNumbers?: string[]
      requiresCapa?: boolean
      capaReference?: string
    }

    if (!disposition || !VALID_DISPOSITIONS.includes(disposition)) {
      return err(`disposition must be one of: ${VALID_DISPOSITIONS.join(', ')}`)
    }
    if (!reason || typeof reason !== 'string') {
      return err('reason is required')
    }

    const dispositionData = {
      reason,
      investigationSummary: investigationSummary || null,
      reworkInstructions: reworkInstructions || null,
      scrapQuantity: scrapQuantity || null,
      lotNumbers: lotNumbers || null,
      requiresCapa: requiresCapa ?? false,
      capaReference: capaReference || null,
    }

    const updateData: Record<string, any> = {
      disposition,
      disposition_data: JSON.stringify(dispositionData),
      disposition_by: profileId,
      disposition_at: new Date().toISOString(),
    }

    // If disposition is final, close the NCR
    if (disposition !== 'Pending') {
      updateData.status = 'Closed'
      updateData.closed_at = new Date().toISOString()
    }

    const { data, error } = await client
      .from('non_conformances')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) return err(error.message)
    return ok({ disposition, dispositionData, updatedNcr: data })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return err('Non authentifié', 401)
    if (e.message === 'Permissions insuffisantes') return err('Permissions insuffisantes', 403)
    return err(e.message || 'Server error', 500)
  }
}