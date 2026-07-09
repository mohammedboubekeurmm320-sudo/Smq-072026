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
    const item = await db.changeControl.findFirst({ where: { id, organizationId: session.profile.organizationId } })
    if (!item) return apiError('Introuvable', 404)
    return apiSuccess({ item })
  } catch (e: any) { return apiError(e.message, 500) }
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getServerSession()
    if (!session || !hasPermission(session.profile.role, 'changecontrol.update' as any)) return apiError('Permissions insuffisantes', 403)
    const { id } = await params
    const body = await req.json()
    const existing = await db.changeControl.findFirst({ where: { id, organizationId: session.profile.organizationId } })
    if (!existing) return apiError('Introuvable', 404)
    const data: any = {}
    if (body.ccNumber !== undefined) data.ccNumber = body.ccNumber;
    if (body.title !== undefined) data.title = body.title;
    if (body.ccType !== undefined) data.ccType = body.ccType;
    if (body.status !== undefined) data.status = body.status;
    if (body.priority !== undefined) data.priority = body.priority;
    if (body.category !== undefined) data.category = body.category;
    if (body.description !== undefined) data.description = body.description || null;
    if (body.justification !== undefined) data.justification = body.justification || null;
    if (body.proposedChange !== undefined) data.proposedChange = body.proposedChange || null;
    if (body.detailedChangeDescription !== undefined) data.detailedChangeDescription = body.detailedChangeDescription || null;
    if (body.businessComplianceJustification !== undefined) data.businessComplianceJustification = body.businessComplianceJustification || null;
    if (body.riskAssessment !== undefined) data.riskAssessment = body.riskAssessment || null;
    if (body.impactAnalysis !== undefined) data.impactAnalysis = body.impactAnalysis || null;
    if (body.affectedAreas !== undefined) data.affectedAreas = body.affectedAreas || null;
    if (body.impactOnValidatedSystems !== undefined) data.impactOnValidatedSystems = !!body.impactOnValidatedSystems;
    if (body.implementationPlan !== undefined) data.implementationPlan = body.implementationPlan || null;
    if (body.implementationDate !== undefined) data.implementationDate = body.implementationDate ? new Date(body.implementationDate) : null;
    if (body.estimatedCostImpact !== undefined) data.estimatedCostImpact = body.estimatedCostImpact || null;
    if (body.completionDate !== undefined) data.completionDate = body.completionDate ? new Date(body.completionDate) : null;
    if (body.regulatoryTrigger !== undefined) data.regulatoryTrigger = body.regulatoryTrigger || null;
    if (body.emergencyFlag !== undefined) data.emergencyFlag = !!body.emergencyFlag;
    if (body.linkedDocumentId !== undefined) data.linkedDocumentId = body.linkedDocumentId || null;
    if (body.linkedCapaId !== undefined) data.linkedCapaId = body.linkedCapaId || null;
    if (body.additionalReferences !== undefined) data.additionalReferences = body.additionalReferences || null;
    if (body.assignedToId !== undefined) data.assignedToId = body.assignedToId || null;
    if (body.requestedById !== undefined) data.requestedById = body.requestedById || null;
    if (body.approvedById !== undefined) data.approvedById = body.approvedById || null;
    if (body.approverId !== undefined) data.approverId = body.approverId || null;
    if (body.ownerId !== undefined) data.ownerId = body.ownerId || null;
    if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    const updated = await db.changeControl.update({ where: { id }, data })
    await logAudit(session.profile.organizationId, 'UPDATE', 'changeControl', id, session.profile.id, session.profile.email, existing, updated)
    return apiSuccess({ item: updated })
  } catch (e: any) { return apiError(e.message, 500) }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const session = await getServerSession()
    if (!session || !hasPermission(session.profile.role, 'changecontrol.delete' as any)) return apiError('Permissions insuffisantes', 403)
    const { id } = await params
    const existing = await db.changeControl.findFirst({ where: { id, organizationId: session.profile.organizationId } })
    if (!existing) return apiError('Introuvable', 404)
    await db.changeControl.delete({ where: { id } })
    await logAudit(session.profile.organizationId, 'DELETE', 'changeControl', id, session.profile.id, session.profile.email, existing)
    return apiSuccess({ ok: true })
  } catch (e: any) { return apiError(e.message, 500) }
}
