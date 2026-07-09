import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, ok, fail } from '@/lib/api-helpers'

type Ctx = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: Ctx) {
  const { user, error } = await requireUser('ADMIN', 'QUALITY_MANAGER')
  if (error || !user) return error
  const { id } = await params
  const body = await req.json()
  const existing = await db.process.findFirst({ where: { id, organizationId: user.organizationId } })
  if (!existing) return fail('Processus introuvable', 404)
  const { name, description, type, ownerId, inputs, outputs, kpi, status } = body
  const updated = await db.process.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(type !== undefined && { type }),
      ...(ownerId !== undefined && { ownerId }),
      ...(inputs !== undefined && { inputs }),
      ...(outputs !== undefined && { outputs }),
      ...(kpi !== undefined && { kpi }),
      ...(status !== undefined && { status })
    }
  })
  return ok({ process: updated })
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { user, error } = await requireUser('ADMIN', 'QUALITY_MANAGER')
  if (error || !user) return error
  const { id } = await params
  const existing = await db.process.findFirst({ where: { id, organizationId: user.organizationId } })
  if (!existing) return fail('Processus introuvable', 404)
  await db.process.delete({ where: { id } })
  return ok({ ok: true })
}
