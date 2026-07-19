// ============================================================
// GET / POST /api/forms/instances
// GET lists form instances
// POST creates new instance (with validation against template)
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
// GET /api/forms/instances
// List form instances with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const { client } = await getAuthenticatedClient(request)
    if (!client) return err('Unauthorized', 401)

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const templateId = searchParams.get('templateId')
    const status = searchParams.get('status')

    let query = client
      .from('form_instances')
      .select('*, form_template:form_templates(id, name, fields)', { count: 'exact' })
      .order('updated_at', { ascending: false })

    if (templateId) query = query.eq('template_id', templateId)
    if (status) query = query.eq('status', status)

    const { data, count, error } = await query
      .range(offset, offset + limit - 1)

    if (error) return err(error.message)
    return ok({ items: data, count: count ?? 0 })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return err('Non authentifié', 401)
    return err(e.message || 'Server error', 500)
  }
}

/**
// POST /api/forms/instances
// Create a new form instance, validating against the template
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const { client, profileId } = await getAuthenticatedClient(request)
    if (!client) return err('Unauthorized', 401)

    const body = await request.json()
    const { templateId, data: formData, status } = body as {
      templateId: string
      data: Record<string, any>
      status?: string
    }

    if (!templateId) return err('templateId is required')
    if (!formData || typeof formData !== 'object') return err('Form data is required')

    // Fetch template for validation
    const { data: template, error: templateError } = await client
      .from('form_templates')
      .select('*')
      .eq('id', templateId)
      .single()

    if (templateError || !template) return err('Template not found', 404)

    // Parse template fields
    const fields = template.fields
      ? (typeof template.fields === 'string' ? JSON.parse(template.fields) : template.fields)
      : []

    // Validate required fields
    const validationErrors: string[] = []
    for (const field of fields) {
      if (field.required && (!formData[field.name] || formData[field.name].toString().trim() === '')) {
        validationErrors.push(`Field '${field.label || field.name}' is required`)
      }
    }

    if (validationErrors.length > 0) {
      return err(`Validation failed: ${validationErrors.join('; ')}`, 422)
    }

    const insertData: Record<string, any> = {
      template_id: templateId,
      data: JSON.stringify(formData),
      status: status || 'Draft',
      submitted_by: profileId,
      organization_id: session.profile.organizationId,
    }

    const { data, error } = await client
      .from('form_instances')
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