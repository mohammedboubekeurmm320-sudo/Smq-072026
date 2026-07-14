// ============================================================
// Service CRUD générique pour toutes les entités QMS
// Utilise getAuthenticatedClient pour RLS automatique
// ============================================================

import { getAuthenticatedClient } from '@/lib/supabase/server-with-context'
import type { Request } from 'next/server'

export type CrudEntity =
  | 'documents' | 'electronic_signatures' | 'document_prerequisites'
  | 'form_templates' | 'form_instances'
  | 'capas' | 'non_conformances' | 'deviations' | 'change_controls'
  | 'audits' | 'training' | 'risks' | 'suppliers' | 'batch_records'
  | 'departments' | 'record_type_definitions' | 'record_links'
  | 'document_triggers' | 'document_relationships' | 'document_code_sequences'
  | 'scheduled_reports' | 'notifications'

interface CrudOptions {
  entity: CrudEntity
  select?: string
  filters?: Record<string, string>
  orderBy?: string
  orderAsc?: boolean
  limit?: number
  offset?: number
}

export async function getAll<T = any>(request: Request, options: CrudOptions) {
  const { client, error } = await getAuthenticatedClient(request)
  if (error || !client) return { data: null, error, count: 0 }

  let query = client.from(options.entity).select(
    options.select || '*',
    { count: 'exact' }
  )

  // Appliquer les filtres
  if (options.filters) {
    for (const [key, value] of Object.entries(options.filters)) {
      if (value.includes(',')) {
        query = query.in(key, value.split(','))
      } else if (value.startsWith('ilike:')) {
        query = query.ilike(key, `%${value.slice(6)}%`)
      } else {
        query = query.eq(key, value)
      }
    }
  }

  // Tri
  if (options.orderBy) {
    query = query.order(options.orderBy, { ascending: options.orderAsc ?? false })
  }

  // Pagination
  if (options.limit) query = query.limit(options.limit)
  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
  }

  const { data, error: qError, count } = await query
  return { data: data as T[], error: qError?.message, count: count || 0 }
}

export async function getById<T = any>(request: Request, entity: CrudEntity, id: string, select?: string) {
  const { client, error } = await getAuthenticatedClient(request)
  if (error || !client) return { data: null, error }

  const { data, error: qError } = await client
    .from(entity)
    .select(select || '*')
    .eq('id', id)
    .single()

  return { data: data as T, error: qError?.message }
}

export async function create<T = any>(request: Request, entity: CrudEntity, body: Record<string, any>) {
  const { client, profileId, error } = await getAuthenticatedClient(request)
  if (error || !client) return { data: null, error }

  // Injecter l'organization_id depuis le cookie si non fourni
  if (!body.organization_id) {
    const orgId = request.headers.get('x-org-id')
    if (orgId) body.organization_id = orgId
  }

  // Injecter created_by si la table a cette colonne
  const tablesWithCreator = [
    'documents', 'form_templates', 'form_instances',
    'capas', 'non_conformances', 'deviations', 'change_controls',
    'audits', 'training', 'risks', 'suppliers', 'batch_records',
    'scheduled_reports',
  ]
  if (tablesWithCreator.includes(entity) && profileId) {
    body.created_by = profileId
  }

  const { data, error: qError } = await client
    .from(entity)
    .insert(body)
    .select()
    .single()

  return { data: data as T, error: qError?.message }
}

export async function update<T = any>(
  request: Request,
  entity: CrudEntity,
  id: string,
  body: Record<string, any>
) {
  const { client, error } = await getAuthenticatedClient(request)
  if (error || !client) return { data: null, error }

  const { data, error: qError } = await client
    .from(entity)
    .update(body)
    .eq('id', id)
    .select()
    .single()

  return { data: data as T, error: qError?.message }
}

export async function softDelete(request: Request, entity: CrudEntity, id: string) {
  return update(request, entity, id, { status: 'Archived' } as any)
}

export async function remove(request: Request, entity: CrudEntity, id: string) {
  const { client, error } = await getAuthenticatedClient(request)
  if (error || !client) return { data: null, error }

  const { error: qError } = await client
    .from(entity)
    .delete()
    .eq('id', id)

  return { error: qError?.message }
}

// Dashboard KPI
export async function getDashboardKPIs(request: Request) {
  const { client, error } = await getAuthenticatedClient(request)
  if (error || !client) return { data: null, error }

  const { data, error: qError } = await client
    .from('v_org_dashboard')
    .select('*')
    .limit(1)
    .single()

  return { data, error: qError?.message }
}

// Échéances imminentes
export async function getDeadlines(request: Request, daysAhead = 7) {
  const { client, error } = await getAuthenticatedClient(request)
  if (error || !client) return { data: null, error }

  const orgId = request.headers.get('x-org-id')
  if (!orgId) return { data: [], error: 'No organization selected' }

  const { data, error: qError } = await client.rpc('get_upcoming_deadlines', {
    p_org_id: orgId,
    p_days_ahead: daysAhead,
  })

  return { data: data || [], error: qError?.message }
}

// Audit trail
export async function getAuditTrail(
  request: Request,
  options: { entityType?: string; recordId?: string; limit?: number }
) {
  const { client, error } = await getAuthenticatedClient(request)
  if (error || !client) return { data: null, error }

  let query = client
    .from('audit_trails')
    .select('*')
    .order('created_at', { ascending: false })

  if (options.entityType) query = query.eq('table_name', options.entityType)
  if (options.recordId) query = query.eq('record_id', options.recordId)
  if (options.limit) query = query.limit(options.limit)

  const { data, error: qError } = await query
  return { data, error: qError?.message }
}

// Validation transition statut
export async function validateTransition(
  request: Request,
  recordTypeSlug: string,
  currentStatus: string,
  newStatus: string,
  organizationId: string
) {
  const { client, error } = await getAuthenticatedClient(request)
  if (error || !client) return { valid: false, error }

  const { data, error: qError } = await client.rpc('validate_status_transition', {
    p_record_type_slug: recordTypeSlug,
    p_current_status: currentStatus,
    p_new_status: newStatus,
    p_organization_id: organizationId,
  })

  return { valid: !!data, error: qError?.message }
}