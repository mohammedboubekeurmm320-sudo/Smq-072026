import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server-with-context'

export async function GET(request: NextRequest) {
  const { client, profileId, error } = await getAuthenticatedClient(request)

  if (error || !client || !profileId) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }

  // Récupérer les infos complètes via la vue
  const { data: profile } = await client
    .from('v_current_user')
    .select('*')
    .eq('profile_id', profileId)
    .single()

  // Récupérer les organisations
  const { data: memberships } = await client
    .from('organization_members')
    .select('organization_id, role, organization:organizations(id, name)')
    .eq('user_id', profileId)
    .eq('status', 'active')

  return NextResponse.json({
    authenticated: true,
    profile,
    memberships: memberships || [],
  })
}