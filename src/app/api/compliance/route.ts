// ============================================================
// GET /api/compliance
// Aggregates data across all QMS entities to build ComplianceData
// Returns enriched response with per-standard clause evaluations
// and industry-specific weighted scoring
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getAll, type CrudEntity } from '@/lib/crud-service'
import {
  CHECKLISTS,
  buildComplianceData,
  type ComplianceData,
  type ClauseStatus,
} from '@/lib/compliance-checklists'
import { INDUSTRY_CONFIG, type IndustryType } from '@/types/qms'
import { readRateLimit, getRateLimitKey } from '@/lib/rate-limit'

function ok(data: unknown) {
  return NextResponse.json({ success: true, data })
}
function err(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

// ---------------------------------------------------------------------------
// Internal: evaluate a single checklist against compliance data
// ---------------------------------------------------------------------------
function evaluateChecklist(checklistId: string, data: ComplianceData) {
  const checklist = CHECKLISTS.find(c => c.id === checklistId)
  if (!checklist) return null

  const clauses = checklist.clauses.map(clause => {
    const result = clause.calculator(data)
    return {
      id: clause.id,
      clause: clause.clause,
      title: clause.title,
      category: clause.category,
      description: clause.description,
      percent: result.percent,
      status: result.status,
      evidence: result.evidence,
    }
  })

  const compliant = clauses.filter(c => c.status === 'compliant').length
  const score = clauses.length > 0
    ? Math.round(clauses.reduce((sum, c) => sum + c.percent, 0) / clauses.length)
    : 100

  return {
    id: checklist.id,
    name: checklist.name,
    standard: checklist.standard,
    clauses,
    compliant,
    total: clauses.length,
    score,
  }
}

// ---------------------------------------------------------------------------
// Internal: compute weighted score from raw metric rates
// ---------------------------------------------------------------------------
function computeWeightedScore(
  data: ComplianceData,
  weights: Record<string, number>,
): number {
  // Map of weight keys → raw metric fractions (0-1)
  const metricRates: Record<string, number> = {
    documents: data.totalDocCount > 0 ? data.approvedDocCount / data.totalDocCount : 1,
    capas: data.totalCapa > 0 ? data.closedCapa / data.totalCapa : 1,
    training: data.totalTraining > 0 ? data.completedTraining / data.totalTraining : 1,
    audits: data.totalAuditCount > 0 ? data.completedAuditCount / data.totalAuditCount : 1,
    ncrs: data.totalNcr > 0 ? data.closedNcr / data.totalNcr : 1,
    risks: data.totalRisk > 0 ? (data.totalRisk - data.openRisk) / data.totalRisk : 1,
    batchRecords: data.totalBatch > 0 ? data.releasedBatch / data.totalBatch : 1,
    suppliers: data.totalSupplierCount > 0 ? data.qualifiedSupplierCount / data.totalSupplierCount : 1,
  }

  let weightedSum = 0
  let totalWeight = 0

  for (const [key, weight] of Object.entries(weights)) {
    if (weight > 0) {
      weightedSum += (metricRates[key] ?? 0) * weight
      totalWeight += weight
    }
  }

  // Normalize to 0-100, round to 1 decimal
  return totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 1000) / 10 : 100
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  // Rate limiting (Tier 3 — read)
  const orgId = request.headers.get('x-org-id')
  const rlKey = getRateLimitKey(request, orgId || undefined)
  const rl = readRateLimit(rlKey)
  if (!rl.allowed) {
    return err('Trop de requêtes', 429)
  }

  try {
    // Fetch all entities in parallel (limit 500 each for performance)
    const entities: CrudEntity[] = [
      'documents', 'capas', 'non_conformances', 'deviations',
      'change_controls', 'audits', 'training', 'risks', 'batch_records', 'suppliers',
    ]

    const results = await Promise.all(
      entities.map(e => getAll(request, {
        entity: e,
        orderBy: 'created_at',
        limit: 500,
      }))
    )

    const dataMap: Record<string, any[]> = {}
    entities.forEach((e, i) => {
      dataMap[e] = (results[i].data || []) as any[]
    })

    // Build compliance data (includes suppliers now)
    const complianceData = buildComplianceData({
      documents: dataMap.documents,
      capas: dataMap.capas,
      ncrs: dataMap.non_conformances,
      audits: dataMap.audits,
      training: dataMap.training,
      risks: dataMap.risks,
      batchRecords: dataMap.batch_records,
      suppliers: dataMap.suppliers,
      changeControls: dataMap.change_controls,
      deviations: dataMap.deviations,
    })

    // Evaluate all 3 checklists
    const iso13485 = evaluateChecklist('iso13485', complianceData)
    const ichq10 = evaluateChecklist('ichq10', complianceData)
    const ivdr = evaluateChecklist('ivdr', complianceData)

    // Compute weighted scores for each standard using the relevant industry config
    // For each standard we use the primary industry that maps to it
    const isoWeights = INDUSTRY_CONFIG.medical_device.complianceWeights
    const ichWeights = INDUSTRY_CONFIG.pharmaceutical.complianceWeights
    const ivdrWeights = INDUSTRY_CONFIG.ivd.complianceWeights

    const iso13485Weighted = iso13485 ? {
      ...iso13485,
      weightedScore: computeWeightedScore(complianceData, isoWeights),
    } : null

    const ichq10Weighted = ichq10 ? {
      ...ichq10,
      weightedScore: computeWeightedScore(complianceData, ichWeights),
    } : null

    const ivdrWeighted = ivdr ? {
      ...ivdr,
      weightedScore: computeWeightedScore(complianceData, ivdrWeights),
    } : null

    // Determine the primary industry from the org settings if available
    // Default to the iso13485 weights for overall if unknown
    let overallWeighted = computeWeightedScore(complianceData, isoWeights)
    // If we could resolve the industry, use its weights for the overall
    // (For now we pick the primary checklist's industry as the best guess)

    const enrichedResponse = {
      // Flat metrics (backward-compatible)
      metrics: complianceData,

      // Per-standard evaluations with weighted scores
      iso13485: iso13485Weighted,
      ichq10: ichq10Weighted,
      ivdr: ivdrWeighted,

      // Overall weighted score (uses the primary standard for this org)
      overallWeighted,
    }

    // Inject rate limit headers
    const response = NextResponse.json({ success: true, data: enrichedResponse })
    response.headers.set('X-RateLimit-Remaining', String(rl.remaining))
    response.headers.set('X-RateLimit-Reset', String(rl.resetAt))
    return response
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return err(message, 500)
  }
}