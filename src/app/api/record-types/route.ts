// ============================================================
// GET / POST /api/record-types
// GET lists record type definitions
// POST creates a new custom record type
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

/**
// GET /api/record-types?isSystem=false
// List record type definitions for the organization
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const { client } = await getAuthenticatedClient(request)
    if (!client) return err('Unauthorized', 401)

    const { searchParams } = new URL(request.url)
    const isSystem = searchParams.get('isSystem')

    let query = client
      .from('record_type_definitions')
      .select('*')
      .order('slug', { ascending: true })

    if (isSystem !== null) {
      query = query.eq('is_system', isSystem === 'true')
    }

    const { data, error } = await query

    if (error) return err(error.message)
    return ok({ items: data })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return err('Non authentifié', 401)
    return err(e.message || 'Server error', 500)
  }
}

/**
// POST /api/record-types
// Create a new custom record type definition
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission('recordtypes.create')
    const { client, profileId } = await getAuthenticatedClient(request)
    if (!client) return err('Unauthorized', 401)

    const body = await request.json()
    const { name, slug, description, table_name, fields, statusFlow } = body as {
      name: string
      slug: string
      description?: string
      table_name?: string
      fields?: any[]
      statusFlow?: any
    }

    if (!name || typeof name !== 'string') return err('name is required')
    if (!slug || typeof slug !== 'string') return err('slug is required')

    // Check slug uniqueness
    const { data: existing } = await client
      .from('record_type_definitions')
      .select('id')
      .eq('slug', slug)
      .eq('organization_id', session.profile.organizationId)
      .limit(1)

    if (existing && existing.length > 0) {
      return err('A record type with this slug already exists', 409)
    }

    const insertData: Record<string, any> = {
      name,
      slug: slug.toLowerCase().replace(/[^a-z0-9_-]/g, '_'),
      description: description || null,
      table_name: table_name || `records_${slug}`,
      is_system: false,
      fields: fields ? JSON.stringify(fields) : null,
      status_flow: statusFlow ? JSON.stringify(statusFlow) : null,
      organization_id: session.profile.organizationId,
      created_by: profileId,
    }

    const { data, error } = await client
      .from('record_type_definitions')
      .insert(insertData)
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