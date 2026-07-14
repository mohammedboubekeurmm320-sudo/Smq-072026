import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')

  if (sessionCookie?.value) {
    try {
      const payload = JSON.parse(
        Buffer.from(sessionCookie.value, 'base64').toString()
      )
      // Supprimer la session DB
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      await supabase
        .from('sessions')
        .delete()
        .eq('profile_id', payload.sub)
    } catch {
      // Ignorer les erreurs de nettoyage
    }
  }

  const response = NextResponse.json({ success: true })
  response.cookies.set('session', '', { maxAge: 0, path: '/' })
  response.cookies.set('current_org_id', '', { maxAge: 0, path: '/' })
  return response
}