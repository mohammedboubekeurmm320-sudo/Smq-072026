import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, ok, fail } from '@/lib/api-helpers'

export async function GET(req: NextRequest) {
  const { user, error } = await requireUser()
  if (error || !user) return error
  const { searchParams } = new URL(req.url)
  const evaluation = searchParams.get('evaluation')
  const where: any = { organizationId: user.organizationId }
  if (evaluation) where.evaluation = evaluation
  const suppliers = await db.supplier.findMany({ where, orderBy: { name: 'asc' } })
  return ok({ suppliers })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser('ADMIN', 'QUALITY_MANAGER')
  if (error || !user) return error
  const body = await req.json()
  const { name, contactName, email, phone, category, evaluation, evaluationDate, riskLevel, notes } = body
  if (!name) return fail('Nom requis')
  const supplier = await db.supplier.create({
    data: {
      organizationId: user.organizationId,
      name, contactName, email, phone, category,
      evaluation: evaluation || 'PENDING',
      evaluationDate: evaluationDate ? new Date(evaluationDate) : null,
      riskLevel: riskLevel || 'medium',
      notes
    }
  })
  return ok({ supplier }, 201)
}
