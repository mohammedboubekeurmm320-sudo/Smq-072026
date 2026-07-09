import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, ok, fail } from '@/lib/api-helpers'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { user, error } = await requireUser()
  if (error || !user) return error
  const { id } = await params
  const doc = await db.document.findFirst({
    where: { id, organizationId: user.organizationId },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      reviewer: { select: { id: true, name: true, email: true } },
      approver: { select: { id: true, name: true, email: true } }
    }
  })
  if (!doc) return fail('Document introuvable', 404)
  return ok({ document: doc })
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const { user, error } = await requireUser('ADMIN', 'QUALITY_MANAGER', 'ENGINEER')
  if (error || !user) return error
  const { id } = await params
  const body = await req.json()
  const existing = await db.document.findFirst({ where: { id, organizationId: user.organizationId } })
  if (!existing) return fail('Document introuvable', 404)

  const { title, version, status, category, summary, content, ownerId, reviewerId, approverId, effectiveDate, nextReviewDate } = body
  const updated = await db.document.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(version !== undefined && { version }),
      ...(status !== undefined && { status }),
      ...(category !== undefined && { category }),
      ...(summary !== undefined && { summary }),
      ...(content !== undefined && { content }),
      ...(ownerId !== undefined && { ownerId: ownerId || null }),
      ...(reviewerId !== undefined && { reviewerId: reviewerId || null }),
      ...(approverId !== undefined && { approverId: approverId || null }),
      ...(effectiveDate !== undefined && { effectiveDate: effectiveDate ? new Date(effectiveDate) : null }),
      ...(nextReviewDate !== undefined && { nextReviewDate: nextReviewDate ? new Date(nextReviewDate) : null })
    }
  })
  return ok({ document: updated })
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { user, error } = await requireUser('ADMIN', 'QUALITY_MANAGER')
  if (error || !user) return error
  const { id } = await params
  const existing = await db.document.findFirst({ where: { id, organizationId: user.organizationId } })
  if (!existing) return fail('Document introuvable', 404)
  await db.document.delete({ where: { id } })
  return ok({ ok: true })
}
