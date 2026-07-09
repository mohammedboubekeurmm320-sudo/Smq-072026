import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, ok, fail } from '@/lib/api-helpers'

type Ctx = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: Ctx) {
  const { user, error } = await requireUser('ADMIN', 'QUALITY_MANAGER', 'ENGINEER', 'AUDITOR')
  if (error || !user) return error
  const { id } = await params
  const body = await req.json()
  const existing = await db.nonconformity.findFirst({ where: { id, organizationId: user.organizationId } })
  if (!existing) return fail('Non-conformité introuvable', 404)
  const { reference, title, description, source, severity, status, ownerId, detectedDate, closedDate } = body
  const updated = await db.nonconformity.update({
    where: { id },
    data: {
      ...(reference !== undefined && { reference }),
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(source !== undefined && { source }),
      ...(severity !== undefined && { severity }),
      ...(status !== undefined && { status }),
      ...(ownerId !== undefined && { ownerId }),
      ...(detectedDate !== undefined && { detectedDate: detectedDate ? new Date(detectedDate) : null }),
      ...(closedDate !== undefined && { closedDate: closedDate ? new Date(closedDate) : null })
    }
  })
  return ok({ nonconformity: updated })
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { user, error } = await requireUser('ADMIN', 'QUALITY_MANAGER')
  if (error || !user) return error
  const { id } = await params
  const existing = await db.nonconformity.findFirst({ where: { id, organizationId: user.organizationId } })
  if (!existing) return fail('Non-conformité introuvable', 404)
  await db.nonconformity.delete({ where: { id } })
  return ok({ ok: true })
}
