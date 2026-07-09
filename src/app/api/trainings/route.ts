import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, ok, fail } from '@/lib/api-helpers'

export async function GET(req: NextRequest) {
  const { user, error } = await requireUser()
  if (error || !user) return error
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const userId = searchParams.get('userId')
  const where: any = { organizationId: user.organizationId }
  if (status) where.status = status
  if (userId) where.userId = userId
  const trainings = await db.training.findMany({
    where,
    include: { user: { select: { id: true, name: true, position: true, department: true } } },
    orderBy: { createdAt: 'desc' }
  })
  return ok({ trainings })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser('ADMIN', 'QUALITY_MANAGER')
  if (error || !user) return error
  const body = await req.json()
  const { userId, name, description, category, conductedDate, completedDate, status, score } = body
  if (!userId || !name) return fail('Utilisateur et nom requis')
  const training = await db.training.create({
    data: {
      organizationId: user.organizationId,
      userId, name, description,
      category: category || 'quality',
      conductedDate: conductedDate ? new Date(conductedDate) : null,
      completedDate: completedDate ? new Date(completedDate) : null,
      status: status || 'PLANNED',
      score: score || null
    }
  })
  return ok({ training }, 201)
}
