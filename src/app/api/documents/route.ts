import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession, hasPermission } from '@/lib/auth-server'
import { apiSuccess, apiError, logAudit, parseJson } from '@/lib/api-helpers'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) return apiError('Non authentifié', 401)
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const search = searchParams.get('q')

    const where: any = { organizationId: session.profile.organizationId }
    if (status) where.status = status
    if (type) where.docType = type
    if (search) {
      where.OR = [
        { title: { contains: search } }, { documentNumber: { contains: search } }, { code: { contains: search } },
      ]
    }

    const documents = await db.document.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        author: { select: { id: true, fullName: true } },
        approver: { select: { id: true, fullName: true } },
      },
    })
    return apiSuccess({ documents })
  } catch (e: any) { return apiError(e.message, 500) }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session || !hasPermission(session.profile.role, 'documents.create' as any)) return apiError('Permissions insuffisantes', 403)
    const body = await req.json()
    if (!body.title || !body.documentNumber) return apiError('Titre et numéro requis', 400)

    const existing = await db.document.findUnique({
      where: { organizationId_documentNumber: { organizationId: session.profile.organizationId, documentNumber: body.documentNumber } },
    })
    if (existing) return apiError('Numéro de document déjà utilisé', 409)

    const doc = await db.document.create({
      data: {
        organizationId: session.profile.organizationId,
        documentNumber: body.documentNumber, title: body.title,
        docType: body.docType || 'PROCEDURE', version: body.version || '1.0',
        status: body.status || 'Draft', classification: body.classification || 'Internal',
        code: body.code, isoClause: body.isoClause, documentLevel: body.documentLevel || 4,
        parentDocumentId: body.parentDocumentId, departmentCode: body.departmentCode,
        isPrerequisite: body.isPrerequisite || false, reviewCycleMonths: body.reviewCycleMonths || 12,
        validationPhase: body.validationPhase,
        effectiveDate: body.effectiveDate ? new Date(body.effectiveDate) : null,
        expirationDate: body.expirationDate ? new Date(body.expirationDate) : null,
        nextReview: body.nextReview ? new Date(body.nextReview) : null,
        owner: body.owner, retentionPeriod: body.retentionPeriod,
        docScope: body.docScope, docReferences: body.docReferences,
        content: body.content, summary: body.summary,
        isTemplate: body.isTemplate || false,
        templateReferenceId: body.templateReferenceId, templateReferenceVersion: body.templateReferenceVersion,
        typeSpecificData: body.typeSpecificData ? JSON.stringify(body.typeSpecificData) : null,
        customFieldsJson: body.customFields ? JSON.stringify(body.customFields) : null,
        authorId: session.profile.id, createdById: session.profile.id,
        approverId: body.approverId || null,
      },
    })
    await logAudit(session.profile.organizationId, 'CREATE', 'documents', doc.id, session.profile.id, session.profile.email, undefined, doc)
    return apiSuccess({ document: doc }, 201)
  } catch (e: any) { return apiError(e.message, 500) }
}
