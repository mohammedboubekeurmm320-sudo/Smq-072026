import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, ok, fail } from '@/lib/api-helpers'
import { hashPassword, type Role, ALL_ROLES } from '@/lib/auth'

type Ctx = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: Ctx) {
  const { user, error } = await requireUser('ADMIN')
  if (error || !user) return error
  const { id } = await params
  const body = await req.json()
  const existing = await db.user.findFirst({ where: { id, organizationId: user.organizationId } })
  if (!existing) return fail('Utilisateur introuvable', 404)

  const { name, email, role, position, department, active, password } = body
  // Prevent self-deactivation
  if (active === false && id === user.id) return fail('Vous ne pouvez pas désactiver votre propre compte', 400)
  // Prevent demoting self
  if (role && role !== 'ADMIN' && id === user.id && user.role === 'ADMIN') return fail('Vous ne pouvez pas rétrograder votre propre compte', 400)

  const data: any = {}
  if (name !== undefined) data.name = name
  if (email !== undefined) {
    const dup = await db.user.findUnique({ where: { email: String(email).toLowerCase().trim() } })
    if (dup && dup.id !== id) return fail('Email déjà utilisé', 409)
    data.email = String(email).toLowerCase().trim()
  }
  if (role !== undefined && ALL_ROLES.includes(role as Role)) data.role = role
  if (position !== undefined) data.position = position
  if (department !== undefined) data.department = department
  if (active !== undefined) data.active = active
  if (password) data.passwordHash = await hashPassword(password)

  const updated = await db.user.update({
    where: { id },
    data,
    select: { id: true, email: true, name: true, role: true, position: true, department: true, active: true }
  })
  return ok({ user: updated })
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { user, error } = await requireUser('ADMIN')
  if (error || !user) return error
  const { id } = await params
  if (id === user.id) return fail('Vous ne pouvez pas supprimer votre propre compte', 400)
  const existing = await db.user.findFirst({ where: { id, organizationId: user.organizationId } })
  if (!existing) return fail('Utilisateur introuvable', 404)
  await db.user.delete({ where: { id } })
  return ok({ ok: true })
}
