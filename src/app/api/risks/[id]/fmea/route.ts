// ============================================================
// GET / POST /api/risks/[id]/fmea
// GET retrieves FMEA analysis steps for a risk
// POST creates/updates FMEA steps
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server-with-context'
import { requireAuth, requirePermission } from '@/lib/auth-server'
import { calcRpn, rpnToLevel } from '@/types/qms'

function ok(data: any, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}
function err(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

const VALID_CONTROL_TYPES = [
  'inherent_safe_design', 'protective_measures', 'information_for_safety',
]

/**
// GET /api/risks/[id]/fmea
// Retrieve FMEA analysis steps for a risk
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

    const { data: risk, error } = await client
      .from('risks')
      .select('id, title, fmea_data, risk_level, rpn, severity, occurrence, detection')
      .eq('id', id)
      .single()

    if (error || !risk) return err('Risk not found', 404)

    const fmeaData = risk.fmea_data
      ? (typeof risk.fmea_data === 'string' ? JSON.parse(risk.fmea_data) : risk.fmea_data)
      : null

    return ok({
      riskId: id,
      title: risk.title,
      currentRpn: risk.rpn,
      currentLevel: risk.risk_level,
      currentScores: {
        severity: risk.severity,
        occurrence: risk.occurrence,
        detection: risk.detection,
      },
      fmeaSteps: fmeaData?.steps || [],
      controls: fmeaData?.controls || [],
    })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return err('Non authentifié', 401)
    return err(e.message || 'Server error', 500)
  }
}

/**
// POST /api/risks/[id]/fmea
// Create or update FMEA analysis steps for a risk
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePermission('risk.update')
    const { id } = await params

    const { client } = await getAuthenticatedClient(request)
    if (!client) return err('Unauthorized', 401)

    // Verify risk exists
    const { data: risk, error: riskError } = await client
      .from('risks')
      .select('id')
      .eq('id', id)
      .single()

    if (riskError || !risk) return err('Risk not found', 404)

    const body = await request.json()
    const { steps, controls } = body as {
      steps?: {
        stepOrder: number
        description: string
        failureMode?: string
        effect?: string
        cause?: string
        currentControl?: string
        severity: number
        occurrence: number
        detection: number
      }[]
      controls?: {
        type: string
        description: string
        implemented: boolean
      }[]
    }

    // Validate steps
    if (steps && Array.isArray(steps)) {
      for (const step of steps) {
        if (typeof step.severity !== 'number' || step.severity < 1 || step.severity > 5) {
          return err('Each FMEA step severity must be a number between 1 and 5')
        }
        if (typeof step.occurrence !== 'number' || step.occurrence < 1 || step.occurrence > 5) {
          return err('Each FMEA step occurrence must be a number between 1 and 5')
        }
        if (typeof step.detection !== 'number' || step.detection < 1 || step.detection > 5) {
          return err('Each FMEA step detection must be a number between 1 and 5')
        }

        // Add computed RPN
        step.stepOrder = step.stepOrder || steps.indexOf(step) + 1
        ;(step as any).rpn = calcRpn(step.severity, step.occurrence, step.detection)
        ;(step as any).riskLevel = rpnToLevel((step as any).rpn)
      }
    }

    // Validate controls
    if (controls && Array.isArray(controls)) {
      for (const ctrl of controls) {
        if (!VALID_CONTROL_TYPES.includes(ctrl.type)) {
          return err(`Control type must be one of: ${VALID_CONTROL_TYPES.join(', ')}`)
        }
      }
    }

    const fmeaData = {
      steps: steps || [],
      controls: controls || [],
      updatedBy: session.profile.id,
      updatedAt: new Date().toISOString(),
    }

    // Calculate overall risk from the highest RPN step
    let maxRpn = 0
    let maxLevel = 'Low'
    if (steps && steps.length > 0) {
      for (const step of steps) {
        const rpn = calcRpn(step.severity, step.occurrence, step.detection)
        if (rpn > maxRpn) {
          maxRpn = rpn
          maxLevel = rpnToLevel(rpn)
        }
      }
    }

    const updateData: Record<string, any> = {
      fmea_data: JSON.stringify(fmeaData),
    }

    // Update risk scores if steps are provided
    if (steps && steps.length > 0) {
      const highestStep = steps.reduce((max, s) => {
        const rpn = calcRpn(s.severity, s.occurrence, s.detection)
        return rpn > calcRpn(max.severity, max.occurrence, max.detection) ? s : max
      }, steps[0])

      updateData.severity = highestStep.severity
      updateData.occurrence = highestStep.occurrence
      updateData.detection = highestStep.detection
      updateData.rpn = maxRpn
      updateData.risk_level = maxLevel
    }

    const { data, error } = await client
      .from('risks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) return err(error.message)
    return ok({ fmeaData, updatedRisk: data })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return err('Non authentifié', 401)
    if (e.message === 'Permissions insuffisantes') return err('Permissions insuffisantes', 403)
    return err(e.message || 'Server error', 500)
  }
}