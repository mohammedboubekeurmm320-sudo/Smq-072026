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
    const item = await db.batchRecord.findFirst({ where: { id, organizationId: session.profile.organizationId } })
    if (!item) return apiError('Introuvable', 404)
    return apiSuccess({ item })
  } catch (e: any) { return apiError(e.message, 500) }
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getServerSession()
    if (!session || !hasPermission(session.profile.role, 'batch.update' as any)) return apiError('Permissions insuffisantes', 403)
    const { id } = await params
    const body = await req.json()
    const existing = await db.batchRecord.findFirst({ where: { id, organizationId: session.profile.organizationId } })
    if (!existing) return apiError('Introuvable', 404)
    const data: any = {}
    if (body.lotNumber !== undefined) data.lotNumber = body.lotNumber;
    if (body.productName !== undefined) data.productName = body.productName;
    if (body.productCode !== undefined) data.productCode = body.productCode || null;
    if (body.batchSize !== undefined) data.batchSize = body.batchSize || null;
    if (body.batchSizeUnit !== undefined) data.batchSizeUnit = body.batchSizeUnit;
    if (body.masterFormulaId !== undefined) data.masterFormulaId = body.masterFormulaId || null;
    if (body.sopReference !== undefined) data.sopReference = body.sopReference || null;
    if (body.manufacturingDate !== undefined) data.manufacturingDate = body.manufacturingDate ? new Date(body.manufacturingDate) : null;
    if (body.expiryDate !== undefined) data.expiryDate = body.expiryDate ? new Date(body.expiryDate) : null;
    if (body.status !== undefined) data.status = body.status;
    if (body.isLocked !== undefined) data.isLocked = !!body.isLocked;
    if (body.qaReleaseDate !== undefined) data.qaReleaseDate = body.qaReleaseDate ? new Date(body.qaReleaseDate) : null;
    if (body.qaReleasedById !== undefined) data.qaReleasedById = body.qaReleasedById || null;
    if (body.stepsJson !== undefined) data.stepsJson = JSON.stringify(body.stepsJson || []);
    if (body.rawMaterialsJson !== undefined) data.rawMaterialsJson = JSON.stringify(body.rawMaterialsJson || []);
    const updated = await db.batchRecord.update({ where: { id }, data })
    await logAudit(session.profile.organizationId, 'UPDATE', 'batchRecord', id, session.profile.id, session.profile.email, existing, updated)
    return apiSuccess({ item: updated })
  } catch (e: any) { return apiError(e.message, 500) }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const session = await getServerSession()
    if (!session || !hasPermission(session.profile.role, 'batch.delete' as any)) return apiError('Permissions insuffisantes', 403)
    const { id } = await params
    const existing = await db.batchRecord.findFirst({ where: { id, organizationId: session.profile.organizationId } })
    if (!existing) return apiError('Introuvable', 404)
    await db.batchRecord.delete({ where: { id } })
    await logAudit(session.profile.organizationId, 'DELETE', 'batchRecord', id, session.profile.id, session.profile.email, existing)
    return apiSuccess({ ok: true })
  } catch (e: any) { return apiError(e.message, 500) }
}
