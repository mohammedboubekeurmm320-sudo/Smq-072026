// ============================================================
// GET / POST /api/custom-fields
// GET lists custom field definitions for the org
// POST creates a new custom field definition
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server-with-context'
import { requireAuth, requirePermission } from '@/lib/auth-server'

function ok(data: any, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}
function err(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

const VALID_FIELD_TYPES = [
  'text', 'number', 'date', 'select', 'checkbox', 'textarea', 'signature', 'table', 'rating', 'file', 'repeater',
]

/**
// GET /api/custom-fields?entityType=&scope=
// List custom field definitions for the organization
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const { client } = await getAuthenticatedClient(request)
    if (!client) return err('Unauthorized', 401)

    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get('entityType')
    const scope = searchParams.get('scope')

    // Custom fields stored in record_type_definitions or a dedicated table
    // We use a generic approach querying record_type_definitions with custom fields
    let query = client
      .from('record_type_definitions')
      .select('*')
      .eq('is_system', false)
      .order('name', { ascending: true })

    if (entityType) query = query.eq('table_name', entityType)
    if (scope) query = query.eq('slug', scope)

    const { data, error } = await query

    if (error) return err(error.message)
    return ok({ items: data })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return err('Non authentifié', 401)
    return err(e.message || 'Server error', 500)
  }
}

/**
// POST /api/custom-fields
// Create a new custom field definition
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission('recordtypes.create')
    const { client, profileId } = await getAuthenticatedClient(request)
    if (!client) return err('Unauthorized', 401)

    const body = await request.json()
    const { name, entityType, fieldType, required, options, defaultValue, helpText, scope } = body as {
      name: string
      entityType: string
      fieldType: string
      required?: boolean
      options?: string[]
      defaultValue?: string
      helpText?: string
      scope?: string
    }

    if (!name || typeof name !== 'string') return err('name is required')
    if (!entityType || typeof entityType !== 'string') return err('entityType is required')
    if (!fieldType || !VALID_FIELD_TYPES.includes(fieldType)) {
      return err(`fieldType must be one of: ${VALID_FIELD_TYPES.join(', ')}`)
    }

    const slug = scope
      ? `${scope}.${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
      : name.toLowerCase().replace(/[^a-z0-9]/g, '_')

    const fieldDef = {
      name,
      type: fieldType,
      required: !!required,
      options: options || null,
      defaultValue: defaultValue || null,
      helpText: helpText || null,
    }

    // Check for duplicates
    const { data: existing } = await client
      .from('record_type_definitions')
      .select('id')
      .eq('slug', slug)
      .eq('organization_id', session.profile.organizationId)
      .limit(1)

    if (existing && existing.length > 0) {
      return err('A custom field with this name/scope already exists', 409)
    }

    const { data, error } = await client
      .from('record_type_definitions')
      .insert({
        name: `Custom: ${name}`,
        slug,
        description: helpText || null,
        table_name: entityType,
        is_system: false,
        fields: JSON.stringify([fieldDef]),
        organization_id: request.headers.get('x-org-id') || session.profile.organizationId,
        created_by: profileId,
      })
      .select()
      .single()

    if (error) return err(error.message)
    return ok(data, 201)
  } catch (e: any) {
    if (e.message === 'Non authentifié') return err('Non authentifié', 401)
    if (e.message === 'Permissions insuffisantes') return err('Permissions insuffisantes', 403)
    return err(e.message || 'Server error', 500)
  }
}