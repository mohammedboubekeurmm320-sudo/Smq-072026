// ============================================================
// Session JWT helpers — shared between login, signup, middleware, auth-server
// Uses `jose` (Edge Runtime compatible) — NOT jsonwebtoken
// ============================================================

import { SignJWT, jwtVerify } from 'jose'

// ---- Lazy env validation (throws at runtime, not build time) ----
function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET
  if (!secret) {
    throw new Error(
      '[CRITICAL] SESSION_SECRET environment variable is not set. ' +
      'The application cannot start without it. Generate one with: openssl rand -base64 48'
    )
  }
  return secret
}

function getSecret(): Uint8Array {
  return new TextEncoder().encode(getSessionSecret())
}

// ---- Types ----
export interface SessionPayload {
  sub: string
  email: string
  name: string
  organizationId: string
  role: string
  exp: number
  sid?: string
}

/**
 * Sign a session payload into a compact JWT string.
 */
export async function signSession(payload: Omit<SessionPayload, 'exp'> & { sid?: string }): Promise<string> {
  const token = await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(getSecret())
  return token
}

/**
 * Verify and decode a JWT session token.
 * Returns null (never throws) if invalid / expired / malformed.
 */
export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}