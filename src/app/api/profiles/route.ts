// ============================================================
// Route API Profiles: /api/profiles et /api/profiles/[id]
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/server-with-context'
import { getServerSession, hashPassword } from '@/lib/auth-server'
import { randomUUID } from 'crypto'

// GET /api/profiles → liste des profils de l'org
export async function GET() {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    const { data, error } = await adminClient
      .from('profiles')
      .select('id, email, full_name, role, department, job_title, phone, active, last_login_at, created_at, organization_id')
      .eq('organization_id', session.profile.organizationId)
      .order('full_name', { ascending: true })

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: { profiles: data } })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// POST /api/profiles → créer un profil
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    const { email, full_name, password, role, department, job_title } = await req.json()
    if (!email || !full_name || !password) {
      return NextResponse.json({ success: false, error: 'Email, nom et mot de passe requis' }, { status: 400 })
    }

    const validRoles = ['admin', 'quality_manager', 'auditor', 'document_controller', 'executive', 'operator']
    const finalRole = validRoles.includes(role) ? role : 'operator'

    const passwordHash = await hashPassword(password)

    const { data, error } = await adminClient
      .from('profiles')
      .insert({
        id: randomUUID(),
        email: email.toLowerCase().trim(),
        full_name: full_name,
        password_hash: passwordHash,
        role: finalRole,
        department: department || null,
        job_title: job_title || null,
        organization_id: session.profile.organizationId,
        active: true,
        updated_at: new Date().toISOString(),
      })
      .select('id, email, full_name, role, department, job_title, active')
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ success: false, error: 'Email déjà utilisé' }, { status: 409 })
      }
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: { profile: data } }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
