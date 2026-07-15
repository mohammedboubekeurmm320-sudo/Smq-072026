// ============================================================
// GET / PUT / DELETE /api/scheduled-reports/[id]
// Single scheduled report management
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
// GET /api/scheduled-reports/[id]
// Retrieve a single scheduled report
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

    const { data, error } = await client
      .from('scheduled_reports')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) return err('Scheduled report not found', 404)

    return ok(data)
  } catch (e: any) {
    if (e.message === 'Non authentifié') return err('Non authentifié', 401)
    return err(e.message || 'Server error', 500)
  }
}

/**
// PUT /api/scheduled-reports/[id]
// Update a scheduled report
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePermission('reports.view')
    const { id } = await params

    const { client } = await getAuthenticatedClient(request)
    if (!client) return err('Unauthorized', 401)

    const body = await request.json()
    if (!body || typeof body !== 'object') return err('Body requis')

    const updateData: Record<string, any> = {}
    const allowedFields = [
      'name', 'report_type', 'frequency', 'output_format',
      'filters', 'recipients', 'description',
    ]

    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        updateData[key] = typeof body[key] === 'object' ? JSON.stringify(body[key]) : body[key]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return err('No valid fields to update')
    }

    const { data, error } = await client
      .from('scheduled_reports')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) return err(error.message)
    return ok(data)
  } catch (e: any) {
    if (e.message === 'Non authentifié') return err('Non authentifié', 401)
    if (e.message === 'Permissions insuffisantes') return err('Permissions insuffisantes', 403)
    return err(e.message || 'Server error', 500)
  }
}

/**
// DELETE /api/scheduled-reports/[id]
// Delete a scheduled report
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePermission('reports.view')
    const { id } = await params

    const { client } = await getAuthenticatedClient(request)
    if (!client) return err('Unauthorized', 401)

    const { error } = await client
      .from('scheduled_reports')
      .delete()
      .eq('id', id)

    if (error) return err(error.message)
    return ok({ deleted: true })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return err('Non authentifié', 401)
    if (e.message === 'Permissions insuffisantes') return err('Permissions insuffisantes', 403)
    return err(e.message || 'Server error', 500)
  }
}