import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, ok, fail } from '@/lib/api-helpers'

// GET /api/documents?status=&category=
export async function GET(req: NextRequest) {
  const { user, error } = await requireUser()
  if (error || !user) return error

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const category = searchParams.get('category')
  const search = searchParams.get('q')

  const where: any = { organizationId: user.organizationId }
  if (status) where.status = status
  if (category) where.category = category
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { code: { contains: search } },
      { summary: { contains: search } }
    ]
  }

  const documents = await db.document.findMany({
    where,
    include: {
      owner: { select: { id: true, name: true } },
      reviewer: { select: { id: true, name: true } },
      approver: { select: { id: true, name: true } }
    },
    orderBy: { updatedAt: 'desc' }
  })
  return ok({ documents })
}

// POST /api/documents
export async function POST(req: NextRequest) {
  const { user, error } = await requireUser('ADMIN', 'QUALITY_MANAGER', 'ENGINEER')
  if (error || !user) return error

  const body = await req.json()
  const { code, title, version, category, summary, content, ownerId, reviewerId, approverId, effectiveDate, nextReviewDate } = body
  if (!code || !title) return fail('Code et titre requis')

  const exists = await db.document.findUnique({ where: { organizationId_code: { organizationId: user.organizationId, code } } })
  if (exists) return fail('Code document déjà utilisé', 409)

  const doc = await db.document.create({
    data: {
      organizationId: user.organizationId,
      code, title,
      version: version || '1.0',
      status: 'DRAFT',
      category: category || 'procedure',
      summary, content,
      ownerId: ownerId || user.id,
      reviewerId: reviewerId || null,
      approverId: approverId || null,
      effectiveDate: effectiveDate ? new Date(effectiveDate) : null,
      nextReviewDate: nextReviewDate ? new Date(nextReviewDate) : null
    }
  })
  return ok({ document: doc }, 201)
}
