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
    const item = await db.supplier.findFirst({ where: { id, organizationId: session.profile.organizationId } })
    if (!item) return apiError('Introuvable', 404)
    return apiSuccess({ item })
  } catch (e: any) { return apiError(e.message, 500) }
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getServerSession()
    if (!session || !hasPermission(session.profile.role, 'supplier.update' as any)) return apiError('Permissions insuffisantes', 403)
    const { id } = await params
    const body = await req.json()
    const existing = await db.supplier.findFirst({ where: { id, organizationId: session.profile.organizationId } })
    if (!existing) return apiError('Introuvable', 404)
    const data: any = {}
    if (body.supplierCode !== undefined) data.supplierCode = body.supplierCode;
    if (body.name !== undefined) data.name = body.name;
    if (body.category !== undefined) data.category = body.category;
    if (body.status !== undefined) data.status = body.status;
    if (body.qualificationDate !== undefined) data.qualificationDate = body.qualificationDate ? new Date(body.qualificationDate) : null;
    if (body.nextReviewDate !== undefined) data.nextReviewDate = body.nextReviewDate ? new Date(body.nextReviewDate) : null;
    if (body.certificationsJson !== undefined) data.certificationsJson = JSON.stringify(body.certificationsJson || []);
    if (body.performanceScore !== undefined) data.performanceScore = body.performanceScore !== null ? Number(body.performanceScore) : null;
    if (body.qualificationDocId !== undefined) data.qualificationDocId = body.qualificationDocId || null;
    if (body.qualificationMethod !== undefined) data.qualificationMethod = body.qualificationMethod || null;
    if (body.qualificationDocRef !== undefined) data.qualificationDocRef = body.qualificationDocRef || null;
    if (body.website !== undefined) data.website = body.website || null;
    if (body.primaryContactName !== undefined) data.primaryContactName = body.primaryContactName || null;
    if (body.primaryContactEmail !== undefined) data.primaryContactEmail = body.primaryContactEmail || null;
    if (body.primaryContactPhone !== undefined) data.primaryContactPhone = body.primaryContactPhone || null;
    if (body.street !== undefined) data.street = body.street || null;
    if (body.city !== undefined) data.city = body.city || null;
    if (body.stateProvince !== undefined) data.stateProvince = body.stateProvince || null;
    if (body.postalCode !== undefined) data.postalCode = body.postalCode || null;
    if (body.country !== undefined) data.country = body.country || null;
    if (body.emergencyContactName !== undefined) data.emergencyContactName = body.emergencyContactName || null;
    if (body.emergencyContactPhone !== undefined) data.emergencyContactPhone = body.emergencyContactPhone || null;
    if (body.notes !== undefined) data.notes = body.notes || null;
    const updated = await db.supplier.update({ where: { id }, data })
    await logAudit(session.profile.organizationId, 'UPDATE', 'supplier', id, session.profile.id, session.profile.email, existing, updated)
    return apiSuccess({ item: updated })
  } catch (e: any) { return apiError(e.message, 500) }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const session = await getServerSession()
    if (!session || !hasPermission(session.profile.role, 'supplier.delete' as any)) return apiError('Permissions insuffisantes', 403)
    const { id } = await params
    const existing = await db.supplier.findFirst({ where: { id, organizationId: session.profile.organizationId } })
    if (!existing) return apiError('Introuvable', 404)
    await db.supplier.delete({ where: { id } })
    await logAudit(session.profile.organizationId, 'DELETE', 'supplier', id, session.profile.id, session.profile.email, existing)
    return apiSuccess({ ok: true })
  } catch (e: any) { return apiError(e.message, 500) }
}
