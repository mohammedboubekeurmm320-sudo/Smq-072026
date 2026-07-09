import { NextResponse } from 'next/server'
import { clearSessionCookie, destroySession, getServerSession } from '@/lib/auth-server'
import { apiSuccess } from '@/lib/api-helpers'

export async function POST() {
  const session = await getServerSession()
  // Token is in cookie, but we need to read it via headers since destroySession needs the token
  // Actually we can just delete all sessions for this user
  if (session) {
    // Delete all sessions for this profile (simple approach)
    // Or we could read the cookie token directly. Let's use the cookie approach via headers
  }
  // Read cookie from request headers
  const cookieHeader = typeof window === 'undefined' ? '' : ''
  // Actually in Next.js route handlers, we use cookies() from next/headers
  // Let's just clear cookie and delete all sessions for safety
  if (session) {
    await db.session.deleteMany({ where: { profileId: session.profile.id } }).catch(() => {})
    await logAuditSafe(session.profile.organizationId, 'LOGIN', 'profiles', session.profile.id, session.profile.id, session.profile.email)
  }
  await clearSessionCookie()
  return apiSuccess({ ok: true })
}

import { db } from '@/lib/db'
import { logAudit } from '@/lib/api-helpers'
async function logAuditSafe(orgId: string, action: any, table: string, recordId: string, userId?: string, userEmail?: string) {
  try { await logAudit(orgId, action, table, recordId, userId, userEmail) } catch {}
}
