import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, ok, fail, getOrgUsers } from '@/lib/api-helpers'
import { hashPassword } from '@/lib/auth'
import { ROLE_LABELS, ALL_ROLES, type Role } from '@/lib/auth'

export async function GET() {
  const { user, error } = await requireUser('ADMIN')
  if (error || !user) return error
  const users = await getOrgUsers(user.organizationId)
  return ok({ users, roles: ALL_ROLES.map(r => ({ value: r, label: ROLE_LABELS[r] })) })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser('ADMIN')
  if (error || !user) return error
  const body = await req.json()
  const { email, name, password, role, position, department } = body
  if (!email || !name || !password) return fail('Email, nom et mot de passe requis')
  const existing = await db.user.findUnique({ where: { email: String(email).toLowerCase().trim() } })
  if (existing) return fail('Email déjà utilisé', 409)
  const validRoles: Role[] = ['ADMIN', 'QUALITY_MANAGER', 'ENGINEER', 'AUDITOR', 'VIEWER']
  const finalRole = validRoles.includes(role) ? role : 'VIEWER'
  const newUser = await db.user.create({
    data: {
      email: String(email).toLowerCase().trim(),
      name, passwordHash: await hashPassword(password),
      role: finalRole, position, department,
      organizationId: user.organizationId
    },
    select: { id: true, email: true, name: true, role: true, position: true, department: true, active: true, createdAt: true }
  })
  return ok({ user: newUser }, 201)
}
