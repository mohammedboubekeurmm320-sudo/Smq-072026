import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from '@/lib/auth-server'
import { apiSuccess, apiError, logAudit } from '@/lib/api-helpers'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) return apiError('Non authentifié', 401)
    const { searchParams } = new URL(req.url)
    const recordId = searchParams.get('recordId')
    const recordType = searchParams.get('recordType')
    const linkType = searchParams.get('linkType')

    const where: any = { organizationId: session.profile.organizationId }
    if (recordId && recordType) {
      where.OR = [
        { AND: [{ sourceRecordId: recordId }, { sourceRecordType: recordType }] },
        { AND: [{ targetRecordId: recordId }, { targetRecordType: recordType }] },
      ]
    }
    if (linkType) where.linkType = linkType

    const links = await db.recordLink.findMany({ where, orderBy: { createdAt: 'desc' } })
    return apiSuccess({ links })
  } catch (e: any) { return apiError(e.message, 500) }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) return apiError('Non authentifié', 401)
    const body = await req.json()
    const { sourceRecordId, sourceRecordType, targetRecordId, targetRecordType, linkType, description } = body
    if (!sourceRecordId || !sourceRecordType || !targetRecordId || !targetRecordType) return apiError('Champs requis manquants', 400)
    if (sourceRecordId === targetRecordId && sourceRecordType === targetRecordType) return apiError('Lien auto-référent interdit', 400)

    const validLinkTypes = ['related', 'caused_by', 'corrected_by', 'linked_to', 'derived_from', 'supersedes', 'references', 'depends_on']
    if (!validLinkTypes.includes(linkType)) return apiError('Type de lien invalide', 400)

    const existing = await db.recordLink.findFirst({
      where: { organizationId: session.profile.organizationId, sourceRecordId, sourceRecordType, targetRecordId, targetRecordType, linkType },
    })
    if (existing) return apiError('Ce lien existe déjà', 409)

    const link = await db.recordLink.create({
      data: {
        organizationId: session.profile.organizationId,
        sourceRecordId, sourceRecordType, targetRecordId, targetRecordType,
        linkType, description: description || null,
        createdById: session.profile.id,
      },
    })
    await logAudit(session.profile.organizationId, 'CREATE', 'record_links', link.id, session.profile.id, session.profile.email, undefined, link)
    return apiSuccess({ link }, 201)
  } catch (e: any) { return apiError(e.message, 500) }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) return apiError('Non authentifié', 401)
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return apiError('id requis', 400)
    const existing = await db.recordLink.findFirst({ where: { id, organizationId: session.profile.organizationId } })
    if (!existing) return apiError('Lien introuvable', 404)
    await db.recordLink.delete({ where: { id } })
    await logAudit(session.profile.organizationId, 'DELETE', 'record_links', id, session.profile.id, session.profile.email, existing)
    return apiSuccess({ ok: true })
  } catch (e: any) { return apiError(e.message, 500) }
}
