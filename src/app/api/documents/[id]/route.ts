import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { supabase } from '@/lib/supabase'
import { toCamelCase } from '@/lib/db'
import { getServerSession, hasPermission } from '@/lib/auth-server'
import { apiSuccess, apiError, logAudit } from '@/lib/api-helpers'

interface Ctx { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const session = await getServerSession()
    if (!session) return apiError('Non authentifié', 401)
    const { id } = await params

    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .eq('organization_id', session.profile.organizationId)
      .limit(1)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) return apiError('Document introuvable', 404)

    const doc = toCamelCase(data) as any

    // Fetch author and approver profiles
    const profileIds: string[] = []
    if (doc.authorId) profileIds.push(doc.authorId)
    if (doc.approverId) profileIds.push(doc.approverId)

    if (profileIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id,full_name')
        .in('id', profileIds)
      const profileMap = new Map<string, any>()
      for (const p of (profiles || [])) profileMap.set(p.id, toCamelCase(p))
      doc.author = doc.authorId ? profileMap.get(doc.authorId) || null : null
      doc.approver = doc.approverId ? profileMap.get(doc.approverId) || null : null
    } else {
      doc.author = null
      doc.approver = null
    }

    return apiSuccess({ document: doc })
  } catch (e: any) { return apiError(e.message, 500) }
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getServerSession()
    if (!session || !hasPermission(session.profile.role, 'documents.update' as any)) return apiError('Permissions insuffisantes', 403)
    const { id } = await params
    const body = await req.json()
    const existing = await db.document.findFirst({ where: { id, organizationId: session.profile.organizationId } })
    if (!existing) return apiError('Document introuvable', 404)

    const data: any = {}
    const fields = ['title', 'docType', 'version', 'status', 'classification', 'code', 'isoClause', 'documentLevel', 'parentDocumentId', 'departmentCode', 'isPrerequisite', 'reviewCycleMonths', 'validationPhase', 'owner', 'retentionPeriod', 'docScope', 'docReferences', 'content', 'summary', 'isTemplate', 'templateReferenceId', 'templateReferenceVersion', 'approverId']
    for (const f of fields) if (body[f] !== undefined) data[f] = body[f]
    if (body.effectiveDate !== undefined) data.effectiveDate = body.effectiveDate ? new Date(body.effectiveDate) : null
    if (body.nextReview !== undefined) data.nextReview = body.nextReview ? new Date(body.nextReview) : null
    if (body.expirationDate !== undefined) data.expirationDate = body.expirationDate ? new Date(body.expirationDate) : null
    if (body.typeSpecificData !== undefined) data.typeSpecificData = JSON.stringify(body.typeSpecificData)
    if (body.customFields !== undefined) data.customFieldsJson = JSON.stringify(body.customFields)

    const updated = await db.document.update({ where: { id }, data })
    await logAudit(session.profile.organizationId, 'UPDATE', 'documents', id, session.profile.id, session.profile.email, existing, updated)
    return apiSuccess({ document: updated })
  } catch (e: any) { return apiError(e.message, 500) }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const session = await getServerSession()
    if (!session || !hasPermission(session.profile.role, 'documents.delete' as any)) return apiError('Permissions insuffisantes', 403)
    const { id } = await params
    const existing = await db.document.findFirst({ where: { id, organizationId: session.profile.organizationId } })
    if (!existing) return apiError('Document introuvable', 404)
    await db.document.delete({ where: { id } })
    await logAudit(session.profile.organizationId, 'DELETE', 'documents', id, session.profile.id, session.profile.email, existing)
    return apiSuccess({ ok: true })
  } catch (e: any) { return apiError(e.message, 500) }
}