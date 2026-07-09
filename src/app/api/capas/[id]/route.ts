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
    const item = await db.cAPA.findFirst({ where: { id, organizationId: session.profile.organizationId } })
    if (!item) return apiError('Introuvable', 404)
    return apiSuccess({ item })
  } catch (e: any) { return apiError(e.message, 500) }
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getServerSession()
    if (!session || !hasPermission(session.profile.role, 'capa.update' as any)) return apiError('Permissions insuffisantes', 403)
    const { id } = await params
    const body = await req.json()
    const existing = await db.cAPA.findFirst({ where: { id, organizationId: session.profile.organizationId } })
    if (!existing) return apiError('Introuvable', 404)
    const data: any = {}
    if (body.capaNumber !== undefined) data.capaNumber = body.capaNumber;
    if (body.title !== undefined) data.title = body.title;
    if (body.capaType !== undefined) data.capaType = body.capaType;
    if (body.status !== undefined) data.status = body.status;
    if (body.priority !== undefined) data.priority = body.priority;
    if (body.source !== undefined) data.source = body.source;
    if (body.sourceReferenceId !== undefined) data.sourceReferenceId = body.sourceReferenceId || null;
    if (body.sourceRecordType !== undefined) data.sourceRecordType = body.sourceRecordType || null;
    if (body.description !== undefined) data.description = body.description || null;
    if (body.problemStatement !== undefined) data.problemStatement = body.problemStatement || null;
    if (body.investigationDetails !== undefined) data.investigationDetails = body.investigationDetails || null;
    if (body.rootCauseAnalysis !== undefined) data.rootCauseAnalysis = body.rootCauseAnalysis || null;
    if (body.rootCauseCategory !== undefined) data.rootCauseCategory = body.rootCauseCategory || null;
    if (body.fiveWhysJson !== undefined) data.fiveWhysJson = JSON.stringify(body.fiveWhysJson || []);
    if (body.correctiveAction !== undefined) data.correctiveAction = body.correctiveAction || null;
    if (body.effectivenessVerificationMethod !== undefined) data.effectivenessVerificationMethod = body.effectivenessVerificationMethod || null;
    if (body.effectivenessCriteria !== undefined) data.effectivenessCriteria = body.effectivenessCriteria || null;
    if (body.effectivenessResult !== undefined) data.effectivenessResult = body.effectivenessResult || null;
    if (body.linkedDocumentId !== undefined) data.linkedDocumentId = body.linkedDocumentId || null;
    if (body.linkedNcrId !== undefined) data.linkedNcrId = body.linkedNcrId || null;
    if (body.linkedAuditId !== undefined) data.linkedAuditId = body.linkedAuditId || null;
    if (body.linkedCapaId !== undefined) data.linkedCapaId = body.linkedCapaId || null;
    if (body.templateId !== undefined) data.templateId = body.templateId || null;
    if (body.templateVersion !== undefined) data.templateVersion = body.templateVersion || null;
    if (body.assignedToId !== undefined) data.assignedToId = body.assignedToId || null;
    if (body.ownerId !== undefined) data.ownerId = body.ownerId || null;
    if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.closedDate !== undefined) data.closedDate = body.closedDate ? new Date(body.closedDate) : null;
    const updated = await db.cAPA.update({ where: { id }, data })
    await logAudit(session.profile.organizationId, 'UPDATE', 'cAPA', id, session.profile.id, session.profile.email, existing, updated)
    return apiSuccess({ item: updated })
  } catch (e: any) { return apiError(e.message, 500) }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const session = await getServerSession()
    if (!session || !hasPermission(session.profile.role, 'capa.delete' as any)) return apiError('Permissions insuffisantes', 403)
    const { id } = await params
    const existing = await db.cAPA.findFirst({ where: { id, organizationId: session.profile.organizationId } })
    if (!existing) return apiError('Introuvable', 404)
    await db.cAPA.delete({ where: { id } })
    await logAudit(session.profile.organizationId, 'DELETE', 'cAPA', id, session.profile.id, session.profile.email, existing)
    return apiSuccess({ ok: true })
  } catch (e: any) { return apiError(e.message, 500) }
}
