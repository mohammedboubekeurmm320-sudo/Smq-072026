// ============================================================
// GET / PUT /api/admin/settings
// GET and PUT organization settings. Admin only.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server-with-context'
import { requirePermission } from '@/lib/auth-server'
import type { OrgSettings, ModuleKey } from '@/types/qms'

function ok(data: any, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}
function err(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

const ALL_MODULES: ModuleKey[] = [
  'documents', 'capa', 'ncr', 'audits', 'training', 'reports', 'compliance',
  'risks', 'hierarchy', 'batch_records', 'suppliers', 'forms', 'change_control',
  'deviations', 'oos_oot',
]

/**
// GET /api/admin/settings
// Retrieve organization settings. Admin only.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requirePermission('admin.settings')

    const { client } = await getAuthenticatedClient(request)
    if (!client) return err('Unauthorized', 401)

    const { data: org, error } = await client
      .from('organizations')
      .select('id, name, slug, settings, industry_type, logo_url, address, phone, website, created_at')
      .eq('id', session.profile.organizationId)
      .single()

    if (error || !org) return err('Organization not found', 404)

    // Parse settings JSON
    let settings: OrgSettings | null = null
    if (org.settings) {
      try {
        settings = typeof org.settings === 'string' ? JSON.parse(org.settings) : org.settings
      } catch {
        settings = null
      }
    }

    return ok({
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        industry_type: org.industry_type,
        logo_url: org.logo_url,
        address: org.address,
        phone: org.phone,
        website: org.website,
        created_at: org.created_at,
      },
      settings,
      availableModules: ALL_MODULES,
    })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return err('Non authentifié', 401)
    if (e.message === 'Permissions insuffisantes') return err('Permissions insuffisantes', 403)
    return err(e.message || 'Server error', 500)
  }
}

/**
// PUT /api/admin/settings
// Update organization settings. Admin only.
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await requirePermission('admin.settings')

    const body = await request.json()
    if (!body || typeof body !== 'object') return err('Body requis')

    // Parse and validate settings
    const { settings } = body as { settings: Partial<OrgSettings> }

    if (!settings) return err('settings object is required')

    // Validate active_modules if provided
    if (settings.active_modules && Array.isArray(settings.active_modules)) {
      const invalid = settings.active_modules.filter((m: string) => !ALL_MODULES.includes(m as ModuleKey))
      if (invalid.length > 0) {
        return err(`Invalid modules: ${invalid.join(', ')}`)
      }
    }

    // Fetch current settings to merge
    const { client } = await getAuthenticatedClient(request)
    if (!client) return err('Unauthorized', 401)

    const { data: currentOrg } = await client
      .from('organizations')
      .select('settings')
      .eq('id', session.profile.organizationId)
      .single()

    let currentSettings: Record<string, any> = {}
    if (currentOrg?.settings) {
      try {
        currentSettings = typeof currentOrg.settings === 'string'
          ? JSON.parse(currentOrg.settings)
          : currentOrg.settings
      } catch {
        currentSettings = {}
      }
    }

    // Deep merge settings
    const mergedSettings = {
      ...currentSettings,
      ...settings,
    }

    // Also update org-level fields from body
    const orgUpdate: Record<string, any> = {
      settings: JSON.stringify(mergedSettings),
    }

    // Handle organization-level fields
    const orgFields = ['name', 'slug', 'logo_url', 'address', 'phone', 'website', 'industry_type']
    for (const key of orgFields) {
      if (body[key] !== undefined) {
        orgUpdate[key] = body[key]
      }
    }

    const { data, error } = await client
      .from('organizations')
      .update(orgUpdate)
      .eq('id', session.profile.organizationId)
      .select()
      .single()

    if (error) return err(error.message)

    return ok({
      organization: data,
      settings: mergedSettings,
    })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return err('Non authentifié', 401)
    if (e.message === 'Permissions insuffisantes') return err('Permissions insuffisantes', 403)
    return err(e.message || 'Server error', 500)
  }
}