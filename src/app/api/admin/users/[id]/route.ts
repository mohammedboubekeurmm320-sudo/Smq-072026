// ============================================================
// GET / PUT / DELETE /api/admin/users/[id]
// Admin-only user management
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient, adminClient } from '@/lib/supabase/server-with-context'
import { requirePermission, hashPassword, verifyPassword } from '@/lib/auth-server'

function ok(data: any, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}
function err(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

/**
// GET /api/admin/users/[id]
// Get a single user's details. Admin only.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePermission('admin.users')
    const { id } = await params

    const { client } = await getAuthenticatedClient(request)
    if (!client) return err('Unauthorized', 401)

    const { data, error } = await client
      .from('profiles')
      .select('id, email, full_name, role, department, job_title, phone, active, last_login_at, created_at, organization_id, avatar_url')
      .eq('id', id)
      .eq('organization_id', session.profile.organizationId)
      .single()

    if (error || !data) return err('User not found', 404)

    // Get membership details
    const { data: membership } = await client
      .from('organization_members')
      .select('role, status, joined_at')
      .eq('user_id', id)
      .eq('organization_id', session.profile.organizationId)
      .limit(1)
      .single()

    return ok({ ...data, membership: membership || null })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return err('Non authentifié', 401)
    if (e.message === 'Permissions insuffisantes') return err('Permissions insuffisantes', 403)
    return err(e.message || 'Server error', 500)
  }
}

/**
// PUT /api/admin/users/[id]
// Update a user. Admin only.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePermission('admin.users')
    const { id } = await params

    const body = await request.json()
    if (!body || typeof body !== 'object') return err('Body requis')

    const validRoles = ['admin', 'quality_manager', 'auditor', 'document_controller', 'executive', 'operator']
    const updateData: Record<string, any> = {}
    const allowedFields = ['full_name', 'role', 'department', 'job_title', 'phone', 'active', 'avatar_url']

    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        if (key === 'role' && !validRoles.includes(body[key])) {
          return err(`role must be one of: ${validRoles.join(', ')}`)
        }
        updateData[key] = body[key]
      }
    }

    // Handle password change
    if (body.new_password) {
      if (!body.current_password) {
        return err('current_password is required to set new_password')
      }

      // Fetch current password hash
      const { data: current } = await adminClient
        .from('profiles')
        .select('password_hash')
        .eq('id', id)
        .single()

      if (!current) return err('User not found', 404)

      const valid = await verifyPassword(body.current_password, current.password_hash)
      if (!valid) return err('Current password is incorrect', 403)

      updateData.password_hash = await hashPassword(body.new_password)
    }

    if (Object.keys(updateData).length === 0) {
      return err('No valid fields to update')
    }

    const { data, error } = await adminClient
      .from('profiles')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', session.profile.organizationId)
      .select('id, email, full_name, role, department, job_title, phone, active')
      .single()

    if (error) return err(error.message)

    // Update membership role if changed
    if (updateData.role) {
      await adminClient
        .from('organization_members')
        .update({ role: updateData.role })
        .eq('user_id', id)
        .eq('organization_id', session.profile.organizationId)
    }

    return ok(data)
  } catch (e: any) {
    if (e.message === 'Non authentifié') return err('Non authentifié', 401)
    if (e.message === 'Permissions insuffisantes') return err('Permissions insuffisantes', 403)
    return err(e.message || 'Server error', 500)
  }
}

/**
// DELETE /api/admin/users/[id]
// Deactivate (soft delete) a user. Admin only.
// Prevents deleting oneself.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePermission('admin.users')
    const { id } = await params

    if (id === session.profile.id) {
      return err('Cannot deactivate your own account', 403)
    }

    const { client } = await getAuthenticatedClient(request)
    if (!client) return err('Unauthorized', 401)

    // Deactivate the user (soft delete)
    const { error } = await adminClient
      .from('profiles')
      .update({ active: false })
      .eq('id', id)
      .eq('organization_id', session.profile.organizationId)

    if (error) return err(error.message)

    // Deactivate membership
    await adminClient
      .from('organization_members')
      .update({ status: 'inactive' })
      .eq('user_id', id)
      .eq('organization_id', session.profile.organizationId)

    return ok({ deactivated: true })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return err('Non authentifié', 401)
    if (e.message === 'Permissions insuffisantes') return err('Permissions insuffisantes', 403)
    return err(e.message || 'Server error', 500)
  }
}