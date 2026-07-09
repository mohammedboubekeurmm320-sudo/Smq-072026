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
    const item = await db.risk.findFirst({ where: { id, organizationId: session.profile.organizationId } })
    if (!item) return apiError('Introuvable', 404)
    return apiSuccess({ item })
  } catch (e: any) { return apiError(e.message, 500) }
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getServerSession()
    if (!session || !hasPermission(session.profile.role, 'risk.update' as any)) return apiError('Permissions insuffisantes', 403)
    const { id } = await params
    const body = await req.json()
    const existing = await db.risk.findFirst({ where: { id, organizationId: session.profile.organizationId } })
    if (!existing) return apiError('Introuvable', 404)
    const data: any = {}
    if (body.riskNumber !== undefined) data.riskNumber = body.riskNumber;
    if (body.title !== undefined) data.title = body.title;
    if (body.category !== undefined) data.category = body.category;
    if (body.status !== undefined) data.status = body.status;
    if (body.hazardDescription !== undefined) data.hazardDescription = body.hazardDescription || null;
    if (body.riskOwner !== undefined) data.riskOwner = body.riskOwner || null;
    if (body.regulatoryReference !== undefined) data.regulatoryReference = body.regulatoryReference || null;
    if (body.controlType !== undefined) data.controlType = body.controlType || null;
    if (body.verificationMethod !== undefined) data.verificationMethod = body.verificationMethod || null;
    if (body.riskAcceptability !== undefined) data.riskAcceptability = body.riskAcceptability;
    if (body.priorityNotes !== undefined) data.priorityNotes = body.priorityNotes || null;
    if (body.probability !== undefined) data.probability = Number(body.probability) || 0;
    if (body.impact !== undefined) data.impact = Number(body.impact) || 0;
    if (body.detectability !== undefined) data.detectability = Number(body.detectability) || 0;
    if (body.rpn !== undefined) data.rpn = Number(body.rpn) || 0;
    if (body.riskLevel !== undefined) data.riskLevel = body.riskLevel;
    if (body.mitigation !== undefined) data.mitigation = body.mitigation || null;
    if (body.residualRisk !== undefined) data.residualRisk = body.residualRisk || null;
    if (body.residualProbability !== undefined) data.residualProbability = body.residualProbability !== null ? Number(body.residualProbability) : null;
    if (body.residualImpact !== undefined) data.residualImpact = body.residualImpact !== null ? Number(body.residualImpact) : null;
    if (body.residualDetectability !== undefined) data.residualDetectability = body.residualDetectability !== null ? Number(body.residualDetectability) : null;
    if (body.residualRpn !== undefined) data.residualRpn = body.residualRpn !== null ? Number(body.residualRpn) : null;
    if (body.linkedDocumentId !== undefined) data.linkedDocumentId = body.linkedDocumentId || null;
    if (body.linkedCapaId !== undefined) data.linkedCapaId = body.linkedCapaId || null;
    if (body.ownerId !== undefined) data.ownerId = body.ownerId || null;
    const updated = await db.risk.update({ where: { id }, data })
    await logAudit(session.profile.organizationId, 'UPDATE', 'risk', id, session.profile.id, session.profile.email, existing, updated)
    return apiSuccess({ item: updated })
  } catch (e: any) { return apiError(e.message, 500) }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const session = await getServerSession()
    if (!session || !hasPermission(session.profile.role, 'risk.delete' as any)) return apiError('Permissions insuffisantes', 403)
    const { id } = await params
    const existing = await db.risk.findFirst({ where: { id, organizationId: session.profile.organizationId } })
    if (!existing) return apiError('Introuvable', 404)
    await db.risk.delete({ where: { id } })
    await logAudit(session.profile.organizationId, 'DELETE', 'risk', id, session.profile.id, session.profile.email, existing)
    return apiSuccess({ ok: true })
  } catch (e: any) { return apiError(e.message, 500) }
}
