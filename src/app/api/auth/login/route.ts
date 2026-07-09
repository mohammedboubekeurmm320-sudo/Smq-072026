import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, verifyPassword, createSession, setSessionCookie } from '@/lib/auth-server'
import { apiSuccess, apiError, logAudit } from '@/lib/api-helpers'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) return apiError('Email et mot de passe requis', 400)

    const profile = await db.profile.findUnique({
      where: { email: String(email).toLowerCase().trim() },
      include: { organization: true },
    })
    if (!profile || !profile.active) return apiError('Identifiants invalides', 401)
    if (!await verifyPassword(password, profile.passwordHash)) return apiError('Identifiants invalides', 401)

    const token = await createSession(profile.id)
    await setSessionCookie(token)
    await logAudit(profile.organizationId, 'LOGIN', 'profiles', profile.id, profile.id, profile.email)

    return apiSuccess({
      profile: {
        id: profile.id, email: profile.email, fullName: profile.fullName, role: profile.role,
        department: profile.department, jobTitle: profile.jobTitle, organizationId: profile.organizationId,
      },
      organization: {
        id: profile.organization.id, name: profile.organization.name, slug: profile.organization.slug,
      },
    })
  } catch (e: any) {
    return apiError(e.message || 'Erreur serveur', 500)
  }
}
