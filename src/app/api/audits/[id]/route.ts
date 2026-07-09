import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession, hasPermission } from '@/lib/auth-server'
import { apiSuccess, apiError, logAudit } from '@/lib/api-helpers'

interface Ctx { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const session = await getServerSession()
    if (!session) return apiError('Non authentifié', 401)
    const { id } = await params
    const item = await db.audit.findFirst({ where: { id, organizationId: session.profile.organizationId } })
    if (!item) return apiError('Introuvable', 404)
    return apiSuccess({ item })
  } catch (e: any) { return apiError(e.message, 500) }
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getServerSession()
    if (!session || !hasPermission(session.profile.role, 'audit.update' as any)) return apiError('Permissions insuffisantes', 403)
    const { id } = await params
    const body = await req.json()
    const existing = await db.audit.findFirst({ where: { id, organizationId: session.profile.organizationId } })
    if (!existing) return apiError('Introuvable', 404)
    const data: any = {}
    if (body.auditNumber !== undefined) data.auditNumber = body.auditNumber;
    if (body.title !== undefined) data.title = body.title;
    if (body.auditType !== undefined) data.auditType = body.auditType;
    if (body.status !== undefined) data.status = body.status;
    if (body.auditScope !== undefined) data.auditScope = body.auditScope || null;
    if (body.scheduledDate !== undefined) data.scheduledDate = body.scheduledDate ? new Date(body.scheduledDate) : null;
    if (body.completedDate !== undefined) data.completedDate = body.completedDate ? new Date(body.completedDate) : null;
    if (body.leadAuditorId !== undefined) data.leadAuditorId = body.leadAuditorId || null;
    if (body.auditeesJson !== undefined) data.auditeesJson = JSON.stringify(body.auditeesJson || []);
    if (body.findingsJson !== undefined) data.findingsJson = JSON.stringify(body.findingsJson || []);
    if (body.auditCriteria !== undefined) data.auditCriteria = body.auditCriteria || null;
    if (body.complianceRating !== undefined) data.complianceRating = body.complianceRating || null;
    if (body.completedSignatureHash !== undefined) data.completedSignatureHash = body.completedSignatureHash || null;
    if (body.completedSignedAt !== undefined) data.completedSignedAt = body.completedSignedAt ? new Date(body.completedSignedAt) : null;
    if (body.completedSignedById !== undefined) data.completedSignedById = body.completedSignedById || null;
    const updated = await db.audit.update({ where: { id }, data })
    await logAudit(session.profile.organizationId, 'UPDATE', 'audit', id, session.profile.id, session.profile.email, existing, updated)
    return apiSuccess({ item: updated })
  } catch (e: any) { return apiError(e.message, 500) }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const session = await getServerSession()
    if (!session || !hasPermission(session.profile.role, 'audit.delete' as any)) return apiError('Permissions insuffisantes', 403)
    const { id } = await params
    const existing = await db.audit.findFirst({ where: { id, organizationId: session.profile.organizationId } })
    if (!existing) return apiError('Introuvable', 404)
    await db.audit.delete({ where: { id } })
    await logAudit(session.profile.organizationId, 'DELETE', 'audit', id, session.profile.id, session.profile.email, existing)
    return apiSuccess({ ok: true })
  } catch (e: any) { return apiError(e.message, 500) }
}
