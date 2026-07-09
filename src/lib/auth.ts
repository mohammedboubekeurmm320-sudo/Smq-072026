import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { randomUUID } from 'crypto'

export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'QUALITY_MANAGER' | 'ENGINEER' | 'AUDITOR' | 'VIEWER'

export interface SessionUser {
  id: string
  email: string
  name: string
  role: Role
  organizationId: string
  organizationName?: string
  position?: string | null
  department?: string | null
}

const SESSION_COOKIE = 'qms_session'
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7 // 7 days

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function createSession(userId: string): Promise<string> {
  const token = randomUUID()
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS)
  await db.session.create({
    data: { token, userId, expiresAt }
  })
  await db.user.update({
    where: { id: userId },
    data: { lastLoginAt: new Date() }
  })
  return token
}

export async function setSessionCookie(token: string) {
  const expires = new Date(Date.now() + SESSION_DURATION_MS)
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    expires,
    path: '/'
  })
}

export async function clearSessionCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE)?.value
    if (!token) {
      console.log('[auth] No token cookie found. All cookies:', cookieStore.getAll().map(c => c.name))
      return null
    }

    const session = await db.session.findUnique({
      where: { token },
      include: {
        user: {
          include: { organization: true }
        }
      }
    })
    if (!session) {
      console.log('[auth] No session found for token:', token)
      return null
    }
    if (session.expiresAt < new Date()) {
      console.log('[auth] Session expired')
      await db.session.delete({ where: { id: session.id } })
      return null
    }
    const u = session.user
    if (!u.active) {
      console.log('[auth] User not active')
      return null
    }
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role as Role,
      organizationId: u.organizationId,
      organizationName: u.organization.name,
      position: u.position,
      department: u.department
    }
  } catch (e) {
    console.error('[auth] getCurrentUser error:', e)
    return null
  }
}

export async function destroySession(token: string) {
  try {
    await db.session.deleteMany({ where: { token } })
  } catch {}
}

export function canAccess(user: SessionUser | null, ...roles: Role[]): boolean {
  if (!user) return false
  if (user.role === 'SUPER_ADMIN') return true
  return roles.includes(user.role)
}

// Role hierarchy for permission checks
export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: 'Super Administrateur',
  ADMIN: 'Administrateur',
  QUALITY_MANAGER: 'Responsable Qualité',
  ENGINEER: 'Ingénieur',
  AUDITOR: 'Auditeur',
  VIEWER: 'Observateur'
}

export const ALL_ROLES: Role[] = ['ADMIN', 'QUALITY_MANAGER', 'ENGINEER', 'AUDITOR', 'VIEWER']
