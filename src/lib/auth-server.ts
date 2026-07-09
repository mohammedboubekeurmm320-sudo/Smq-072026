import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { randomUUID } from 'crypto'
import type { UserRole, Permission, OrgSettings } from '@/types/qms'
import { rolePermissions, INDUSTRY_CONFIG, STANDARDS_BY_INDUSTRY, CORE_MODULES } from '@/types/qms'

const SESSION_COOKIE = 'qms_session'
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7 // 7 days

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try { return bcrypt.compare(password, hash) } catch { return false }
}

export async function createSession(profileId: string): Promise<string> {
  const token = randomUUID()
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS)
  await db.session.create({ data: { token, profileId, expiresAt } })
  await db.profile.update({ where: { id: profileId }, data: { lastLoginAt: new Date() } })
  return token
}

export async function setSessionCookie(token: string) {
  const expires = new Date(Date.now() + SESSION_DURATION_MS)
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', expires, path: '/',
  })
}

export async function clearSessionCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

export async function destroySession(token: string) {
  try { await db.session.deleteMany({ where: { token } }) } catch {}
}

export interface ServerSession {
  profile: {
    id: string; email: string; fullName: string; role: UserRole
    department: string | null; jobTitle: string | null
    organizationId: string
  }
  organization: {
    id: string; name: string; slug: string
    settings: OrgSettings
  }
}

export async function getServerSession(): Promise<ServerSession | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE)?.value
    if (!token) return null

    const session = await db.session.findUnique({
      where: { token },
      include: {
        profile: {
          select: { id: true, email: true, fullName: true, role: true, department: true, jobTitle: true, organizationId: true, active: true, organization: true }
        }
      },
    })
    if (!session) return null
    if (session.expiresAt < new Date()) {
      await db.session.delete({ where: { id: session.id } })
      return null
    }
    const p = session.profile
    if (!p.active) return null

    return {
      profile: {
        id: p.id, email: p.email, fullName: p.fullName, role: p.role as UserRole,
        department: p.department, jobTitle: p.jobTitle, organizationId: p.organizationId,
      },
      organization: {
        id: p.organization.id, name: p.organization.name, slug: p.organization.slug,
        settings: parseSettings(p.organization.settings),
      }
    }
  } catch (e) {
    console.error('[auth] getServerSession error:', e)
    return null
  }
}

function parseSettings(s: string): OrgSettings {
  try {
    const parsed = JSON.parse(s || '{}')
    return {
      setup_completed: parsed.setup_completed ?? false,
      industry_type: parsed.industry_type ?? 'medical_device',
      applicable_standards: parsed.applicable_standards ?? [],
      active_modules: parsed.active_modules ?? [...CORE_MODULES],
      company_name: parsed.company_name,
      country: parsed.country,
      city: parsed.city,
      org_size: parsed.org_size,
      notifications: parsed.notifications,
    }
  } catch {
    return { setup_completed: false, active_modules: [...CORE_MODULES] as any, applicable_standards: [], industry_type: 'medical_device' }
  }
}

export function hasPermission(role: UserRole, perm: Permission): boolean {
  return (rolePermissions[role] || []).includes(perm)
}

// Helper to enforce auth + return session or throw
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
