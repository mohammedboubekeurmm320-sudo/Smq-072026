// ============================================================
// GET / PUT / DELETE a single organization by ID
// GET returns org with member count
// PUT requires admin role
// DELETE requires owner role
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server-with-context'
import { getServerSession, requireAuth, requirePermission } from '@/lib/auth-server'

function ok(data: any, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}
function err(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

/**
 * GET /api/organizations/[id]
 * Retrieve a single organization with member count
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth()
    const { id } = await params

    const { client } = await getAuthenticatedClient(_request)
    if (!client) return err('Unauthorized', 401)

    const { data: org, error } = await client
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !org) return err('Organization not found', 404)

    // Get member count
    const { count } = await client
      .from('organization_members')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', id)
      .eq('status', 'active')

    return ok({ ...org, memberCount: count ?? 0 })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return err('Non authentifié', 401)
    return err(e.message || 'Server error', 500)
  }
}

/**
 * PUT /api/organizations/[id]
 * Update organization. Requires admin role.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePermission('admin.settings')
    const { id } = await params

    const { client } = await getAuthenticatedClient(request)
    if (!client) return err('Unauthorized', 401)

    const body = await request.json()
    if (!body || typeof body !== 'object') return err('Body requis')

    const updateData: Record<string, any> = {}
    const allowedFields = ['name', 'slug', 'settings', 'industry_type', 'logo_url', 'address', 'phone', 'website']

    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        updateData[key] = key === 'settings' && typeof body[key] === 'object'
          ? JSON.stringify(body[key])
          : body[key]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return err('No valid fields to update')
    }

    const { data, error } = await client
      .from('organizations')
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
 * DELETE /api/organizations/[id]
 * Delete organization. Requires owner role (admin).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePermission('admin.settings')
    const { id } = await params

    const { client } = await getAuthenticatedClient(request)
    if (!client) return err('Unauthorized', 401)

    // Verify the session user is an admin/owner of this org
    const { data: membership } = await client
      .from('organization_members')
      .select('role')
      .eq('organization_id', id)
      .eq('user_id', session.profile.id)
      .eq('status', 'active')
      .single()

    if (!membership || (membership.role !== 'admin')) {
      return err('Only organization owner can delete', 403)
    }

    const { error } = await client
      .from('organizations')
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