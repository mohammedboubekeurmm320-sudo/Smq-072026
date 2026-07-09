import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from '@/lib/auth-server'
import { apiSuccess, apiError, logAudit } from '@/lib/api-helpers'

interface Ctx { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getServerSession()
    if (!session) return apiError('Non authentifié', 401)
    const { id } = await params
    const body = await req.json()
    const existing = await db.scheduledReport.findFirst({ where: { id, organizationId: session.profile.organizationId } })
    if (!existing) return apiError('Rapport introuvable', 404)

    const data: any = {}
    if (body.name !== undefined) data.name = body.name
    if (body.reportType !== undefined) data.reportType = body.reportType
    if (body.format !== undefined) data.format = body.format
    if (body.frequency !== undefined) data.frequency = body.frequency
    if (body.recipients !== undefined) data.recipientsJson = JSON.stringify(body.recipients)
    if (body.filters !== undefined) data.filtersJson = JSON.stringify(body.filters)
    if (body.status !== undefined) data.status = body.status
    if (body.lastRunAt !== undefined) data.lastRunAt = body.lastRunAt ? new Date(body.lastRunAt) : null
    if (body.nextRunAt !== undefined) data.nextRunAt = body.nextRunAt ? new Date(body.nextRunAt) : null
    if (body.lastResult !== undefined) data.lastResult = body.lastResult

    const updated = await db.scheduledReport.update({ where: { id }, data })
    return apiSuccess({ report: updated })
  } catch (e: any) { return apiError(e.message, 500) }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const session = await getServerSession()
    if (!session) return apiError('Non authentifié', 401)
    const { id } = await params
    const existing = await db.scheduledReport.findFirst({ where: { id, organizationId: session.profile.organizationId } })
    if (!existing) return apiError('Rapport introuvable', 404)
    await db.scheduledReport.delete({ where: { id } })
    return apiSuccess({ ok: true })
  } catch (e: any) { return apiError(e.message, 500) }
}
