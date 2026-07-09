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
    const items = await db.supplier.findMany({ where, orderBy: { createdAt: 'desc' } })
    return apiSuccess({ items })
  } catch (e: any) { return apiError(e.message, 500) }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session || !hasPermission(session.profile.role, 'supplier.create' as any)) return apiError('Permissions insuffisantes', 403)
    const body = await req.json()
    const item = await db.supplier.create({
      data: {
        organizationId: session.profile.organizationId,
        name: body.name || "",
        category: body.category || "",
        qualificationDate: body.qualificationDate ? new Date(body.qualificationDate) : null,
        nextReviewDate: body.nextReviewDate ? new Date(body.nextReviewDate) : null,
        certificationsJson: JSON.stringify(body.certificationsJson || []),
        performanceScore: body.performanceScore !== undefined && body.performanceScore !== null ? Number(body.performanceScore) : null,
        qualificationDocId: body.qualificationDocId || null,
        qualificationMethod: body.qualificationMethod || null,
        qualificationDocRef: body.qualificationDocRef || null,
        website: body.website || null,
        primaryContactName: body.primaryContactName || null,
        primaryContactEmail: body.primaryContactEmail || null,
        primaryContactPhone: body.primaryContactPhone || null,
        street: body.street || null,
        city: body.city || null,
        stateProvince: body.stateProvince || null,
        postalCode: body.postalCode || null,
        country: body.country || null,
        emergencyContactName: body.emergencyContactName || null,
        emergencyContactPhone: body.emergencyContactPhone || null,
        notes: body.notes || null,
        supplierCode: body.supplierCode || `SUP-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
        status: body.status || 'Open',
        title: body.title || '',
      },
    })
    await logAudit(session.profile.organizationId, 'CREATE', 'supplier', item.id, session.profile.id, session.profile.email, undefined, item)
    return apiSuccess({ item }, 201)
  } catch (e: any) { return apiError(e.message, 500) }
}
