// ============================================================
// GET / POST /api/admin/users
// GET lists users in org (admin only)
// POST invites a new user (admin only)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient, adminClient } from '@/lib/supabase/server-with-context'
import { requireAuth, requirePermission, hashPassword } from '@/lib/auth-server'

function ok(data: any, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}
function err(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

/**
// GET /api/admin/users?status=active&role=admin&limit=50&offset=0
// List users in the organization. Admin only.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requirePermission('admin.users')

    const { client } = await getAuthenticatedClient(request)
    if (!client) return err('Unauthorized', 401)

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const role = searchParams.get('role')
    const department = searchParams.get('department')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = client
      .from('profiles')
      .select('id, email, full_name, role, department, job_title, phone, active, last_login_at, created_at, organization_id', { count: 'exact' })
      .eq('organization_id', session.profile.organizationId)
      .order('full_name', { ascending: true })

    if (status) query = query.eq('active', status === 'active')
    if (role) query = query.eq('role', role)
    if (department) query = query.eq('department', department)
    if (search) query = query.ilike('full_name', `%${search}%`)

    const { data, count, error } = await query.range(offset, offset + limit - 1)

    if (error) return err(error.message)

    // Enrich with membership status
    const enriched = await Promise.all(
      (data || []).map(async (user: any) => {
        const { data: membership } = await client
          .from('organization_members')
          .select('role, status, joined_at')
          .eq('user_id', user.id)
          .eq('organization_id', session.profile.organizationId)
          .limit(1)
          .single()

        return {
          ...user,
          membership: membership || null,
        }
      })
    )

    return ok({ items: enriched, count: count ?? 0 })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return err('Non authentifié', 401)
    if (e.message === 'Permissions insuffisantes') return err('Permissions insuffisantes', 403)
    return err(e.message || 'Server error', 500)
  }
}

/**
// POST /api/admin/users
// Invite a new user to the organization. Admin only.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission('admin.users')

    const body = await request.json()
    const { email, full_name, password, role, department, job_title } = body as {
      email: string
      full_name: string
      password?: string
      role?: string
      department?: string
      job_title?: string
    }

    if (!email || !full_name) {
      return err('email and full_name are required')
    }

    const validRoles = ['admin', 'quality_manager', 'auditor', 'document_controller', 'executive', 'operator']
    const finalRole = role && validRoles.includes(role) ? role : 'operator'

    // Generate a temporary password if not provided
    const tempPassword = password || Math.random().toString(36).slice(-16)
    const passwordHash = await hashPassword(tempPassword)

    // Use adminClient to bypass RLS for creating user
    const { data: profile, error: profError } = await adminClient
      .from('profiles')
      .insert({
        email: email.toLowerCase().trim(),
        full_name: full_name.trim(),
        password_hash: passwordHash,
        role: finalRole,
        department: department || null,
        job_title: job_title || null,
        organization_id: session.profile.organizationId,
        active: true,
      })
      .select('id, email, full_name, role, department, job_title, active')
      .single()

    if (profError) {
      if (profError.code === '23505') {
        return err('Email already exists', 409)
      }
      return err(profError.message)
    }

    // Create organization membership
    const { error: memberError } = await adminClient
      .from('organization_members')
      .insert({
        organization_id: session.profile.organizationId,
        user_id: profile.id,
        role: finalRole,
        status: 'active',
      })

    if (memberError) {
      // Rollback: delete the profile
      await adminClient.from('profiles').delete().eq('id', profile.id)
      return err(memberError.message)
    }

    return ok({
      user: profile,
      message: !password ? 'User created. They will need to set their password on first login.' : undefined,
    }, 201)
  } catch (e: any) {
    if (e.message === 'Non authentifié') return err('Non authentifié', 401)
    if (e.message === 'Permissions insuffisantes') return err('Permissions insuffisantes', 403)
    return err(e.message || 'Server error', 500)
  }
}