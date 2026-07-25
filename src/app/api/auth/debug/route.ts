// ============================================================
// DEBUG ENDPOINT — /api/auth/debug
// TEMPORAIRE — À SUPPRIMER APRÈS DIAGNOSTIC
// ============================================================
// Retourne TOUT l'état interne pour débugger le crash de login.
// Ne nécessite pas de session valide — accessible sans cookie.
// ============================================================

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const sessionSecret = process.env.SESSION_SECRET
  const signatureSecret = process.env.SIGNATURE_SECRET

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Missing Supabase env vars' }, { status: 500 })
  }

  const sb = createClient(supabaseUrl, supabaseKey)

  // 1. ENV VARS — Vérifier que tout est présent
  const envCheck = {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl ? '✅ present' : '❌ MISSING',
    SUPABASE_SERVICE_ROLE_KEY: supabaseKey ? `✅ present (${supabaseKey.slice(0, 8)}…${supabaseKey.slice(-4)})` : '❌ MISSING',
    SESSION_SECRET: sessionSecret ? `✅ present (${sessionSecret.length} chars)` : '❌ MISSING — THIS WILL CRASH LOGIN',
    SIGNATURE_SECRET: signatureSecret ? `✅ present (${signatureSecret.length} chars)` : '⚠️ MISSING — e-sig will fail',
    NODE_ENV: process.env.NODE_ENV || 'undefined',
  }

  // 2. Profiles existants (sans révéler le hash)
  const { data: profiles, error: profilesErr } = await sb
    .from('profiles')
    .select('id, email, full_name, role, active, organization_id, created_at, last_login_at')
    .order('created_at', { ascending: false })
    .limit(10)

  // 3. Vue v_current_user — retourne-t-elle des données ?
  const { data: vcu, error: vcuErr } = await sb
    .from('v_current_user')
    .select('*')
    .limit(10)

  // 4. Memberships
  const { data: memberships, error: mbErr } = await sb
    .from('organization_members')
    .select('id, organization_id, user_id, role, status, created_at')
    .order('created_at', { ascending: false })
    .limit(10)

  // 5. Sessions récentes
  const { data: sessions, error: sessErr } = await sb
    .from('sessions')
    .select('id, profile_id, expires_at, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  // 6. Schéma réel de organization_members — pour voir user_id vs profile_id
  let schemaCheck: any = null
  try {
    const { data, error } = await sb.rpc('to_jsonb', {}).eq('id', 'nope')
    schemaCheck = 'rpc not used'
  } catch (e: any) {
    schemaCheck = e.message
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    env: envCheck,
    profiles: {
      count: profiles?.length || 0,
      error: profilesErr?.message,
      data: profiles,
    },
    v_current_user: {
      count: vcu?.length || 0,
      error: vcuErr?.message,
      data: vcu,
      hint: vcu?.length === 0 ? '⚠️ EMPTY — this is why login crashes. The view is broken.' : 'OK',
    },
    memberships: {
      count: memberships?.length || 0,
      error: mbErr?.message,
      data: memberships,
      hint: memberships?.length === 0 ? '⚠️ NO MEMBERSHIPS — login will fail to find org_role' : 'OK',
      column_used: 'user_id (from signup code)',
    },
    sessions: {
      count: sessions?.length || 0,
      error: sessErr?.message,
      data: sessions,
    },
    diagnosis: {
      v_current_user_empty: (vcu?.length || 0) === 0 ? '🔴 YES — login will crash. Need to fix the view.' : '✅ NO',
      no_memberships: (memberships?.length || 0) === 0 ? '🔴 YES — login cannot determine org.' : '✅ NO',
      session_secret_missing: !sessionSecret ? '🔴 YES — JWT signing will fail.' : '✅ NO',
    },
    next_step: (vcu?.length || 0) === 0
      ? 'Run supabase/diagnostic_login_crash.sql TEST 2 and share the definition. The view is using profile_id instead of user_id.'
      : 'The view is fine. Check Vercel logs for the actual login error.',
  }, { status: 200, headers: { 'Cache-Control': 'no-store' } })
}
