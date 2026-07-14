// ============================================================
// Route API Profiles: /api/profiles/[id] (update, delete)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server-with-context'
import { getServerSession, hashPassword } from '@/lib/auth-server'

interface Ctx { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }
    const { id } = await params
    const body = await req.json()

    const fakeReq = { headers: new Headers() } as any
    const { client } = await getAuthenticatedClient(fakeReq)
    if (!client) {
      return NextResponse.json({ success: false, error: 'Client error' }, { status: 500 })
    }

    const { data: existing } = await client
      .from('profiles')
      .select('id, organization_id')
      .eq('id', id)
      .eq('organization_id', session.profile.organizationId)
      .single()

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Utilisateur introuvable' }, { status: 404 })
    }

    const updateData: Record<string, any> = {}
    if (body.full_name !== undefined) updateData.full_name = body.full_name
    if (body.email !== undefined) updateData.email = body.email.toLowerCase().trim()
    if (body.role !== undefined) updateData.role = body.role
    if (body.department !== undefined) updateData.department = body.department
    if (body.job_title !== undefined) updateData.job_title = body.job_title
    if (body.active !== undefined) updateData.active = body.active
    if (body.password) updateData.password_hash = await hashPassword(body.password)

    const { data, error } = await client
      .from('profiles')
      .update(updateData)
      .eq('id', id)
      .select('id, email, full_name, role, department, job_title, active')
      .single()

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: { profile: data } })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }
    const { id } = await params

    if (id === session.profile.id) {
      return NextResponse.json({ success: false, error: 'Vous ne pouvez pas supprimer votre propre compte' }, { status: 400 })
    }

    const fakeReq = { headers: new Headers() } as any
    const { client } = await getAuthenticatedClient(fakeReq)
    if (!client) {
      return NextResponse.json({ success: false, error: 'Client error' }, { status: 500 })
    }

    const { error } = await client
      .from('profiles')
      .delete()
      .eq('id', id)
      .eq('organization_id', session.profile.organizationId)

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: { deleted: true } })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}