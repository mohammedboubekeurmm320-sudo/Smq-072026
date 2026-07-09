import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, ok, fail } from '@/lib/api-helpers'

type Ctx = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: Ctx) {
  const { user, error } = await requireUser('ADMIN', 'QUALITY_MANAGER', 'ENGINEER')
  if (error || !user) return error
  const { id } = await params
  const body = await req.json()
  const existing = await db.cAPA.findFirst({ where: { id, organizationId: user.organizationId } })
  if (!existing) return fail('CAPA introuvable', 404)
  const { reference, type, title, description, rootCause, action, dueDate, completedDate, status, ownerId, nonconformityId } = body
  const updated = await db.cAPA.update({
    where: { id },
    data: {
      ...(reference !== undefined && { reference }),
      ...(type !== undefined && { type }),
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(rootCause !== undefined && { rootCause }),
      ...(action !== undefined && { action }),
      ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      ...(completedDate !== undefined && { completedDate: completedDate ? new Date(completedDate) : null }),
      ...(status !== undefined && { status }),
      ...(ownerId !== undefined && { ownerId }),
      ...(nonconformityId !== undefined && { nonconformityId: nonconformityId || null })
    }
  })
  return ok({ capa: updated })
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { user, error } = await requireUser('ADMIN', 'QUALITY_MANAGER')
  if (error || !user) return error
  const { id } = await params
  const existing = await db.cAPA.findFirst({ where: { id, organizationId: user.organizationId } })
  if (!existing) return fail('CAPA introuvable', 404)
  await db.cAPA.delete({ where: { id } })
  return ok({ ok: true })
}
