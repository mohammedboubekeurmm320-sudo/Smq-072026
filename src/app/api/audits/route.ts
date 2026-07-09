import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, ok, fail } from '@/lib/api-helpers'

export async function GET(req: NextRequest) {
  const { user, error } = await requireUser()
  if (error || !user) return error
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const where: any = { organizationId: user.organizationId }
  if (status) where.status = status
  const audits = await db.audit.findMany({
    where,
    include: { leadAuditor: { select: { id: true, name: true } } },
    orderBy: { plannedDate: 'desc' }
  })
  return ok({ audits })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser('ADMIN', 'QUALITY_MANAGER', 'AUDITOR')
  if (error || !user) return error
  const body = await req.json()
  const { title, type, scope, plannedDate, conductedDate, status, findings, conclusion, leadAuditorId } = body
  if (!title) return fail('Titre requis')
  const audit = await db.audit.create({
    data: {
      organizationId: user.organizationId,
      title, type: type || 'internal', scope,
      plannedDate: plannedDate ? new Date(plannedDate) : null,
      conductedDate: conductedDate ? new Date(conductedDate) : null,
      status: status || 'PLANNED',
      findings, conclusion,
      leadAuditorId: leadAuditorId || user.id
    }
  })
  return ok({ audit }, 201)
}
