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
  const risks = await db.risk.findMany({
    where,
    include: { owner: { select: { id: true, name: true } } },
    orderBy: { rpn: 'desc' }
  })
  return ok({ risks })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser('ADMIN', 'QUALITY_MANAGER', 'ENGINEER')
  if (error || !user) return error
  const body = await req.json()
  const { title, description, process, hazard, severity, probability, detectability, mitigation, ownerId, status } = body
  if (!title) return fail('Titre requis')
  const s = clamp(severity, 1, 5, 5)
  const p = clamp(probability, 1, 5, 5)
  const d = clamp(detectability, 1, 5, 5)
  const risk = await db.risk.create({
    data: {
      organizationId: user.organizationId,
      title, description, process, hazard,
      severity: s, probability: p, detectability: d,
      rpn: s * p * d,
      mitigation,
      ownerId: ownerId || user.id,
      status: status || 'IDENTIFIED'
    }
  })
  return ok({ risk }, 201)
}

// Note: ownerId is required (set to user.id by default), so no null issue here

function clamp(v: any, min: number, max: number, def: number): number {
  const n = Number(v)
  if (isNaN(n)) return def
  return Math.max(min, Math.min(max, n))
}
