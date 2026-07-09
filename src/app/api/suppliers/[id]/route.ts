import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, ok, fail } from '@/lib/api-helpers'

type Ctx = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: Ctx) {
  const { user, error } = await requireUser('ADMIN', 'QUALITY_MANAGER')
  if (error || !user) return error
  const { id } = await params
  const body = await req.json()
  const existing = await db.supplier.findFirst({ where: { id, organizationId: user.organizationId } })
  if (!existing) return fail('Fournisseur introuvable', 404)
  const { name, contactName, email, phone, category, evaluation, evaluationDate, riskLevel, notes } = body
  const updated = await db.supplier.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(contactName !== undefined && { contactName }),
      ...(email !== undefined && { email }),
      ...(phone !== undefined && { phone }),
      ...(category !== undefined && { category }),
      ...(evaluation !== undefined && { evaluation }),
      ...(evaluationDate !== undefined && { evaluationDate: evaluationDate ? new Date(evaluationDate) : null }),
      ...(riskLevel !== undefined && { riskLevel }),
      ...(notes !== undefined && { notes })
    }
  })
  return ok({ supplier: updated })
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { user, error } = await requireUser('ADMIN', 'QUALITY_MANAGER')
  if (error || !user) return error
  const { id } = await params
  const existing = await db.supplier.findFirst({ where: { id, organizationId: user.organizationId } })
  if (!existing) return fail('Fournisseur introuvable', 404)
  await db.supplier.delete({ where: { id } })
  return ok({ ok: true })
}
