// ============================================================
// GET / POST /api/batch-records/[id]/steps
// GET lists manufacturing steps for a batch record
// POST creates new manufacturing steps
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

const VALID_STEP_TYPES = [
  'Weighing', 'Mixing', 'Filtration', 'Filling', 'Inspection',
  'Labeling', 'Packaging', 'QC Testing', 'Other',
]

const VALID_STEP_STATUSES = ['Pending', 'In Progress', 'Completed', 'Failed']

/**
// GET /api/batch-records/[id]/steps
// List manufacturing steps for a batch record
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

    // Verify batch record exists
    const { data: batch, error: batchError } = await client
      .from('batch_records')
      .select('id, batch_number, manufacturing_steps')
      .eq('id', id)
      .single()

    if (batchError || !batch) return err('Batch record not found', 404)

    const steps = batch.manufacturing_steps
      ? (typeof batch.manufacturing_steps === 'string' ? JSON.parse(batch.manufacturing_steps) : batch.manufacturing_steps)
      : []

    return ok({
      batchId: id,
      batchNumber: batch.batch_number,
      steps: steps.sort((a: any, b: any) => (a.step_order || 0) - (b.step_order || 0)),
    })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return err('Non authentifié', 401)
    return err(e.message || 'Server error', 500)
  }
}

/**
// POST /api/batch-records/[id]/steps
// Add or update manufacturing steps for a batch record
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePermission('batch.update')
    const { id } = await params

    const { client, profileId } = await getAuthenticatedClient(request)
    if (!client) return err('Unauthorized', 401)

    // Verify batch record exists
    const { data: batch, error: batchError } = await client
      .from('batch_records')
      .select('id, batch_number, manufacturing_steps, status')
      .eq('id', id)
      .single()

    if (batchError || !batch) return err('Batch record not found', 404)

    const body = await request.json()
    const { steps } = body as {
      steps: {
        stepOrder: number
        stepName: string
        stepType: string
        instructions?: string
        expectedValue?: string
        status?: string
        actualValue?: string
      }[]
    }

    if (!steps || !Array.isArray(steps) || steps.length === 0) {
      return err('steps array is required with at least one step')
    }

    // Validate steps
    for (const step of steps) {
      if (!step.stepName || typeof step.stepName !== 'string') {
        return err('Each step must have a stepName')
      }
      if (step.stepType && !VALID_STEP_TYPES.includes(step.stepType)) {
        return err(`stepType must be one of: ${VALID_STEP_TYPES.join(', ')}`)
      }
      if (step.status && !VALID_STEP_STATUSES.includes(step.status)) {
        return err(`step status must be one of: ${VALID_STEP_STATUSES.join(', ')}`)
      }
    }

    // Build steps with metadata
    const processedSteps = steps.map(step => ({
      id: step.stepOrder?.toString() || crypto.randomUUID(),
      stepOrder: step.stepOrder || steps.indexOf(step) + 1,
      stepName: step.stepName,
      stepType: step.stepType || 'Other',
      instructions: step.instructions || null,
      expectedValue: step.expectedValue || null,
      actualValue: step.actualValue || null,
      status: step.status || 'Pending',
      operatorId: (step.status === 'In Progress' || step.status === 'Completed') ? profileId : null,
      performedAt: step.status === 'Completed' ? new Date().toISOString() : null,
    }))

    // Merge with existing steps or replace
    const existingSteps = batch.manufacturing_steps
      ? (typeof batch.manufacturing_steps === 'string' ? JSON.parse(batch.manufacturing_steps) : batch.manufacturing_steps)
      : []

    // Simple merge: replace steps with same stepOrder, add new ones
    const mergedMap = new Map<string, any>()
    for (const s of existingSteps) {
      mergedMap.set(String(s.stepOrder), s)
    }
    for (const s of processedSteps) {
      mergedMap.set(String(s.stepOrder), s)
    }
    const mergedSteps = Array.from(mergedMap.values())
      .sort((a, b) => (a.step_order || a.stepOrder || 0) - (b.step_order || b.stepOrder || 0))

    const { data, error } = await client
      .from('batch_records')
      .update({ manufacturing_steps: JSON.stringify(mergedSteps) })
      .eq('id', id)
      .select()
      .single()

    if (error) return err(error.message)
    return ok({ steps: mergedSteps, updatedBatch: data })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return err('Non authentifié', 401)
    if (e.message === 'Permissions insuffisantes') return err('Permissions insuffisantes', 403)
    return err(e.message || 'Server error', 500)
  }
}