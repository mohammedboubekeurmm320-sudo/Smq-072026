// ============================================================
// MIDDLEWARE: Custom Auth (bcrypt + base64 session cookie)
// Valide la session, injecte x-profile-id header pour RLS
// Applies rate limiting to auth endpoints (Tier 1)
// ============================================================

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { authRateLimit, getRateLimitKey } from '@/lib/rate-limit'

// Auth endpoints that get Tier 1 rate limiting (before auth check)
const RATE_LIMITED_AUTH_PATHS = [
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/verify-signature',
]

// Routes publiques (pas d'auth requise)
const PUBLIC_PATHS = [
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/verify-signature',
  '/login',
  '/signup',
  '/_next',
  '/favicon.ico',
]

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(p => pathname.startsWith(p))
}

function isRateLimitedAuthPath(pathname: string): boolean {
  return RATE_LIMITED_AUTH_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ---- Rate limiting for auth endpoints (before any auth check) ----
  if (isRateLimitedAuthPath(pathname) && request.method === 'POST') {
    const key = getRateLimitKey(request)
    const { allowed, remaining, resetAt } = authRateLimit(key)

    if (!allowed) {
      const retryAfterSeconds = Math.ceil((resetAt - Date.now()) / 1000)
      return NextResponse.json(
        { error: 'Trop de requêtes. Veuillez réessayer plus tard.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfterSeconds),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(resetAt),
          },
        },
      )
    }

    // Allowed — inject rate limit headers into the downstream response
    const response = NextResponse.next()
    response.headers.set('X-RateLimit-Remaining', String(remaining))
    response.headers.set('X-RateLimit-Reset', String(resetAt))
    return response
  }

  // Laisser passer les autres routes publiques (login page, signup page, static)
  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  // Extraire le cookie de session (base64 JSON)
  const sessionCookie = request.cookies.get('session')
  let profileId: string | null = null

  if (sessionCookie?.value) {
    try {
      const payload = JSON.parse(
        Buffer.from(sessionCookie.value, 'base64').toString()
      )
      profileId = payload.profileId || payload.sub || null
      const userRole = payload.role || 'member'

      // Vérifier l'expiration
      if (payload.exp && Date.now() > payload.exp) {
        profileId = null // Session expirée
      }
    } catch {
      profileId = null
    }
  }

  // Non authentifié → rediriger vers login (sauf API)
  if (!profileId) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Injecter le profile_id et le rôle dans les headers pour les API routes
  let userRole = 'member'
  try {
    const payload = JSON.parse(
      Buffer.from(sessionCookie!.value, 'base64').toString()
    )
    userRole = payload.role || 'member'
  } catch { /* use default */ }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-profile-id', profileId)
  requestHeaders.set('x-user-role', userRole)

  // Injecter aussi l'org_id si disponible
  const orgCookie = request.cookies.get('current_org_id')
  if (orgCookie?.value) {
    requestHeaders.set('x-org-id', orgCookie.value)
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}