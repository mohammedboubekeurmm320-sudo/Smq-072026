import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from '@/lib/auth-server'
import { apiSuccess, apiError, parseJson } from '@/lib/api-helpers'

export async function GET() {
  try {
    const session = await getServerSession()
    if (!session) return apiError('Non authentifié', 401)
    const reports = await db.scheduledReport.findMany({
      where: { organizationId: session.profile.organizationId },
      orderBy: { createdAt: 'desc' },
    })
    const parsed = reports.map(r => ({
      ...r,
      recipients: parseJson(r.recipientsJson, []),
      filters: parseJson(r.filtersJson, {}),
    }))
    return apiSuccess({ reports: parsed })
  } catch (e: any) { return apiError(e.message, 500) }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) return apiError('Non authentifié', 401)
    const body = await req.json()
    if (!body.name || !body.reportType) return apiError('Nom et type requis', 400)

    const nextRunAt = computeNextRun(body.frequency || 'monthly')
    const report = await db.scheduledReport.create({
      data: {
        name: body.name, reportType: body.reportType,
        format: body.format || 'pdf', frequency: body.frequency || 'monthly',
        recipientsJson: JSON.stringify(body.recipients || []),
        filtersJson: JSON.stringify(body.filters || {}),
        status: 'active', nextRunAt,
        organizationId: session.profile.organizationId,
      },
    })
    return apiSuccess({ report }, 201)
  } catch (e: any) { return apiError(e.message, 500) }
}

function computeNextRun(frequency: string): Date {
  const now = new Date()
  switch (frequency) {
    case 'daily': return new Date(now.getTime() + 24 * 3600 * 1000)
    case 'weekly': return new Date(now.getTime() + 7 * 24 * 3600 * 1000)
    case 'monthly': return new Date(now.getTime() + 30 * 24 * 3600 * 1000)
    case 'quarterly': return new Date(now.getTime() + 90 * 24 * 3600 * 1000)
    default: return new Date(now.getTime() + 30 * 24 * 3600 * 1000)
  }
}
