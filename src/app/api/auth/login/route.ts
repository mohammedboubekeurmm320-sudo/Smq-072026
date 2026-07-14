// ============================================================
// LOGIN API: Custom auth avec bcrypt + base64 session cookie
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email et mot de passe requis' },
        { status: 400 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Chercher le profil par email
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, password_hash, active, organization_id')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (error || !profile) {
      return NextResponse.json(
        { error: 'Identifiants invalides' },
        { status: 401 }
      )
    }

    if (!profile.active) {
      return NextResponse.json(
        { error: 'Compte désactivé' },
        { status: 403 }
      )
    }

    // Vérifier le mot de passe (bcrypt)
    // Prérequis: npm install bcryptjs @types/bcryptjs
    const bcrypt = await import('bcryptjs')
    const valid = await bcrypt.compare(password, profile.password_hash)
    if (!valid) {
      return NextResponse.json(
        { error: 'Identifiants invalides' },
        { status: 401 }
      )
    }

    // Récupérer l'org et le rôle
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', profile.id)
      .eq('status', 'active')
      .limit(1)
      .single()

    // Créer le payload de session
    const sessionPayload = {
      sub: profile.id,
      email: profile.email,
      name: profile.full_name,
      organizationId: membership?.organization_id || profile.organization_id,
      role: membership?.role || 'member',
      // Expire dans 24h
      exp: Date.now() + 24 * 60 * 60 * 1000,
    }

    // Encoder en base64
    const sessionToken = Buffer.from(
      JSON.stringify(sessionPayload)
    ).toString('base64')

    // Mettre à jour last_login
    await supabase
      .from('profiles')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', profile.id)

    // Créer la session DB
    await supabase.from('sessions').insert({
      profile_id: profile.id,
      user_agent: request.headers.get('user-agent') || null,
      ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })

    // Réponse avec cookie httpOnly
    const response = NextResponse.json({
      success: true,
      user: {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        role: membership?.role || 'member',
      },
      organizationId: membership?.organization_id || profile.organization_id,
    })

    response.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24,
    })

    if (membership?.organization_id) {
      response.cookies.set('current_org_id', membership.organization_id, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
      })
    }

    return response
  } catch (err) {
    console.error('Login error:', err)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}