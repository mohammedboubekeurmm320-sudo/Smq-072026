import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from '@/lib/auth-server'
import { apiSuccess, apiError } from '@/lib/api-helpers'

export async function GET() {
  try {
    const session = await getServerSession()
    if (!session) return apiError('Non authentifié', 401)
    const org = await db.organization.findUnique({
      where: { id: session.profile.organizationId },
      include: {
        _count: {
          select: {
            profiles: true, documents: true, capas: true, nonConformances: true,
            deviations: true, changeControls: true, audits: true, risks: true,
            trainings: true, batchRecords: true, suppliers: true, recordLinks: true,
          },
        },
      },
    })
    return apiSuccess({ organization: org })
  } catch (e: any) {
    return apiError(e.message, 500)
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) return apiError('Non authentifié', 401)
    const body = await req.json()
    const { name, settings, ...rest } = body

    const existing = await db.organization.findUnique({ where: { id: session.profile.organizationId } })
    if (!existing) return apiError('Organisation introuvable', 404)

    const updated = await db.organization.update({
      where: { id: session.profile.organizationId },
      data: {
        ...(name !== undefined && { name }),
        ...(settings !== undefined && { settings: typeof settings === 'string' ? settings : JSON.stringify(settings) }),
        ...rest,
      },
    })
    return apiSuccess({ organization: updated })
  } catch (e: any) {
    return apiError(e.message, 500)
  }
}
