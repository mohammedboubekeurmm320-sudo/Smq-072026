// ============================================================
// GET / POST /api/forms/templates
// GET lists form templates (with field count, usage count)
// POST creates a new template
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server-with-context'
import { requireAuth, requirePermission } from '@/lib/auth-server'
import { randomUUID } from 'crypto'

function ok(data: any, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}
function err(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

/**
// GET /api/forms/templates
// List form templates with field count and usage count
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const { client } = await getAuthenticatedClient(request)
    if (!client) return err('Unauthorized', 401)

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status')

    let query = client
      .from('form_templates')
      .select('*', { count: 'exact' })
      .order('updated_at', { ascending: false })

    if (status) query = query.eq('status', status)

    const { data, count, error } = await query
      .range(offset, offset + limit - 1)

    if (error) return err(error.message)

    // Enrich with field count and usage count
    const templates = await Promise.all(
      (data || []).map(async (template: any) => {
        const fields = template.fields ? (typeof template.fields === 'string' ? JSON.parse(template.fields) : template.fields) : []
        const fieldCount = Array.isArray(fields) ? fields.length : 0

        // Count instances using this template
        const { count: usageCount } = await client
          .from('form_instances')
          .select('id', { count: 'exact', head: true })
          .eq('template_id', template.id)

        return {
          ...template,
          fieldCount,
          usageCount: usageCount ?? 0,
        }
      })
    )

    return ok({ items: templates, count: count ?? 0 })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return err('Non authentifié', 401)
    return err(e.message || 'Server error', 500)
  }
}

/**
// POST /api/forms/templates
// Create a new form template
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission('documents.create')
    const { client, profileId } = await getAuthenticatedClient(request)
    if (!client) return err('Unauthorized', 401)

    const body = await request.json()
    const { name, description, fields, workflow, compliance, status } = body as {
      name: string
      description?: string
      fields?: any[]
      workflow?: any
      compliance?: any
      status?: string
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return err('Template name is required')
    }

    if (!fields || !Array.isArray(fields) || fields.length === 0) {
      return err('At least one field definition is required')
    }

    // Validate field definitions
    for (const field of fields) {
      if (!field.name || !field.type) {
        return err('Each field must have a name and type')
      }
    }

    const insertData: Record<string, any> = {
      id: randomUUID(),
      title: name.trim(),
      description: description || null,
      version: '1.0',
      fieldsJson: JSON.stringify(fields),
      workflow_json: workflow ? JSON.stringify(workflow) : null,
      compliance_json: compliance ? JSON.stringify(compliance) : null,
      status: status || 'Draft',
      module_type: 'general',
      created_by_id: profileId,
      organization_id: session.profile.organizationId,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await client
      .from('form_templates')
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