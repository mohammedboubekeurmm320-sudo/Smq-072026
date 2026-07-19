// ============================================================
// GET / PUT / DELETE /api/custom-fields/[id]
// Single custom field definition management
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
// GET /api/custom-fields/[id]
// Retrieve a single custom field definition
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
      .from('record_type_definitions')
      .select('*')
      .eq('id', id)
      .eq('is_system', false)
      .single()

    if (error || !data) return err('Custom field not found', 404)

    return ok(data)
  } catch (e: any) {
    if (e.message === 'Non authentifié') return err('Non authentifié', 401)
    return err(e.message || 'Server error', 500)
  }
}

/**
// PUT /api/custom-fields/[id]
// Update a custom field definition
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePermission('recordtypes.update')
    const { id } = await params

    const { client } = await getAuthenticatedClient(request)
    if (!client) return err('Unauthorized', 401)

    const body = await request.json()
    if (!body || typeof body !== 'object') return err('Body requis')

    const updateData: Record<string, any> = {}
    const allowedFields = ['name', 'description', 'table_name', 'fields', 'status_flow']

    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        updateData[key] = typeof body[key] === 'object' ? JSON.stringify(body[key]) : body[key]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return err('No valid fields to update')
    }

    // Ensure the record exists and belongs to this org
    const { data: existing } = await client
      .from('record_type_definitions')
      .select('id')
      .eq('id', id)
      .eq('is_system', false)
      .single()

    if (!existing) return err('Custom field not found', 404)

    const { data, error } = await client
      .from('record_type_definitions')
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
// DELETE /api/custom-fields/[id]
// Delete a custom field definition (non-system only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePermission('recordtypes.delete')
    const { id } = await params

    const { client } = await getAuthenticatedClient(request)
    if (!client) return err('Unauthorized', 401)

    // Ensure it's a custom (non-system) field
    const { data: existing } = await client
      .from('record_type_definitions')
      .select('id, is_system')
      .eq('id', id)
      .single()

    if (!existing) return err('Custom field not found', 404)
    if (existing.is_system) return err('Cannot delete system-defined fields', 403)

    const { error } = await client
      .from('record_type_definitions')
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