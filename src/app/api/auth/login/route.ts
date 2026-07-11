import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { supabase } from '@/lib/supabase'
import { toCamelCase } from '@/lib/db'
import { verifyPassword, createSession, setSessionCookie } from '@/lib/auth-server'
import { apiSuccess, apiError, logAudit, parseJson } from '@/lib/api-helpers'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) return apiError('Email et mot de passe requis', 400)

    // Use direct Supabase query for the join with organization
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        organizations!profiles_organization_id_fkey(id, name, slug, settings)
      `)
      .eq('email', String(email).toLowerCase().trim())
      .limit(1)
      .single()

    if (error || !data) return apiError('Identifiants invalides', 401)

    const profile = toCamelCase(data) as any
    if (!profile.active) return apiError('Identifiants invalides', 401)
    if (!await verifyPassword(password, profile.passwordHash)) return apiError('Identifiants invalides', 401)

    const token = await createSession(profile.id)
    await setSessionCookie(token)
    await logAudit(profile.organizationId, 'LOGIN', 'profiles', profile.id, profile.id, profile.email)

    // Parse org settings so they're available immediately (avoid timing issues)
    const orgSettings = parseJson(profile.organizations.settings, { setup_completed: true, active_modules: [], applicable_standards: [], industry_type: 'medical_device' })

    return apiSuccess({
      profile: {
        id: profile.id, email: profile.email, fullName: profile.fullName, role: profile.role,
        department: profile.department, jobTitle: profile.jobTitle, organizationId: profile.organizationId,
      },
      organization: {
        id: profile.organizations.id, name: profile.organizations.name, slug: profile.organizations.slug,
        settings: orgSettings,
      },
    })
  } catch (e: any) {
    return apiError(e.message || 'Erreur serveur', 500)
  }
}