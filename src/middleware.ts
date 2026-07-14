// ============================================================
// MIDDLEWARE: Custom Auth (bcrypt + base64 session cookie)
// Valide la session, injecte x-profile-id header pour RLS
// ============================================================

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Laisser passer les routes publiques
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