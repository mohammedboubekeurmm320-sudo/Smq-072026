// ============================================================
// LOGIN API: Custom auth avec bcrypt + JWT signed session cookie
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { signSession } from '@/lib/session'
import { randomUUID } from 'crypto'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  try {
    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'JSON invalide dans le corps de la requête' },
        { status: 400 }
      )
    }
    const { email, password } = body || {}

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
    const bcrypt = await import('bcryptjs')
    const valid = await bcrypt.compare(password, profile.password_hash)
    if (!valid) {
      return NextResponse.json(
        { error: 'Identifiants invalides' },
        { status: 401 }
      )
    }

    // Récupérer l'org et le rôle
    // NOTE: la colonne s'appelle `profile_id` (et non `user_id`) dans le schéma Prisma/SQL.
    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('profile_id', profile.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()

    if (membershipError) {
      console.error('[login] membership lookup failed:', membershipError.message)
    }

    // Créer la session en base pour permettre la révocation.
    // IMPORTANT: la table `sessions` ne contient QUE les colonnes
    // {id, token, profile_id, expires_at, created_at} — ne pas insérer
    // updated_at / user_agent / ip (ces colonnes n'existent pas en base).
    const sessionId = randomUUID()
    const sessionToken = await signSession({
      sub: profile.id,
      email: profile.email,
      name: profile.full_name,
      organizationId: membership?.organization_id || profile.organization_id,
      role: membership?.role || 'member',
      sid: sessionId,
    })
    const { data: sessionRow, error: sessionInsertError } = await supabase
      .from('sessions')
      .insert({
        id: sessionId,
        token: sessionToken,
        profile_id: profile.id,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('id')
      .single()

    if (sessionInsertError || !sessionRow) {
      // 21 CFR Part 11 — fail-closed: si la session ne peut pas être persistée,
      // on refuse la connexion plutôt que d'émettre un JWT non-révocable.
      console.error('[login] session insert failed — denying login:', sessionInsertError?.message)
      return NextResponse.json(
        { error: 'Impossible de créer la session. Veuillez réessayer.' },
        { status: 500 }
      )
    }

    // Mettre à jour last_login
    await supabase
      .from('profiles')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', profile.id)

    // Réponse avec cookie httpOnly (JWT signé)
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

    return response
  } catch (err) {
    console.error('Login error:', err)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}