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
    const items = await db.batchRecord.findMany({ where, orderBy: { createdAt: 'desc' } })
    return apiSuccess({ items })
  } catch (e: any) { return apiError(e.message, 500) }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session || !hasPermission(session.profile.role, 'batch.create' as any)) return apiError('Permissions insuffisantes', 403)
    const body = await req.json()
    const item = await db.batchRecord.create({
      data: {
        organizationId: session.profile.organizationId,
        productName: body.productName || "",
        productCode: body.productCode || null,
        batchSize: body.batchSize || null,
        batchSizeUnit: body.batchSizeUnit || "",
        masterFormulaId: body.masterFormulaId || null,
        sopReference: body.sopReference || null,
        manufacturingDate: body.manufacturingDate ? new Date(body.manufacturingDate) : null,
        expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
        isLocked: !!body.isLocked,
        qaReleaseDate: body.qaReleaseDate ? new Date(body.qaReleaseDate) : null,
        qaReleasedById: body.qaReleasedById || null,
        stepsJson: JSON.stringify(body.stepsJson || []),
        rawMaterialsJson: JSON.stringify(body.rawMaterialsJson || []),
        lotNumber: body.lotNumber || `LOT-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
        status: body.status || 'Open',
        title: body.title || '',
      },
    })
    await logAudit(session.profile.organizationId, 'CREATE', 'batchRecord', item.id, session.profile.id, session.profile.email, undefined, item)
    return apiSuccess({ item }, 201)
  } catch (e: any) { return apiError(e.message, 500) }
}
