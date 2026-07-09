import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, ok, fail, getOrgStandards, getAllStandards } from '@/lib/api-helpers'

// GET /api/standards — Returns the organization's standards + all available standards
export async function GET(req: NextRequest) {
  const { user, error } = await requireUser()
  if (error || !user) return error
  const attached = await getOrgStandards(user.organizationId)
  const all = await getAllStandards()
  return ok({
    organizationStandards: attached,
    available: all
  })
}

// POST /api/standards — Attach a standard to the organization
// body: { standardId, certified?, certifiedAt? }
export async function POST(req: NextRequest) {
  const { user, error } = await requireUser('ADMIN')
  if (error || !user) return error
  const body = await req.json()
  const { standardId, certified, certifiedAt } = body
  if (!standardId) return fail('standardId requis')
  const std = await db.standard.findUnique({ where: { id: standardId } })
  if (!std) return fail('Norme introuvable', 404)

  const existing = await db.organizationStandard.findUnique({
    where: { organizationId_standardId: { organizationId: user.organizationId, standardId } }
  })
  if (existing) return fail('Norme déjà attachée', 409)

  await db.organizationStandard.create({
    data: {
      organizationId: user.organizationId,
      standardId,
      certified: !!certified,
      certifiedAt: certifiedAt ? new Date(certifiedAt) : null
    }
  })
  return ok({ ok: true }, 201)
}

// PUT /api/standards — Update certification status
// body: { standardId, certified, certifiedAt? }
export async function PUT(req: NextRequest) {
  const { user, error } = await requireUser('ADMIN')
  if (error || !user) return error
  const body = await req.json()
  const { standardId, certified, certifiedAt } = body
  if (!standardId) return fail('standardId requis')
  const updated = await db.organizationStandard.update({
    where: { organizationId_standardId: { organizationId: user.organizationId, standardId } },
    data: {
      certified: !!certified,
      certifiedAt: certifiedAt ? new Date(certifiedAt) : null
    }
  })
  return ok({ ok: true, organizationStandard: updated })
}

// DELETE /api/standards?standardId=...
export async function DELETE(req: NextRequest) {
  const { user, error } = await requireUser('ADMIN')
  if (error || !user) return error
  const { searchParams } = new URL(req.url)
  const standardId = searchParams.get('standardId')
  if (!standardId) return fail('standardId requis')
  await db.organizationStandard.deleteMany({
    where: { organizationId: user.organizationId, standardId }
  })
  return ok({ ok: true })
}
