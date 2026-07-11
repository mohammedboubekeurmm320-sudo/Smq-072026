import { NextResponse } from 'next/server'
import { clearSessionCookie, destroySession, getServerSession } from '@/lib/auth-server'
import { db } from '@/lib/db'
import { apiSuccess } from '@/lib/api-helpers'
import { logAudit } from '@/lib/api-helpers'

export async function POST() {
  const session = await getServerSession()
  if (session) {
    await db.session.deleteMany({ where: { profileId: session.profile.id } }).catch(() => {})
    await logAuditSafe(session.profile.organizationId, 'LOGIN', 'profiles', session.profile.id, session.profile.id, session.profile.email)
  }
  await clearSessionCookie()
  return apiSuccess({ ok: true })
}

async function logAuditSafe(orgId: string, action: any, table: string, recordId: string, userId?: string, userEmail?: string) {
  try { await logAudit(orgId, action, table, recordId, userId, userEmail) } catch {}
}