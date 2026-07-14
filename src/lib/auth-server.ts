// ============================================================
// Auth server helpers: password hashing + session parsing
// Compatible avec le nouveau système de cookie base64 JSON
// ============================================================

import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import type { UserRole, Permission } from '@/types/qms'
import { rolePermissions } from '@/types/qms'

// ---- Password helpers (utilisés par signup, profiles) ----

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try { return bcrypt.compare(password, hash) } catch { return false }
}

// ---- Session parsing (lit le cookie "session" base64 JSON) ----

const SESSION_COOKIE = 'session'

interface SessionPayload {
  sub: string
  email: string
  name: string
  organizationId: string
  role: string
  exp: number
}

export interface ServerSession {
  profile: {
    id: string
    email: string
    fullName: string
    role: UserRole
    organizationId: string
  }
}

export async function getServerSession(): Promise<ServerSession | null> {
  try {
    const cookieStore = await cookies()
    const raw = cookieStore.get(SESSION_COOKIE)?.value
    if (!raw) return null

    const payload: SessionPayload = JSON.parse(
      Buffer.from(raw, 'base64').toString()
    )

    // Vérifier l'expiration
    if (payload.exp && Date.now() > payload.exp) return null

    return {
      profile: {
        id: payload.sub,
        email: payload.email,
        fullName: payload.name,
        role: (payload.role || 'member') as UserRole,
        organizationId: payload.organizationId,
      },
    }
  } catch {
    return null
  }
}

// ---- Permission helpers ----

export function hasPermission(role: UserRole, perm: Permission): boolean {
  return (rolePermissions[role] || []).includes(perm)
}

export async function requireAuth(): Promise<ServerSession> {
  const s = await getServerSession()
  if (!s) throw new Error('Non authentifié')
  return s
}

export async function requirePermission(perm: Permission): Promise<ServerSession> {
  const s = await requireAuth()
  if (!hasPermission(s.profile.role, perm)) throw new Error('Permissions insuffisantes')
  return s
}