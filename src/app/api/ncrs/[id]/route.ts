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
    const item = await db.nonConformance.findFirst({ where: { id, organizationId: session.profile.organizationId } })
    if (!item) return apiError('Introuvable', 404)
    return apiSuccess({ item })
  } catch (e: any) { return apiError(e.message, 500) }
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getServerSession()
    if (!session || !hasPermission(session.profile.role, 'ncr.update' as any)) return apiError('Permissions insuffisantes', 403)
    const { id } = await params
    const body = await req.json()
    const existing = await db.nonConformance.findFirst({ where: { id, organizationId: session.profile.organizationId } })
    if (!existing) return apiError('Introuvable', 404)
    const data: any = {}
    if (body.ncrNumber !== undefined) data.ncrNumber = body.ncrNumber;
    if (body.title !== undefined) data.title = body.title;
    if (body.ncrType !== undefined) data.ncrType = body.ncrType;
    if (body.status !== undefined) data.status = body.status;
    if (body.severity !== undefined) data.severity = body.severity;
    if (body.source !== undefined) data.source = body.source || null;
    if (body.description !== undefined) data.description = body.description || null;
    if (body.lotNumber !== undefined) data.lotNumber = body.lotNumber || null;
    if (body.quantityAffected !== undefined) data.quantityAffected = body.quantityAffected || null;
    if (body.disposition !== undefined) data.disposition = body.disposition;
    if (body.isOosOot !== undefined) data.isOosOot = !!body.isOosOot;
    if (body.analyticalMethod !== undefined) data.analyticalMethod = body.analyticalMethod || null;
    if (body.measuredValue !== undefined) data.measuredValue = body.measuredValue !== null ? Number(body.measuredValue) : null;
    if (body.measuredUnit !== undefined) data.measuredUnit = body.measuredUnit || null;
    if (body.specLimit !== undefined) data.specLimit = body.specLimit || null;
    if (body.phase1Conclusion !== undefined) data.phase1Conclusion = body.phase1Conclusion || null;
    if (body.phase2Required !== undefined) data.phase2Required = !!body.phase2Required;
    if (body.phase2Conclusion !== undefined) data.phase2Conclusion = body.phase2Conclusion || null;
    if (body.rejectLot !== undefined) data.rejectLot = !!body.rejectLot;
    if (body.linkedCapaId !== undefined) data.linkedCapaId = body.linkedCapaId || null;
    if (body.linkedProcedureRef !== undefined) data.linkedProcedureRef = body.linkedProcedureRef || null;
    if (body.supplierId !== undefined) data.supplierId = body.supplierId || null;
    if (body.impactAssessment !== undefined) data.impactAssessment = body.impactAssessment || null;
    if (body.containmentActions !== undefined) data.containmentActions = body.containmentActions || null;
    if (body.affectedProduct !== undefined) data.affectedProduct = body.affectedProduct || null;
    if (body.closedSignatureHash !== undefined) data.closedSignatureHash = body.closedSignatureHash || null;
    if (body.closedById !== undefined) data.closedById = body.closedById || null;
    if (body.closedReason !== undefined) data.closedReason = body.closedReason || null;
    if (body.assignedToId !== undefined) data.assignedToId = body.assignedToId || null;
    if (body.ownerId !== undefined) data.ownerId = body.ownerId || null;
    if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.closedSignedAt !== undefined) data.closedSignedAt = body.closedSignedAt ? new Date(body.closedSignedAt) : null;
    if (body.closedDate !== undefined) data.closedDate = body.closedDate ? new Date(body.closedDate) : null;
    const updated = await db.nonConformance.update({ where: { id }, data })
    await logAudit(session.profile.organizationId, 'UPDATE', 'nonConformance', id, session.profile.id, session.profile.email, existing, updated)
    return apiSuccess({ item: updated })
  } catch (e: any) { return apiError(e.message, 500) }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const session = await getServerSession()
    if (!session || !hasPermission(session.profile.role, 'ncr.delete' as any)) return apiError('Permissions insuffisantes', 403)
    const { id } = await params
    const existing = await db.nonConformance.findFirst({ where: { id, organizationId: session.profile.organizationId } })
    if (!existing) return apiError('Introuvable', 404)
    await db.nonConformance.delete({ where: { id } })
    await logAudit(session.profile.organizationId, 'DELETE', 'nonConformance', id, session.profile.id, session.profile.email, existing)
    return apiSuccess({ ok: true })
  } catch (e: any) { return apiError(e.message, 500) }
}
