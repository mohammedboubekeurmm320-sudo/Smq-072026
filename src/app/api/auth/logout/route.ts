import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'

export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')

  if (sessionCookie?.value) {
    try {
      const payload = await verifySession(sessionCookie.value)
      if (payload?.sid) {
        const { createClient } = await import('@supabase/supabase-js')
        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
        await supabase.from('sessions').delete().eq('id', payload.sid)
      }
    } catch { /* ignorer */ }
  }

  const response = NextResponse.json({ success: true })
  response.cookies.set('session', '', { maxAge: 0, path: '/' })
  response.cookies.set('current_org_id', '', { maxAge: 0, path: '/' })
  return response
}