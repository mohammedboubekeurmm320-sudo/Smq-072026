import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession, hasPermission } from '@/lib/auth-server'
import { apiSuccess, apiError, logAudit, parseJson } from '@/lib/api-helpers'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) return apiError('Non authentifié', 401)
    const { searchParams } = new URL(req.url)
    const isSystem = searchParams.get('isSystem')
    const isActive = searchParams.get('isActive')

    const where: any = { organizationId: session.profile.organizationId }
    if (isSystem === 'true') where.isSystem = true
    if (isSystem === 'false') where.isSystem = false
    if (isActive === 'true') where.isActive = true

    const types = await db.recordTypeDefinition.findMany({ where, orderBy: { isSystem: 'desc' } })
    const parsed = types.map(t => ({
      ...t,
      statusFlow: parseJson(t.statusFlowJson, []),
      defaultFields: parseJson(t.defaultFieldsJson, []),
      complianceRefs: parseJson(t.complianceRefsJson, []),
    }))
    return apiSuccess({ recordTypes: parsed })
  } catch (e: any) { return apiError(e.message, 500) }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session || !hasPermission(session.profile.role, 'recordtypes.create' as any)) return apiError('Permissions insuffisantes', 403)
    const body = await req.json()
    if (!body.slug) return apiError('Slug requis', 400)
    if (!/^[a-z][a-z0-9_]*$/.test(body.slug)) return apiError('Slug invalide', 400)
    if (!body.complianceRefs || body.complianceRefs.length === 0) return apiError('Au moins 1 référence de conformité requise', 400)
    if (!body.statusFlow || body.statusFlow.length === 0) return apiError('Au moins 1 statut requis', 400)

    const existing = await db.recordTypeDefinition.findFirst({
      where: { organizationId: session.profile.organizationId, slug: body.slug },
    })
    if (existing) return apiError('Slug déjà utilisé', 409)

    const rt = await db.recordTypeDefinition.create({
      data: {
        slug: body.slug, name: body.name || body.slug, nameEn: body.nameEn,
        icon: body.icon || 'FileText', description: body.description,
        statusFlowJson: JSON.stringify(body.statusFlow),
        defaultFieldsJson: JSON.stringify(body.defaultFields || []),
        complianceRefsJson: JSON.stringify(body.complianceRefs),
        codePrefix: body.codePrefix || null,
        isSystem: false, isActive: true,
        requiresEsig: !!body.requiresEsig,
        minApproverCount: body.minApproverCount || 1,
        version: 1, organizationId: session.profile.organizationId,
        createdById: session.profile.id,
      },
    })
    await logAudit(session.profile.organizationId, 'CREATE', 'record_type_definitions', rt.id, session.profile.id, session.profile.email, undefined, rt)
    return apiSuccess({ recordType: rt }, 201)
  } catch (e: any) { return apiError(e.message, 500) }
}
