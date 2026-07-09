import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession, hasPermission, hashPassword } from '@/lib/auth-server'
import { apiSuccess, apiError, logAudit } from '@/lib/api-helpers'

export async function GET() {
  try {
    const session = await getServerSession()
    if (!session) return apiError('Non authentifié', 401)
    const profiles = await db.profile.findMany({
      where: { organizationId: session.profile.organizationId },
      select: { id: true, email: true, fullName: true, role: true, department: true, jobTitle: true, phone: true, active: true, lastLoginAt: true, createdAt: true },
      orderBy: { fullName: 'asc' },
    })
    return apiSuccess({ profiles })
  } catch (e: any) { return apiError(e.message, 500) }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session || !hasPermission(session.profile.role, 'admin.users' as any)) return apiError('Permissions insuffisantes', 403)
    const { email, fullName, password, role, department, jobTitle } = await req.json()
    if (!email || !fullName || !password) return apiError('Email, nom et mot de passe requis', 400)

    const existing = await db.profile.findUnique({ where: { email: String(email).toLowerCase().trim() } })
    if (existing) return apiError('Email déjà utilisé', 409)

    const validRoles = ['admin', 'quality_manager', 'auditor', 'document_controller', 'executive', 'operator']
    const finalRole = validRoles.includes(role) ? role : 'operator'

    const profile = await db.profile.create({
      data: {
        email: String(email).toLowerCase().trim(), fullName,
        passwordHash: await hashPassword(password), role: finalRole,
        department, jobTitle, organizationId: session.profile.organizationId,
      },
      select: { id: true, email: true, fullName: true, role: true, department: true, jobTitle: true, active: true },
    })
    await logAudit(session.profile.organizationId, 'CREATE', 'profiles', profile.id, session.profile.id, session.profile.email, undefined, profile)
    return apiSuccess({ profile }, 201)
  } catch (e: any) { return apiError(e.message, 500) }
}
