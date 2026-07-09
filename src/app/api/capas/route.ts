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
  const capas = await db.cAPA.findMany({
    where,
    include: {
      owner: { select: { id: true, name: true } },
      nonconformity: { select: { id: true, reference: true, title: true } }
    },
    orderBy: { createdAt: 'desc' }
  })
  return ok({ capas })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser('ADMIN', 'QUALITY_MANAGER', 'ENGINEER')
  if (error || !user) return error
  const body = await req.json()
  const { reference, type, title, description, rootCause, action, dueDate, completedDate, status, ownerId, nonconformityId } = body
  if (!title) return fail('Titre requis')

  let ref = reference
  if (!ref) {
    const count = await db.cAPA.count({ where: { organizationId: user.organizationId } })
    ref = `CAPA-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`
  }
  const capa = await db.cAPA.create({
    data: {
      organizationId: user.organizationId,
      reference: ref, type: type || 'CORRECTIVE', title, description,
      rootCause, action,
      dueDate: dueDate ? new Date(dueDate) : null,
      completedDate: completedDate ? new Date(completedDate) : null,
      status: status || 'OPEN',
      ownerId: ownerId || user.id,
      nonconformityId: nonconformityId || null
    }
  })
  return ok({ capa }, 201)
}
// nonconformityId already converted to null above
