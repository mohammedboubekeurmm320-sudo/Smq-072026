import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from '@/lib/auth-server'
import { apiSuccess, apiError, parseJson } from '@/lib/api-helpers'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) return apiError('Non authentifié', 401)
    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action')
    const tableName = searchParams.get('tableName')
    const userId = searchParams.get('userId')
    const limit = Math.min(Number(searchParams.get('limit') || '200'), 500)

    const where: any = { organizationId: session.profile.organizationId }
    if (action) where.auditAction = action
    if (tableName) where.tableName = tableName
    if (userId) where.userId = userId

    const entries = await db.auditTrail.findMany({
      where, orderBy: { createdAt: 'desc' }, take: limit,
    })
    // Parse JSON fields for client
    const parsed = entries.map(e => ({
      ...e,
      oldValues: parseJson(e.oldValuesJson, null),
      newValues: parseJson(e.newValuesJson, null),
    }))
    return apiSuccess({ entries: parsed })
  } catch (e: any) { return apiError(e.message, 500) }
}
