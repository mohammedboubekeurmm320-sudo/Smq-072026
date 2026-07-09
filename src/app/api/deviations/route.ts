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
    const items = await db.deviation.findMany({ where, orderBy: { createdAt: 'desc' } })
    return apiSuccess({ items })
  } catch (e: any) { return apiError(e.message, 500) }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session || !hasPermission(session.profile.role, 'deviation.create' as any)) return apiError('Permissions insuffisantes', 403)
    const body = await req.json()
    const item = await db.deviation.create({
      data: {
        organizationId: session.profile.organizationId,
        deviationType: body.deviationType || "",
        severity: body.severity || "",
        category: body.category || "",
        description: body.description || null,
        deviationDetails: body.deviationDetails || null,
        justification: body.justification || null,
        riskAssessment: body.riskAssessment || null,
        correctiveAction: body.correctiveAction || null,
        preventiveAction: body.preventiveAction || null,
        sopReference: body.sopReference || null,
        expectedResult: body.expectedResult || null,
        actualResult: body.actualResult || null,
        productStage: body.productStage || null,
        quarantine: !!body.quarantine,
        impactOnValidatedState: body.impactOnValidatedState || null,
        impactOnRegulatoryFiling: body.impactOnRegulatoryFiling || null,
        containmentAction: body.containmentAction || null,
        detectedDate: body.detectedDate ? new Date(body.detectedDate) : null,
        isPlannedDeviation: !!body.isPlannedDeviation,
        lotNumber: body.lotNumber || null,
        productCode: body.productCode || null,
        quantityAffected: body.quantityAffected || null,
        linkedCapaId: body.linkedCapaId || null,
        linkedDocumentId: body.linkedDocumentId || null,
        assignedToId: body.assignedToId || null,
        ownerId: body.ownerId || null,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        closedDate: body.closedDate ? new Date(body.closedDate) : null,
        devNumber: body.devNumber || `DEV-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
        status: body.status || 'Open',
        title: body.title || '',
      },
    })
    await logAudit(session.profile.organizationId, 'CREATE', 'deviation', item.id, session.profile.id, session.profile.email, undefined, item)
    return apiSuccess({ item }, 201)
  } catch (e: any) { return apiError(e.message, 500) }
}
