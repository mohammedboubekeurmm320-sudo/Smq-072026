import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, ok, fail } from '@/lib/api-helpers'

type Ctx = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: Ctx) {
  const { user, error } = await requireUser('ADMIN', 'QUALITY_MANAGER', 'ENGINEER')
  if (error || !user) return error
  const { id } = await params
  const body = await req.json()
  const existing = await db.risk.findFirst({ where: { id, organizationId: user.organizationId } })
  if (!existing) return fail('Risque introuvable', 404)

  const { title, description, process, hazard, severity, probability, detectability, mitigation, ownerId, status } = body
  const s = severity !== undefined ? clamp(severity, 1, 5, existing.severity) : existing.severity
  const p = probability !== undefined ? clamp(probability, 1, 5, existing.probability) : existing.probability
  const d = detectability !== undefined ? clamp(detectability, 1, 5, existing.detectability) : existing.detectability
  const updated = await db.risk.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(process !== undefined && { process }),
      ...(hazard !== undefined && { hazard }),
      severity: s, probability: p, detectability: d, rpn: s * p * d,
      ...(mitigation !== undefined && { mitigation }),
      ...(ownerId !== undefined && { ownerId }),
      ...(status !== undefined && { status })
    }
  })
  return ok({ risk: updated })
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { user, error } = await requireUser('ADMIN', 'QUALITY_MANAGER')
  if (error || !user) return error
  const { id } = await params
  const existing = await db.risk.findFirst({ where: { id, organizationId: user.organizationId } })
  if (!existing) return fail('Risque introuvable', 404)
  await db.risk.delete({ where: { id } })
  return ok({ ok: true })
}

function clamp(v: any, min: number, max: number, def: number): number {
  const n = Number(v)
  if (isNaN(n)) return def
  return Math.max(min, Math.min(max, n))
}
