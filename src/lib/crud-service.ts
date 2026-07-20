// ============================================================
// Service CRUD générique — filtre organization_id sur TOUTES
// les opérations. L'isolation multi-tenant est applicative
// (défense en profondeur en complément du futur RLS effectif).
// ============================================================

import { getAuthenticatedClient, ORG_SCOPED_ENTITIES } from '@/lib/supabase/server-with-context'
import { checkDocumentPrerequisite, PREREQUISITE_GATED_ENTITIES } from '@/lib/document-prerequisite-guard'
import { sanitizeObject } from '@/lib/sanitize'
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
  entity: CrudEntity; select?: string; filters?: Record<string, string>
  orderBy?: string; orderAsc?: boolean; limit?: number; offset?: number
}

export async function getAll<T = any>(request: Request, options: CrudOptions) {
  const { client, organizationId, error } = await getAuthenticatedClient(request)
  if (error || !client || !organizationId) return { data: null, error, count: 0 }

  let query = client.from(options.entity).select(options.select || '*', { count: 'exact' })
  if (ORG_SCOPED_ENTITIES.has(options.entity)) query = query.eq('organization_id', organizationId)

  if (options.filters) {
    for (const [key, value] of Object.entries(options.filters)) {
      if (value.includes(',')) query = query.in(key, value.split(','))
      else if (value.startsWith('ilike:')) query = query.ilike(key, `%${value.slice(6)}%`)
      else query = query.eq(key, value)
    }
  }
  if (options.orderBy) query = query.order(options.orderBy, { ascending: options.orderAsc ?? false })
  if (options.limit) query = query.limit(options.limit)
  if (options.offset) query = query.range(options.offset, options.offset + (options.limit || 10) - 1)

  const { data, error: qError, count } = await query
  return { data: data as T[], error: qError?.message, count: count || 0 }
}

export async function getById<T = any>(request: Request, entity: CrudEntity, id: string, select?: string) {
  const { client, organizationId, error } = await getAuthenticatedClient(request)
  if (error || !client || !organizationId) return { data: null, error }

  let query = client.from(entity).select(select || '*').eq('id', id)
  if (ORG_SCOPED_ENTITIES.has(entity)) query = query.eq('organization_id', organizationId)
  const { data, error: qError } = await query.single()

  if (!data && !qError) return { data: null, error: 'Ressource introuvable' }
  return { data: data as T, error: qError?.message }
}

export async function create<T = any>(request: Request, entity: CrudEntity, body: Record<string, any>) {
  const { client, profileId, organizationId, error } = await getAuthenticatedClient(request)
  if (error || !client || !organizationId) return { data: null, error }

  // --- Garde-fou prérequis documentaires (ISO 13485 §4.2.4) ---
  if (PREREQUISITE_GATED_ENTITIES.has(entity)) {
    const prereqCheck = await checkDocumentPrerequisite(client, organizationId, entity)
    if (!prereqCheck.allowed) {
      return { data: null, error: prereqCheck.reason }
    }
  }

  // --- Sanitisation XSS des entrées texte ---
  const sanitizedBody = await sanitizeObject(body)

  // FORCER organization_id depuis le serveur — ignorer toute valeur client
  if (ORG_SCOPED_ENTITIES.has(entity)) sanitizedBody.organization_id = organizationId
  else delete sanitizedBody.organization_id

  const tablesWithCreator = ['documents', 'form_templates', 'form_instances', 'capas', 'non_conformances', 'deviations', 'change_controls', 'audits', 'training', 'risks', 'suppliers', 'batch_records', 'scheduled_reports', 'notifications']
  if (tablesWithCreator.includes(entity) && profileId) sanitizedBody.created_by = profileId

  const { data, error: qError } = await client.from(entity).insert(sanitizedBody).select().single()
  return { data: data as T, error: qError?.message }
}

export async function update<T = any>(request: Request, entity: CrudEntity, id: string, body: Record<string, any>) {
  const { client, organizationId, error } = await getAuthenticatedClient(request)
  if (error || !client || !organizationId) return { data: null, error }

  let query = client.from(entity).update(body).eq('id', id)
  if (ORG_SCOPED_ENTITIES.has(entity)) query = query.eq('organization_id', organizationId)
  const { data, error: qError } = await query.select().single()

  if (qError || !data) return { data: null, error: 'Ressource introuvable' }
  return { data: data as T, error: null }
}

export async function softDelete(request: Request, entity: CrudEntity, id: string) {
  return update(request, entity, id, { status: 'Archived' } as any)
}

export async function remove(request: Request, entity: CrudEntity, id: string) {
  const { client, organizationId, error } = await getAuthenticatedClient(request)
  if (error || !client || !organizationId) return { error }

  let query = client.from(entity).delete().eq('id', id)
  if (ORG_SCOPED_ENTITIES.has(entity)) query = query.eq('organization_id', organizationId)
  const { error: qError, count } = await query

  if (qError || count === 0) return { error: 'Ressource introuvable' }
  return { error: null }
}

export async function getDashboardKPIs(request: Request) {
  const { client, organizationId, error } = await getAuthenticatedClient(request)
  if (error || !client || !organizationId) return { data: null, error }

  let query = client.from('v_org_dashboard').select('*').limit(1).single()
  try { query = query.eq('organization_id', organizationId) } catch { /* vue sans colonne org */ }
  const { data, error: qError } = await query
  return { data, error: qError?.message }
}

export async function getDeadlines(request: Request, daysAhead = 7) {
  const { client, organizationId, error } = await getAuthenticatedClient(request)
  if (error || !client || !organizationId) return { data: [], error }

  const { data, error: qError } = await client.rpc('get_upcoming_deadlines', { p_org_id: organizationId, p_days_ahead: daysAhead })
  return { data: data || [], error: qError?.message }
}

export async function getAuditTrail(request: Request, options: { entityType?: string; recordId?: string; limit?: number }) {
  const { client, organizationId, error } = await getAuthenticatedClient(request)
  if (error || !client || !organizationId) return { data: null, error }

  let query = client.from('audit_trails').select('*').order('created_at', { ascending: false })
  try { query = query.eq('organization_id', organizationId) } catch { /* colonne absente */ }
  if (options.entityType) query = query.eq('table_name', options.entityType)
  if (options.recordId) query = query.eq('record_id', options.recordId)
  if (options.limit) query = query.limit(options.limit)

  const { data, error: qError } = await query
  return { data, error: qError?.message }
}

export async function validateTransition(request: Request, recordTypeSlug: string, currentStatus: string, newStatus: string, _clientOrgId: string) {
  const { client, organizationId, error } = await getAuthenticatedClient(request)
  if (error || !client || !organizationId) return { valid: false, error }

  const { data, error: qError } = await client.rpc('validate_status_transition', {
    p_record_type_slug: recordTypeSlug, p_current_status: currentStatus, p_new_status: newStatus, p_organization_id: organizationId,
  })
  return { valid: !!data, error: qError?.message }
}