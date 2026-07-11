import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { supabase } from '@/lib/supabase'
import { toCamelCase } from '@/lib/db'
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

    let query = supabase
      .from('documents')
      .select('*')
      .eq('organization_id', session.profile.organizationId)

    if (status) query = query.eq('status', status)
    if (type) query = query.eq('doc_type', type)
    if (search) {
      query = query.or(`title.ilike.%${search}%,document_number.ilike.%${search}%,code.ilike.%${search}%`)
    }

    query = query.order('updated_at', { ascending: false })

    const { data, error } = await query
    if (error) throw new Error(error.message)

    // Collect unique author/approver IDs and fetch profiles
    const documents = (data || []).map(toCamelCase) as any[]
    const profileIds = new Set<string>()
    for (const doc of documents) {
      if (doc.authorId) profileIds.add(doc.authorId)
      if (doc.approverId) profileIds.add(doc.approverId)
    }

    if (profileIds.size > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id,full_name')
        .in('id', Array.from(profileIds))

      const profileMap = new Map<string, any>()
      for (const p of (profiles || [])) {
        profileMap.set(p.id, toCamelCase(p))
      }
      for (const doc of documents) {
        doc.author = doc.authorId ? profileMap.get(doc.authorId) || null : null
        doc.approver = doc.approverId ? profileMap.get(doc.approverId) || null : null
      }
    } else {
      for (const doc of documents) {
        doc.author = null
        doc.approver = null
      }
    }

    return apiSuccess({ documents })
  } catch (e: any) { return apiError(e.message, 500) }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session || !hasPermission(session.profile.role, 'documents.create' as any)) return apiError('Permissions insuffisantes', 403)
    const body = await req.json()
    if (!body.title || !body.documentNumber) return apiError('Titre et numéro requis', 400)

    // Check unique constraint
    const { data: existing, error: checkError } = await supabase
      .from('documents')
      .select('id')
      .eq('organization_id', session.profile.organizationId)
      .eq('document_number', body.documentNumber)
      .limit(1)
      .maybeSingle()
    if (checkError) throw new Error(checkError.message)
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