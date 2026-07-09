import { NextResponse } from 'next/server'
import { getCurrentUser, type Role } from '@/lib/auth'
import { db } from '@/lib/db'

export async function requireUser(...allowedRoles: Role[]) {
  const user = await getCurrentUser()
  if (!user) {
    return { user: null, error: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }) }
  }
  if (allowedRoles.length > 0 && user.role !== 'SUPER_ADMIN' && !allowedRoles.includes(user.role)) {
    return { user: null, error: NextResponse.json({ error: 'Permissions insuffisantes' }, { status: 403 }) }
  }
  return { user, error: null }
}

export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status })
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export async function getOrgStandards(organizationId: string) {
  const items = await db.organizationStandard.findMany({
    where: { organizationId },
    include: { standard: true }
  })
  return items.map((i) => ({
    id: i.standard.id,
    code: i.standard.code,
    name: i.standard.name,
    version: i.standard.version,
    description: i.standard.description,
    certified: i.certified,
    certifiedAt: i.certifiedAt
  }))
}

export async function getAllStandards() {
  return db.standard.findMany({ orderBy: { code: 'asc' } })
}

export async function getOrgUsers(organizationId: string) {
  return db.user.findMany({
    where: { organizationId },
    select: { id: true, name: true, email: true, role: true, position: true, department: true, active: true, lastLoginAt: true, createdAt: true },
    orderBy: { name: 'asc' }
  })
}
