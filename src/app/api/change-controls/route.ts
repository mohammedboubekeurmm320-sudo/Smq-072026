import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession, hasPermission } from '@/lib/auth-server'
import { apiSuccess, apiError, logAudit } from '@/lib/api-helpers'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) return apiError('Non authentifié', 401)
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const search = searchParams.get('q')
    const where: any = { organizationId: session.profile.organizationId }
    if (status) where.status = status
    if (search) where.OR = [{ title: { contains: search } }]
    const items = await db.changeControl.findMany({ where, orderBy: { createdAt: 'desc' } })
    return apiSuccess({ items })
  } catch (e: any) { return apiError(e.message, 500) }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session || !hasPermission(session.profile.role, 'changecontrol.create' as any)) return apiError('Permissions insuffisantes', 403)
    const body = await req.json()
    const item = await db.changeControl.create({
      data: {
        organizationId: session.profile.organizationId,
        ccType: body.ccType || "",
        priority: body.priority || "",
        category: body.category || "",
        description: body.description || null,
        justification: body.justification || null,
        proposedChange: body.proposedChange || null,
        detailedChangeDescription: body.detailedChangeDescription || null,
        businessComplianceJustification: body.businessComplianceJustification || null,
        riskAssessment: body.riskAssessment || null,
        impactAnalysis: body.impactAnalysis || null,
        affectedAreas: body.affectedAreas || null,
        impactOnValidatedSystems: !!body.impactOnValidatedSystems,
        implementationPlan: body.implementationPlan || null,
        implementationDate: body.implementationDate ? new Date(body.implementationDate) : null,
        estimatedCostImpact: body.estimatedCostImpact || null,
        completionDate: body.completionDate ? new Date(body.completionDate) : null,
        regulatoryTrigger: body.regulatoryTrigger || null,
        emergencyFlag: !!body.emergencyFlag,
        linkedDocumentId: body.linkedDocumentId || null,
        linkedCapaId: body.linkedCapaId || null,
        additionalReferences: body.additionalReferences || null,
        assignedToId: body.assignedToId || null,
        requestedById: body.requestedById || null,
        approvedById: body.approvedById || null,
        approverId: body.approverId || null,
        ownerId: body.ownerId || null,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        ccNumber: body.ccNumber || `CC-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
        status: body.status || 'Open',
        title: body.title || '',
      },
    })
    await logAudit(session.profile.organizationId, 'CREATE', 'changeControl', item.id, session.profile.id, session.profile.email, undefined, item)
    return apiSuccess({ item }, 201)
  } catch (e: any) { return apiError(e.message, 500) }
}
