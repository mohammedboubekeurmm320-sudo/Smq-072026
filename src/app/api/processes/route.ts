import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, ok, fail } from '@/lib/api-helpers'

export async function GET(req: NextRequest) {
  const { user, error } = await requireUser()
  if (error || !user) return error
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const where: any = { organizationId: user.organizationId }
  if (type) where.type = type
  const processes = await db.process.findMany({
    where,
    include: { owner: { select: { id: true, name: true } } },
    orderBy: { name: 'asc' }
  })
  return ok({ processes })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser('ADMIN', 'QUALITY_MANAGER')
  if (error || !user) return error
  const body = await req.json()
  const { name, description, type, ownerId, inputs, outputs, kpi, status } = body
  if (!name) return fail('Nom requis')
  const process = await db.process.create({
    data: {
      organizationId: user.organizationId,
      name, description, type: type || 'core',
      ownerId: ownerId || user.id,
      inputs, outputs, kpi,
      status: status || 'active'
    }
  })
  return ok({ process }, 201)
}
