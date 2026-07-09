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
    const item = await db.deviation.findFirst({ where: { id, organizationId: session.profile.organizationId } })
    if (!item) return apiError('Introuvable', 404)
    return apiSuccess({ item })
  } catch (e: any) { return apiError(e.message, 500) }
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getServerSession()
    if (!session || !hasPermission(session.profile.role, 'deviation.update' as any)) return apiError('Permissions insuffisantes', 403)
    const { id } = await params
    const body = await req.json()
    const existing = await db.deviation.findFirst({ where: { id, organizationId: session.profile.organizationId } })
    if (!existing) return apiError('Introuvable', 404)
    const data: any = {}
    if (body.devNumber !== undefined) data.devNumber = body.devNumber;
    if (body.title !== undefined) data.title = body.title;
    if (body.deviationType !== undefined) data.deviationType = body.deviationType;
    if (body.status !== undefined) data.status = body.status;
    if (body.severity !== undefined) data.severity = body.severity;
    if (body.category !== undefined) data.category = body.category;
    if (body.description !== undefined) data.description = body.description || null;
    if (body.deviationDetails !== undefined) data.deviationDetails = body.deviationDetails || null;
    if (body.justification !== undefined) data.justification = body.justification || null;
    if (body.riskAssessment !== undefined) data.riskAssessment = body.riskAssessment || null;
    if (body.correctiveAction !== undefined) data.correctiveAction = body.correctiveAction || null;
    if (body.preventiveAction !== undefined) data.preventiveAction = body.preventiveAction || null;
    if (body.sopReference !== undefined) data.sopReference = body.sopReference || null;
    if (body.expectedResult !== undefined) data.expectedResult = body.expectedResult || null;
    if (body.actualResult !== undefined) data.actualResult = body.actualResult || null;
    if (body.productStage !== undefined) data.productStage = body.productStage || null;
    if (body.quarantine !== undefined) data.quarantine = !!body.quarantine;
    if (body.impactOnValidatedState !== undefined) data.impactOnValidatedState = body.impactOnValidatedState || null;
    if (body.impactOnRegulatoryFiling !== undefined) data.impactOnRegulatoryFiling = body.impactOnRegulatoryFiling || null;
    if (body.containmentAction !== undefined) data.containmentAction = body.containmentAction || null;
    if (body.detectedDate !== undefined) data.detectedDate = body.detectedDate ? new Date(body.detectedDate) : null;
    if (body.isPlannedDeviation !== undefined) data.isPlannedDeviation = !!body.isPlannedDeviation;
    if (body.lotNumber !== undefined) data.lotNumber = body.lotNumber || null;
    if (body.productCode !== undefined) data.productCode = body.productCode || null;
    if (body.quantityAffected !== undefined) data.quantityAffected = body.quantityAffected || null;
    if (body.linkedCapaId !== undefined) data.linkedCapaId = body.linkedCapaId || null;
    if (body.linkedDocumentId !== undefined) data.linkedDocumentId = body.linkedDocumentId || null;
    if (body.assignedToId !== undefined) data.assignedToId = body.assignedToId || null;
    if (body.ownerId !== undefined) data.ownerId = body.ownerId || null;
    if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.closedDate !== undefined) data.closedDate = body.closedDate ? new Date(body.closedDate) : null;
    const updated = await db.deviation.update({ where: { id }, data })
    await logAudit(session.profile.organizationId, 'UPDATE', 'deviation', id, session.profile.id, session.profile.email, existing, updated)
    return apiSuccess({ item: updated })
  } catch (e: any) { return apiError(e.message, 500) }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const session = await getServerSession()
    if (!session || !hasPermission(session.profile.role, 'deviation.delete' as any)) return apiError('Permissions insuffisantes', 403)
    const { id } = await params
    const existing = await db.deviation.findFirst({ where: { id, organizationId: session.profile.organizationId } })
    if (!existing) return apiError('Introuvable', 404)
    await db.deviation.delete({ where: { id } })
    await logAudit(session.profile.organizationId, 'DELETE', 'deviation', id, session.profile.id, session.profile.email, existing)
    return apiSuccess({ ok: true })
  } catch (e: any) { return apiError(e.message, 500) }
}
