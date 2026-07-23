// ============================================================
// Service CRUD générique — filtre organization_id sur TOUTES
// les opérations. L'isolation multi-tenant est applicative
// (défense en profondeur en complément du futur RLS effectif).
// ============================================================

import { getAuthenticatedClient, ORG_SCOPED_ENTITIES } from '@/lib/supabase/server-with-context'
import { checkDocumentPrerequisite, PREREQUISITE_GATED_ENTITIES } from '@/lib/document-prerequisite-guard'
import { checkDocumentStatusTransition } from '@/lib/document-workflow-guard'
import { sanitizeObject } from '@/lib/sanitize'
import type { Request } from 'next/server'
import { randomUUID } from 'crypto'

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
  if (tablesWithCreator.includes(entity) && profileId) sanitizedBody.created_by_id = profileId

  // Auto-generate id and updated_at for NOT NULL columns
  if (!sanitizedBody.id) sanitizedBody.id = randomUUID()
  sanitizedBody.updated_at = new Date().toISOString()

  // --- Auto-génération des numéros métier (NOT NULL dans le schéma) ---
  // Si le client n'a pas fourni le numéro, on en génère un unique par org
  // au format PREFIX-YYYY-NNNN (ex: CAPA-2026-0001, DOC-2026-0001).
  await autoGenerateBusinessNumber(client, entity, organizationId, sanitizedBody)

  const { data, error: qError } = await client.from(entity).insert(sanitizedBody).select().single()
  return { data: data as T, error: qError?.message }
}

// ---------------------------------------------------------------------------
// Auto-génération des numéros métier — corrige BUG-05/06/07.
// Map entity → (column_name, prefix). Si la colonne est absente du body,
// on calcule un numéro séquentiel pour l'organisation sur l'année courante.
// ---------------------------------------------------------------------------
const BUSINESS_NUMBER_CONFIG: Record<CrudEntity, { column: string; prefix: string }> = {
  documents:               { column: 'document_number', prefix: 'DOC'  },
  capas:                   { column: 'capa_number',     prefix: 'CAPA' },
  non_conformances:        { column: 'ncr_number',      prefix: 'NCR'  },
  deviations:              { column: 'dev_number',      prefix: 'DEV'  },
  change_controls:         { column: 'cc_number',       prefix: 'CC'   },
  audits:                  { column: 'audit_number',    prefix: 'AUD'  },
  training:                { column: '', prefix: '' },  // training table n'a pas de training_number
  risks:                   { column: 'risk_number',     prefix: 'RISK' },
  suppliers:               { column: 'supplier_code',   prefix: 'SUP'  },
  batch_records:           { column: 'lot_number',     prefix: 'BAT'  },
  // Entités sans numéro métier (mappées à une sentinelle null)
  electronic_signatures:   { column: '', prefix: '' },
  document_prerequisites:  { column: '', prefix: '' },
  form_templates:          { column: '', prefix: '' },
  form_instances:          { column: '', prefix: '' },
  departments:             { column: '', prefix: '' },
  record_type_definitions: { column: '', prefix: '' },
  record_links:            { column: '', prefix: '' },
  document_triggers:       { column: '', prefix: '' },
  document_relationships:  { column: '', prefix: '' },
  document_code_sequences: { column: '', prefix: '' },
  scheduled_reports:       { column: '', prefix: '' },
  notifications:           { column: '', prefix: '' },
}

async function autoGenerateBusinessNumber(
  client: any,
  entity: CrudEntity,
  organizationId: string,
  body: Record<string, any>,
): Promise<void> {
  const config = BUSINESS_NUMBER_CONFIG[entity]
  if (!config || !config.column || !config.prefix) return

  // Si le client a fourni la valeur, on la garde (sanitisée plus tôt)
  if (body[config.column] && typeof body[config.column] === 'string' && body[config.column].trim()) {
    return
  }

  const year = new Date().getFullYear()
  const prefix = `${config.prefix}-${year}-`

  try {
    // Compter les enregistrements existants pour cette org sur cette année
    // (approche simple — pour la robustesse, utiliser une séquence dédiée).
    const { data: existing, error } = await client
      .from(entity)
      .select(config.column)
      .eq('organization_id', organizationId)
      .like(config.column, `${prefix}%`)
      .order(config.column, { ascending: false })
      .limit(1)

    let next = 1
    if (!error && existing && existing.length > 0) {
      const lastNum = existing[0][config.column] as string
      const match = lastNum.match(/-(\d+)$/)
      if (match) next = parseInt(match[1], 10) + 1
    }

    body[config.column] = `${prefix}${String(next).padStart(4, '0')}`
  } catch (e) {
    // En cas d'erreur, générer un numéro basé sur le timestamp (fallback)
    body[config.column] = `${prefix}${Date.now().toString().slice(-6)}`
  }
}

export async function update<T = any>(request: Request, entity: CrudEntity, id: string, body: Record<string, any>) {
  const { client, profileId, organizationId, error } = await getAuthenticatedClient(request)
  if (error || !client || !organizationId) return { data: null, error }

  // --- Garde-fou workflow documentaire (séparation des tâches, 21 CFR Part 11) ---
  if (entity === 'documents' && body.status && profileId) {
    const { data: currentDoc, error: docFetchError } = await client
      .from('documents')
      .select('status, author_id, created_by_id')
      .eq('id', id)
      .single()

    if (docFetchError) {
      return { data: null, error: 'Impossible de vérifier le statut actuel du document — mise à jour refusée par sécurité.' }
    }

    if (currentDoc && body.status !== currentDoc.status) {
      const workflowCheck = await checkDocumentStatusTransition(
        client, organizationId, id,
        currentDoc.status, body.status, profileId,
      )
      if (!workflowCheck.allowed) {
        return { data: null, error: workflowCheck.reason || 'Transition de statut non autorisée par le workflow.' }
      }
    }
  }

  // Always set updated_at on updates (NOT NULL without DEFAULT)
  body.updated_at = new Date().toISOString()

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