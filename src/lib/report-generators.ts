// ============================================================
// Report data generators
// Fetches real QMS data from Supabase for each report type
// ============================================================

import { getAuthenticatedClient } from '@/lib/supabase/server-with-context'
import type { NextRequest } from 'next/server'

export type ReportType =
  | 'capa-analysis'
  | 'ncr-trends'
  | 'audit-summary'
  | 'training-matrix'
  | 'risk-register'
  | 'supplier-scorecard'
  | 'compliance-dashboard'

export interface ReportParams {
  type: ReportType
  dateFrom?: string
  dateTo?: string
  format: 'pdf' | 'csv' | 'html'
}

interface DateFilter {
  from?: string
  to?: string
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function applyDateRange(query: any, dateField: string, df: DateFilter) {
  if (df.from) query = query.gte(dateField, df.from)
  if (df.to) query = query.lte(dateField, df.to + 'T23:59:59')
  return query
}

function fmtDate(d: string | null): string {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('fr-FR') } catch { return d }
}

function fmtPct(n: number, total: number): string {
  if (total === 0) return '0%'
  return Math.round((n / total) * 100) + '%'
}

// ─── 1. CAPA Analysis ───────────────────────────────────────────────────────

export async function fetchCapaAnalysis(request: NextRequest, df: DateFilter) {
  const { client } = await getAuthenticatedClient(request)
  if (!client) throw new Error('Non authentifié')

  let query = client
    .from('capas')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500)

  query = applyDateRange(query, 'created_at', df)
  const { data, error } = await query
  if (error) throw new Error(error.message)

  const items = (data || []) as any[]
  const total = items.length
  const open = items.filter(i => i.status === 'Open').length
  const inProgress = items.filter(i => i.status === 'In Progress').length
  const closed = items.filter(i => i.status === 'Closed').length
  const overdue = items.filter(i => i.due_date && new Date(i.due_date) < new Date() && i.status !== 'Closed').length
  const withRootCause = items.filter(i => i.root_cause).length

  // Tendance par type
  const byType: Record<string, number> = {}
  const byPriority: Record<string, number> = {}
  for (const i of items) {
    byType[i.type || 'Non défini'] = (byType[i.type || 'Non défini'] || 0) + 1
    byPriority[i.priority || 'Medium'] = (byPriority[i.priority || 'Medium'] || 0) + 1
  }

  return {
    title: 'Analyse CAPA',
    subtitle: `Période : ${df.from || 'Début'} → ${df.to || 'ce jour'}`,
    generatedAt: new Date().toISOString(),
    summary: { total, open, inProgress, closed, overdue, withRootCause, rootCausePct: fmtPct(withRootCause, total) },
    byType,
    byPriority,
    items: items.map(i => ({
      ref: i.reference_number || i.id,
      titre: i.title,
      type: i.type || '—',
      priorité: i.priority || 'Medium',
      statut: i.status,
      cause_racine: i.root_cause ? (i.root_cause as string).substring(0, 80) + '...' : 'Non définie',
      échéance: fmtDate(i.due_date),
      créé_le: fmtDate(i.created_at),
    })),
  }
}

// ─── 2. NCR Trends ──────────────────────────────────────────────────────────

export async function fetchNcrTrends(request: NextRequest, df: DateFilter) {
  const { client } = await getAuthenticatedClient(request)
  if (!client) throw new Error('Non authentifié')

  let query = client
    .from('non_conformances')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500)

  query = applyDateRange(query, 'created_at', df)
  const { data, error } = await query
  if (error) throw new Error(error.message)

  const items = (data || []) as any[]
  const total = items.length
  const open = items.filter(i => i.status === 'Open').length
  const closed = items.filter(i => i.status === 'Closed').length
  const critical = items.filter(i => i.severity === 'Critical').length
  const major = items.filter(i => i.severity === 'Major').length
  const minor = items.filter(i => i.severity === 'Minor').length

  const byDepartment: Record<string, number> = {}
  const byDisposition: Record<string, number> = {}
  for (const i of items) {
    const dept = i.department || 'Non assigné'
    byDepartment[dept] = (byDepartment[dept] || 0) + 1
    const disp = i.disposition || 'En attente'
    byDisposition[disp] = (byDisposition[disp] || 0) + 1
  }

  return {
    title: 'Tendances NCR',
    subtitle: `Période : ${df.from || 'Début'} → ${df.to || 'ce jour'}`,
    generatedAt: new Date().toISOString(),
    summary: { total, open, closed, critical, major, minor, closureRate: fmtPct(closed, total) },
    byDepartment,
    byDisposition,
    items: items.map(i => ({
      ref: i.reference_number || i.id,
      titre: i.title,
      sévérité: i.severity || '—',
      département: i.department || '—',
      disposition: i.disposition || 'En attente',
      statut: i.status,
      échéance: fmtDate(i.due_date),
      créé_le: fmtDate(i.created_at),
    })),
  }
}

// ─── 3. Audit Summary ───────────────────────────────────────────────────────

export async function fetchAuditSummary(request: NextRequest, df: DateFilter) {
  const { client } = await getAuthenticatedClient(request)
  if (!client) throw new Error('Non authentifié')

  let query = client
    .from('audits')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500)

  query = applyDateRange(query, 'created_at', df)
  const { data, error } = await query
  if (error) throw new Error(error.message)

  const items = (data || []) as any[]
  const total = items.length
  const planned = items.filter(i => i.status === 'Planned').length
  const inProgress = items.filter(i => i.status === 'In Progress').length
  const completed = items.filter(i => i.status === 'Completed').length
  const internal = items.filter(i => i.audit_type === 'Internal').length
  const external = items.filter(i => i.audit_type === 'External').length
  const supplier = items.filter(i => i.audit_type === 'Supplier').length

  return {
    title: 'Résumé des audits',
    subtitle: `Période : ${df.from || 'Début'} → ${df.to || 'ce jour'}`,
    generatedAt: new Date().toISOString(),
    summary: { total, planned, inProgress, completed, internal, external, supplier, completionRate: fmtPct(completed, total) },
    items: items.map(i => ({
      ref: i.reference_number || i.id,
      titre: i.title,
      type: i.audit_type || '—',
      statut: i.status,
      date_planifiée: fmtDate(i.scheduled_date),
      date_fin: fmtDate(i.completed_date),
      auditeur: i.lead_auditor || '—',
    })),
  }
}

// ─── 4. Training Matrix ─────────────────────────────────────────────────────

export async function fetchTrainingMatrix(request: NextRequest, df: DateFilter) {
  const { client } = await getAuthenticatedClient(request)
  if (!client) throw new Error('Non authentifié')

  let query = client
    .from('training')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500)

  query = applyDateRange(query, 'created_at', df)
  const { data, error } = await query
  if (error) throw new Error(error.message)

  const items = (data || []) as any[]
  const total = items.length
  const completed = items.filter(i => i.status === 'Completed').length
  const inProgress = items.filter(i => i.status === 'In Progress').length
  const overdue = items.filter(i => i.status === 'Overdue').length
  const planned = items.filter(i => i.status === 'Planned').length
  const effective = items.filter(i => i.effectiveness_score && i.effectiveness_score >= 3).length

  return {
    title: 'Matrice de formation',
    subtitle: `Période : ${df.from || 'Début'} → ${df.to || 'ce jour'}`,
    generatedAt: new Date().toISOString(),
    summary: {
      total, completed, inProgress, overdue, planned,
      completionRate: fmtPct(completed, total),
      overdueRate: fmtPct(overdue, total),
      effectiveRate: fmtPct(effective, total),
    },
    items: items.map(i => ({
      ref: i.reference_number || i.id,
      titre: i.title,
      type: i.training_type || '—',
      formateur: i.trainer || '—',
      statut: i.status,
      score_efficacité: i.effectiveness_score || '—',
      date_échéance: fmtDate(i.due_date),
      date_fin: fmtDate(i.completed_date),
    })),
  }
}

// ─── 5. Risk Register ───────────────────────────────────────────────────────

export async function fetchRiskRegister(request: NextRequest, df: DateFilter) {
  const { client } = await getAuthenticatedClient(request)
  if (!client) throw new Error('Non authentifié')

  let query = client
    .from('risks')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500)

  query = applyDateRange(query, 'created_at', df)
  const { data, error } = await query
  if (error) throw new Error(error.message)

  const items = (data || []) as any[]
  const total = items.length
  const open = items.filter(i => i.status === 'Open').length
  const mitigated = items.filter(i => i.status === 'Mitigated').length
  const closed = items.filter(i => i.status === 'Closed').length

  const highRisks = items.filter(i => {
    const rpn = (i.severity || 1) * (i.probability || 1) * (i.detectability || 1)
    return rpn >= 200
  }).length
  const mediumRisks = items.filter(i => {
    const rpn = (i.severity || 1) * (i.probability || 1) * (i.detectability || 1)
    return rpn >= 100 && rpn < 200
  }).length
  const lowRisks = items.filter(i => {
    const rpn = (i.severity || 1) * (i.probability || 1) * (i.detectability || 1)
    return rpn < 100
  }).length

  return {
    title: 'Registre des risques',
    subtitle: `Période : ${df.from || 'Début'} → ${df.to || 'ce jour'}`,
    generatedAt: new Date().toISOString(),
    summary: { total, open, mitigated, closed, highRisks, mediumRisks, lowRisks },
    items: items.map(i => {
      const rpn = (i.severity || 1) * (i.probability || 1) * (i.detectability || 1)
      return {
        ref: i.reference_number || i.id,
        titre: i.title,
        catégorie: i.category || '—',
        sévérité: i.severity || 1,
        probabilité: i.probability || 1,
        détectabilité: i.detectability || 1,
        RPN: rpn,
        niveau: rpn >= 200 ? 'Élevé' : rpn >= 100 ? 'Moyen' : 'Faible',
        statut: i.status,
        date_création: fmtDate(i.created_at),
      }
    }),
  }
}

// ─── 6. Supplier Scorecard ──────────────────────────────────────────────────

export async function fetchSupplierScorecard(request: NextRequest, df: DateFilter) {
  const { client } = await getAuthenticatedClient(request)
  if (!client) throw new Error('Non authentifié')

  let query = client
    .from('suppliers')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500)

  query = applyDateRange(query, 'created_at', df)
  const { data, error } = await query
  if (error) throw new Error(error.message)

  const items = (data || []) as any[]
  const total = items.length
  const qualified = items.filter(i => i.status === 'Qualified').length
  const underReview = items.filter(i => i.status === 'Under Review').length
  const disqualified = items.filter(i => i.status === 'Disqualified').length
  const prospective = items.filter(i => i.status === 'Prospective').length

  return {
    title: 'Scorecard fournisseurs',
    subtitle: `Période : ${df.from || 'Début'} → ${df.to || 'ce jour'}`,
    generatedAt: new Date().toISOString(),
    summary: { total, qualified, underReview, disqualified, prospective, qualificationRate: fmtPct(qualified, total) },
    items: items.map(i => ({
      nom: i.name || '—',
      catégorie: i.category || '—',
      statut: i.status,
      note_qualité: i.quality_rating || '—',
      note_livraison: i.delivery_rating || '—',
      note_globale: i.overall_rating || '—',
      contact: i.contact_email || '—',
      date_évaluation: fmtDate(i.last_audit_date),
    })),
  }
}

// ─── 7. Compliance Dashboard ────────────────────────────────────────────────

export async function fetchComplianceDashboard(request: NextRequest, _df: DateFilter) {
  const { client } = await getAuthenticatedClient(request)
  if (!client) throw new Error('Non authentifié')

  // Fetch compliance from the RPC
  const { data: orgData } = await client
    .from('organizations')
    .select('id, name')
    .limit(1)
    .single()

  const orgId = orgData?.id
  if (!orgId) throw new Error('Organisation non trouvée')

  // Use RPC for weighted score
  const { data: scoreData, error: scoreErr } = await client.rpc('get_org_compliance_score', {
    p_org_id: orgId,
    p_industry_type: 'medical_device',
  })

  // Fetch individual entity stats
  const [docs, capas, ncrs, audits, training, risks, batches, suppliers] = await Promise.all([
    client.from('documents').select('status').eq('organization_id', orgId),
    client.from('capas').select('status, priority').eq('organization_id', orgId),
    client.from('non_conformances').select('status, severity').eq('organization_id', orgId),
    client.from('audits').select('status, audit_type').eq('organization_id', orgId),
    client.from('training').select('status').eq('organization_id', orgId),
    client.from('risks').select('status').eq('organization_id', orgId),
    client.from('batch_records').select('status').eq('organization_id', orgId),
    client.from('suppliers').select('status').eq('organization_id', orgId),
  ])

  const entityStats = [
    { module: 'Documents', total: docs.data?.length || 0, ok: docs.data?.filter(d => ['Effective', 'Approved'].includes(d.status)).length || 0 },
    { module: 'CAPA', total: capas.data?.length || 0, ok: capas.data?.filter(d => d.status === 'Closed').length || 0 },
    { module: 'NCR', total: ncrs.data?.length || 0, ok: ncrs.data?.filter(d => d.status === 'Closed').length || 0 },
    { module: 'Audits', total: audits.data?.length || 0, ok: audits.data?.filter(d => d.status === 'Completed').length || 0 },
    { module: 'Formations', total: training.data?.length || 0, ok: training.data?.filter(d => d.status === 'Completed').length || 0 },
    { module: 'Risques', total: risks.data?.length || 0, ok: risks.data?.filter(d => d.status !== 'Open').length || 0 },
    { module: 'Lots', total: batches.data?.length || 0, ok: batches.data?.filter(d => d.status === 'Released').length || 0 },
    { module: 'Fournisseurs', total: suppliers.data?.length || 0, ok: suppliers.data?.filter(d => d.status === 'Qualified').length || 0 },
  ]

  const overallScore = scoreErr ? null : (scoreData as any)?.[0]?.weighted_score ?? null

  return {
    title: 'Tableau de conformité',
    subtitle: `Organisation : ${orgData?.name || '—'}`,
    generatedAt: new Date().toISOString(),
    overallScore,
    entityStats,
  }
}

// ─── Router ─────────────────────────────────────────────────────────────────

export async function generateReportData(request: NextRequest, params: ReportParams) {
  const df: DateFilter = {
    from: params.dateFrom || undefined,
    to: params.dateTo || undefined,
  }

  switch (params.type) {
    case 'capa-analysis': return fetchCapaAnalysis(request, df)
    case 'ncr-trends': return fetchNcrTrends(request, df)
    case 'audit-summary': return fetchAuditSummary(request, df)
    case 'training-matrix': return fetchTrainingMatrix(request, df)
    case 'risk-register': return fetchRiskRegister(request, df)
    case 'supplier-scorecard': return fetchSupplierScorecard(request, df)
    case 'compliance-dashboard': return fetchComplianceDashboard(request, df)
    default: throw new Error(`Type de rapport inconnu: ${params.type}`)
  }
}