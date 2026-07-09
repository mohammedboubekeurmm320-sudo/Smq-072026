import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, ok, fail } from '@/lib/api-helpers'

type Ctx = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: Ctx) {
  const { user, error } = await requireUser('ADMIN', 'QUALITY_MANAGER')
  if (error || !user) return error
  const { id } = await params
  const body = await req.json()
  const existing = await db.training.findFirst({ where: { id, organizationId: user.organizationId } })
  if (!existing) return fail('Formation introuvable', 404)
  const { userId, name, description, category, conductedDate, completedDate, status, score } = body
  const updated = await db.training.update({
    where: { id },
    data: {
      ...(userId !== undefined && { userId }),
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(category !== undefined && { category }),
      ...(conductedDate !== undefined && { conductedDate: conductedDate ? new Date(conductedDate) : null }),
      ...(completedDate !== undefined && { completedDate: completedDate ? new Date(completedDate) : null }),
      ...(status !== undefined && { status }),
      ...(score !== undefined && { score: score || null })
    }
  })
  return ok({ training: updated })
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { user, error } = await requireUser('ADMIN', 'QUALITY_MANAGER')
  if (error || !user) return error
  const { id } = await params
  const existing = await db.training.findFirst({ where: { id, organizationId: user.organizationId } })
  if (!existing) return fail('Formation introuvable', 404)
  await db.training.delete({ where: { id } })
  return ok({ ok: true })
}
