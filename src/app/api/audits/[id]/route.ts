import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, ok, fail } from '@/lib/api-helpers'

type Ctx = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: Ctx) {
  const { user, error } = await requireUser('ADMIN', 'QUALITY_MANAGER', 'AUDITOR')
  if (error || !user) return error
  const { id } = await params
  const body = await req.json()
  const existing = await db.audit.findFirst({ where: { id, organizationId: user.organizationId } })
  if (!existing) return fail('Audit introuvable', 404)
  const { title, type, scope, plannedDate, conductedDate, status, findings, conclusion, leadAuditorId } = body
  const updated = await db.audit.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(type !== undefined && { type }),
      ...(scope !== undefined && { scope }),
      ...(plannedDate !== undefined && { plannedDate: plannedDate ? new Date(plannedDate) : null }),
      ...(conductedDate !== undefined && { conductedDate: conductedDate ? new Date(conductedDate) : null }),
      ...(status !== undefined && { status }),
      ...(findings !== undefined && { findings }),
      ...(conclusion !== undefined && { conclusion }),
      ...(leadAuditorId !== undefined && { leadAuditorId })
    }
  })
  return ok({ audit: updated })
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { user, error } = await requireUser('ADMIN', 'QUALITY_MANAGER')
  if (error || !user) return error
  const { id } = await params
  const existing = await db.audit.findFirst({ where: { id, organizationId: user.organizationId } })
  if (!existing) return fail('Audit introuvable', 404)
  await db.audit.delete({ where: { id } })
  return ok({ ok: true })
}
