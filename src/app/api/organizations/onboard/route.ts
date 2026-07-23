// ============================================================
// POST /api/organizations/onboard
// Complete onboarding after signup
// Accepts {industry, standards, modules, teamMembers}
// Updates org settings and creates team member invites
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server-with-context'
import { getServerSession, requireAuth, hashPassword } from '@/lib/auth-server'
import type { IndustryType, ModuleKey } from '@/types/qms'
import { adminClient } from '@/lib/supabase/server-with-context'
import { randomUUID } from 'crypto'

function ok(data: any, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}
function err(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

const VALID_INDUSTRIES: IndustryType[] = [
  'medical_device', 'pharmaceutical', 'biotech', 'ivd', 'combination_product',
]

const ALL_MODULES: ModuleKey[] = [
  'documents', 'capa', 'ncr', 'audits', 'training', 'reports', 'compliance',
  'risks', 'hierarchy', 'batch_records', 'suppliers', 'forms', 'change_control',
  'deviations', 'oos_oot',
]

/**
 * POST /api/organizations/onboard
 * Complete org onboarding: set industry, standards, modules, invite team members
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()

    const body = await request.json()
    const { industry, standards, modules, teamMembers } = body as {
      industry?: IndustryType
      standards?: string[]
      modules?: string[]
      teamMembers?: { email: string; full_name: string; role: string }[]
    }

    if (!industry || !VALID_INDUSTRIES.includes(industry)) {
      return err('Valid industry type is required')
    }

    const validModules = (modules || []).filter((m: string) =>
      ALL_MODULES.includes(m as ModuleKey)
    )

    const settings = {
      setup_completed: true,
      industry_type: industry,
      applicable_standards: standards || [],
      active_modules: validModules.length > 0 ? validModules : ['documents', 'capa', 'ncr', 'audits', 'training', 'reports', 'compliance'],
    }

    // Update organization settings using admin client to bypass RLS for settings update
    const { error: orgError } = await adminClient
      .from('organizations')
      .update({
        settings: JSON.stringify(settings),
      })
      .eq('id', session.profile.organizationId)

    if (orgError) return err(orgError.message)

    // Create team member invites
    const invitedMembers: any[] = []

    if (teamMembers && Array.isArray(teamMembers) && teamMembers.length > 0) {
      const validRoles = ['admin', 'quality_manager', 'auditor', 'document_controller', 'executive', 'operator']

      for (const member of teamMembers) {
        if (!member.email || !member.full_name) continue

        const role = validRoles.includes(member.role) ? member.role : 'operator'

        // Create a pending profile with a random password (they'll reset on first login)
        const tempPassword = Math.random().toString(36).slice(-16)
        const passwordHash = await hashPassword(tempPassword)

        const { data: profile, error: profError } = await adminClient
          .from('profiles')
          .insert({
            id: randomUUID(),
            email: member.email.toLowerCase().trim(),
            full_name: member.full_name,
            password_hash: passwordHash,
            role: role,
            organization_id: session.profile.organizationId,
            active: false, // Must be activated
            updated_at: new Date().toISOString(),
          })
          .select('id, email, full_name, role')
          .single()

        if (!profError && profile) {
          // Create organization membership
          await adminClient
            .from('organization_members')
            .insert({
              id: randomUUID(),
              organization_id: session.profile.organizationId,
              user_id: profile.id,
              role: role,
              status: 'pending',
              updated_at: new Date().toISOString(),
            })

          invitedMembers.push(profile)
        }
      }
    }

    return ok({
      organizationId: session.profile.organizationId,
      settings,
      invitedMembers,
    })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return err('Non authentifié', 401)
    return err(e.message || 'Server error', 500)
  }
}