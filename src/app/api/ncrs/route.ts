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
    const items = await db.nonConformance.findMany({ where, orderBy: { createdAt: 'desc' } })
    return apiSuccess({ items })
  } catch (e: any) { return apiError(e.message, 500) }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session || !hasPermission(session.profile.role, 'ncr.create' as any)) return apiError('Permissions insuffisantes', 403)
    const body = await req.json()
    const item = await db.nonConformance.create({
      data: {
        organizationId: session.profile.organizationId,
        ncrType: body.ncrType || "",
        severity: body.severity || "",
        source: body.source || null,
        description: body.description || null,
        lotNumber: body.lotNumber || null,
        quantityAffected: body.quantityAffected || null,
        disposition: body.disposition || "",
        isOosOot: !!body.isOosOot,
        analyticalMethod: body.analyticalMethod || null,
        measuredValue: body.measuredValue !== undefined && body.measuredValue !== null ? Number(body.measuredValue) : null,
        measuredUnit: body.measuredUnit || null,
        specLimit: body.specLimit || null,
        phase1Conclusion: body.phase1Conclusion || null,
        phase2Required: !!body.phase2Required,
        phase2Conclusion: body.phase2Conclusion || null,
        rejectLot: !!body.rejectLot,
        linkedCapaId: body.linkedCapaId || null,
        linkedProcedureRef: body.linkedProcedureRef || null,
        supplierId: body.supplierId || null,
        impactAssessment: body.impactAssessment || null,
        containmentActions: body.containmentActions || null,
        affectedProduct: body.affectedProduct || null,
        closedSignatureHash: body.closedSignatureHash || null,
        closedById: body.closedById || null,
        closedReason: body.closedReason || null,
        assignedToId: body.assignedToId || null,
        ownerId: body.ownerId || null,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        closedSignedAt: body.closedSignedAt ? new Date(body.closedSignedAt) : null,
        closedDate: body.closedDate ? new Date(body.closedDate) : null,
        createdDate: new Date(),
        ncrNumber: body.ncrNumber || `NCR-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
        status: body.status || 'Open',
        title: body.title || '',
      },
    })
    await logAudit(session.profile.organizationId, 'CREATE', 'nonConformance', item.id, session.profile.id, session.profile.email, undefined, item)
    return apiSuccess({ item }, 201)
  } catch (e: any) { return apiError(e.message, 500) }
}
