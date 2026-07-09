import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, ok, fail } from '@/lib/api-helpers'

// GET /api/organizations — Returns current org info
export async function GET() {
  const { user, error } = await requireUser()
  if (error || !user) return error
  const org = await db.organization.findUnique({
    where: { id: user.organizationId },
    include: {
      _count: { select: { users: true, documents: true, nonconformities: true, capas: true, audits: true, suppliers: true, processes: true, risks: true } }
    }
  })
  return ok({ organization: org })
}

// PUT /api/organizations — Update org info
export async function PUT(req: NextRequest) {
  const { user, error } = await requireUser('ADMIN')
  if (error || !user) return error
  const body = await req.json()
  const { name, address, city, country, type, contactEmail, contactPhone } = body
  const updated = await db.organization.update({
    where: { id: user.organizationId },
    data: {
      ...(name !== undefined && { name }),
      ...(address !== undefined && { address }),
      ...(city !== undefined && { city }),
      ...(country !== undefined && { country }),
      ...(type !== undefined && { type }),
      ...(contactEmail !== undefined && { contactEmail }),
      ...(contactPhone !== undefined && { contactPhone })
    }
  })
  return ok({ organization: updated })
}
