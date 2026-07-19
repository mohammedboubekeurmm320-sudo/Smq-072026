// ============================================================
// MIDDLEWARE: JWT-signed session cookie verification
// Vérifie la signature JWT, vérifie la révocation en DB,
// injecte x-profile-id et x-org-id dérivés du JWT serveur.
// ============================================================

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { authRateLimit, getRateLimitKey } from '@/lib/rate-limit'
import { verifySession } from '@/lib/session'

const RATE_LIMITED_AUTH_PATHS = ['/api/auth/login', '/api/auth/signup', '/api/auth/verify-signature']
const PUBLIC_PATHS = ['/api/auth/login', '/api/auth/signup', '/api/auth/verify-signature', '/login', '/signup', '/_next', '/favicon.ico']

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(p => pathname.startsWith(p))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rate limiting auth endpoints
  if (RATE_LIMITED_AUTH_PATHS.some(p => pathname === p || pathname.startsWith(p + '/')) && request.method === 'POST') {
    const key = getRateLimitKey(request)
    const { allowed, remaining, resetAt } = authRateLimit(key)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Veuillez réessayer plus tard.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)), 'X-RateLimit-Remaining': '0', 'X-RateLimit-Reset': String(resetAt) } },
      )
    }
    const response = NextResponse.next()
    response.headers.set('X-RateLimit-Remaining', String(remaining))
    response.headers.set('X-RateLimit-Reset', String(resetAt))
    return response
  }

  if (isPublicPath(pathname)) return NextResponse.next()

  // JWT verification
  const sessionCookie = request.cookies.get('session')
  const payload = sessionCookie?.value ? await verifySession(sessionCookie.value) : null

  if (!payload) {
    if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Session revocation check (API only, for performance)
  if (payload.sid && pathname.startsWith('/api/')) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (supabaseUrl && supabaseKey) {
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const sb = createClient(supabaseUrl, supabaseKey)
        const { data: sessionRow } = await sb.from('sessions').select('id, expires_at').eq('id', payload.sid).single()
        if (!sessionRow || new Date(sessionRow.expires_at) < new Date()) {
          if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
          const loginUrl = new URL('/login', request.url)
          loginUrl.searchParams.set('redirect', pathname)
          return NextResponse.redirect(loginUrl)
        }
      } catch { /* fail-open for availability */ }
    }
  }

  // Inject headers from JWT — NEVER from client cookie/header
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-profile-id', payload.sub)
  requestHeaders.set('x-user-role', payload.role || 'member')
  requestHeaders.set('x-org-id', payload.organizationId)

  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }