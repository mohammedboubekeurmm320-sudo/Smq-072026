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
    const items = await db.cAPA.findMany({ where, orderBy: { createdAt: 'desc' } })
    return apiSuccess({ items })
  } catch (e: any) { return apiError(e.message, 500) }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session || !hasPermission(session.profile.role, 'capa.create' as any)) return apiError('Permissions insuffisantes', 403)
    const body = await req.json()
    const item = await db.cAPA.create({
      data: {
        organizationId: session.profile.organizationId,
        capaType: body.capaType || "",
        priority: body.priority || "",
        source: body.source || "",
        sourceReferenceId: body.sourceReferenceId || null,
        sourceRecordType: body.sourceRecordType || null,
        description: body.description || null,
        problemStatement: body.problemStatement || null,
        investigationDetails: body.investigationDetails || null,
        rootCauseAnalysis: body.rootCauseAnalysis || null,
        rootCauseCategory: body.rootCauseCategory || null,
        fiveWhysJson: JSON.stringify(body.fiveWhysJson || []),
        correctiveAction: body.correctiveAction || null,
        effectivenessVerificationMethod: body.effectivenessVerificationMethod || null,
        effectivenessCriteria: body.effectivenessCriteria || null,
        effectivenessResult: body.effectivenessResult || null,
        linkedDocumentId: body.linkedDocumentId || null,
        linkedNcrId: body.linkedNcrId || null,
        linkedAuditId: body.linkedAuditId || null,
        linkedCapaId: body.linkedCapaId || null,
        templateId: body.templateId || null,
        templateVersion: body.templateVersion || null,
        assignedToId: body.assignedToId || null,
        ownerId: body.ownerId || null,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        closedDate: body.closedDate ? new Date(body.closedDate) : null,
        createdById: session.profile.id,
        createdDate: new Date(),
        capaNumber: body.capaNumber || `CAPA-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
        status: body.status || 'Open',
        title: body.title || '',
      },
    })
    await logAudit(session.profile.organizationId, 'CREATE', 'cAPA', item.id, session.profile.id, session.profile.email, undefined, item)
    return apiSuccess({ item }, 201)
  } catch (e: any) { return apiError(e.message, 500) }
}
