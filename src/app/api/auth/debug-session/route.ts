// ============================================================
// DEBUG SESSION — /api/auth/debug-session
// TEMPORAIRE — À SUPPRIMER APRÈS DIAGNOSTIC
// ============================================================
// Simule exactement ce que fait le middleware avec le cookie session.
// À appeler DEPUIS LE NAVIGATEUR après avoir tenté de se connecter.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  // 1. Lire le cookie session
  const sessionCookie = request.cookies.get('session')
  const rawCookie = sessionCookie?.value

  if (!rawCookie) {
    return NextResponse.json({
      step: '1. Read cookie',
      status: 'NO session cookie found',
      hint: 'Login did not set the cookie, or browser blocked it (secure/sameSite issue)',
      cookies_received: request.cookies.getAll().map(c => c.name),
    }, { status: 200, headers: { 'Cache-Control': 'no-store' } })
  }

  // 2. Verify JWT (same as middleware)
  let payload: any = null
  let jwtError: string | null = null
  try {
    payload = await verifySession(rawCookie)
  } catch (e: any) {
    jwtError = e.message
  }

  if (!payload) {
    return NextResponse.json({
      step: '2. JWT verification',
      status: 'JWT invalid or expired',
      jwt_error: jwtError,
      cookie_length: rawCookie.length,
      cookie_preview: rawCookie.slice(0, 30) + '...',
      hint: jwtError?.includes('secret')
        ? 'SESSION_SECRET mismatch between login route and middleware'
        : 'JWT signature invalid or expired',
    }, { status: 200, headers: { 'Cache-Control': 'no-store' } })
  }

  // 3. Check session in DB (same as middleware)
  const sb = createClient(supabaseUrl, supabaseKey)
  const { data: sessionRow, error: sessError } = await sb
    .from('sessions')
    .select('id, expires_at, profile_id')
    .eq('id', payload.sid)
    .single()

  if (sessError || !sessionRow) {
    return NextResponse.json({
      step: '3. Session DB lookup',
      status: 'Session not found in DB',
      sid_from_jwt: payload.sid,
      db_error: sessError?.message,
      hint: 'Session was deleted from DB or sid mismatch',
    }, { status: 200, headers: { 'Cache-Control': 'no-store' } })
  }

  // 4. Check expiry (same comparison as middleware)
  const expiresAt = new Date(sessionRow.expires_at)
  const now = new Date()
  const isExpired = expiresAt < now

  if (isExpired) {
    return NextResponse.json({
      step: '4. Expiry check',
      status: 'Session expired',
      expires_at: sessionRow.expires_at,
      expires_at_parsed: expiresAt.toISOString(),
      now: now.toISOString(),
      hint: 'Session expired — check timezone handling',
    }, { status: 200, headers: { 'Cache-Control': 'no-store' } })
  }

  // 5. Check profile is still active
  const { data: profile, error: profError } = await sb
    .from('profiles')
    .select('id, email, active, organization_id')
    .eq('id', payload.sub)
    .single()

  if (profError || !profile) {
    return NextResponse.json({
      step: '5. Profile lookup',
      status: 'Profile not found',
      profile_id_from_jwt: payload.sub,
      db_error: profError?.message,
    }, { status: 200, headers: { 'Cache-Control': 'no-store' } })
  }

  if (!profile.active) {
    return NextResponse.json({
      step: '5. Profile active check',
      status: 'Profile is inactive',
      profile,
    }, { status: 200, headers: { 'Cache-Control': 'no-store' } })
  }

  // 6. Check membership
  const { data: membership, error: mbError } = await sb
    .from('organization_members')
    .select('organization_id, role, status')
    .eq('user_id', profile.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()

  if (mbError || !membership) {
    return NextResponse.json({
      step: '6. Membership lookup',
      status: 'No active membership',
      profile_id: profile.id,
      db_error: mbError?.message,
      hint: 'getAuthenticatedClient will return "No organization assigned"',
    }, { status: 200, headers: { 'Cache-Control': 'no-store' } })
  }

  // 7. Tout est OK — le middleware devrait laisser passer
  return NextResponse.json({
    step: 'ALL CHECKS PASSED',
    status: 'Session is valid — middleware should let the request through',
    jwt_payload: {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      sid: payload.sid,
      organizationId: payload.organizationId,
      exp: payload.exp,
    },
    session_db: {
      id: sessionRow.id,
      expires_at: sessionRow.expires_at,
      profile_id: sessionRow.profile_id,
    },
    profile_db: profile,
    membership_db: membership,
    time_now: now.toISOString(),
    next_step: 'If you still see 401 in /api/auth/session, the issue is in /api/auth/session route itself, not in middleware. Check Vercel logs.',
  }, { status: 200, headers: { 'Cache-Control': 'no-store' } })
}
