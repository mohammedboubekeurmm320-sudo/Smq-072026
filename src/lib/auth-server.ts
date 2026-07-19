// ============================================================
// Auth server helpers: password hashing + JWT session parsing
// ============================================================

import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import type { UserRole, Permission } from '@/types/qms'
import { rolePermissions } from '@/types/qms'
import { verifySession } from '@/lib/session'

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try { return bcrypt.compare(password, hash) } catch { return false }
}

const SESSION_COOKIE = 'session'

export interface ServerSession {
  profile: { id: string; email: string; fullName: string; role: UserRole; organizationId: string }
}

export async function getServerSession(): Promise<ServerSession | null> {
  try {
    const cookieStore = await cookies()
    const raw = cookieStore.get(SESSION_COOKIE)?.value
    if (!raw) return null

    const payload = await verifySession(raw)
    if (!payload) return null

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