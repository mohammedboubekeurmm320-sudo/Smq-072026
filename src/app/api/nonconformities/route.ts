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
  const ncs = await db.nonconformity.findMany({
    where,
    include: {
      owner: { select: { id: true, name: true } },
      capas: { select: { id: true, reference: true, title: true, status: true } }
    },
    orderBy: { detectedDate: 'desc' }
  })
  return ok({ nonconformities: ncs })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser('ADMIN', 'QUALITY_MANAGER', 'ENGINEER', 'AUDITOR')
  if (error || !user) return error
  const body = await req.json()
  const { reference, title, description, source, severity, status, ownerId, detectedDate } = body
  if (!title) return fail('Titre requis')

  // Generate reference if not provided
  let ref = reference
  if (!ref) {
    const count = await db.nonconformity.count({ where: { organizationId: user.organizationId } })
    ref = `NC-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`
  }
  const nc = await db.nonconformity.create({
    data: {
      organizationId: user.organizationId,
      reference: ref, title, description,
      source: source || 'process',
      severity: severity || 'minor',
      status: status || 'OPEN',
      ownerId: ownerId || user.id,
      detectedDate: detectedDate ? new Date(detectedDate) : new Date()
    }
  })
  return ok({ nonconformity: nc }, 201)
}
