import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server-with-context'

export async function POST(request: NextRequest) {
  const { client, profileId, error } = await getAuthenticatedClient(request)
  if (error || !client || !profileId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { organizationId } = await request.json()
  if (!organizationId) {
    return NextResponse.json({ error: 'organizationId requis' }, { status: 400 })
  }

  // Vérifier que l'utilisateur est membre de cette org
  const { data: membership } = await client
    .from('organization_members')
    .select('id, role')
    .eq('user_id', profileId)
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .single()

  if (!membership) {
    return NextResponse.json(
      { error: 'Pas membre de cette organisation' },
      { status: 403 }
    )
  }

  const response = NextResponse.json({ success: true, organizationId })
  response.cookies.set('current_org_id', organizationId, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
  return response
}