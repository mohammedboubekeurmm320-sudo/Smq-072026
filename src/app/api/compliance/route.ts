// ============================================================
// GET /api/compliance
// Aggregates data across all QMS entities to build ComplianceData
// Used by the Compliance page for ISO 13485 / ICH Q10 / IVDR scoring
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getAll, type CrudEntity } from '@/lib/crud-service'

function ok(data: any) {
  return NextResponse.json({ success: true, data })
}
function err(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

export async function GET(request: NextRequest) {
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

    const data: Record<string, any[]> = {}
    entities.forEach((e, i) => {
      data[e] = (results[i].data || []) as any[]
    })

    // Build compliance metrics
    const docs = data.documents || []
    const capas = data.capas || []
    const ncrs = data.non_conformances || []
    const audits = data.audits || []
    const training = data.training || []
    const risks = data.risks || []
    const batches = data.batch_records || []

    const complianceData = {
      approvedDocCount: docs.filter((d: any) => d.status === 'Approved' || d.status === 'Effective').length,
      totalDocCount: docs.length,
      inReviewDocCount: docs.filter((d: any) => d.status === 'Under Review').length,
      recordDocCount: docs.filter((d: any) => ['ENREGISTREMENT', 'REGISTRE', 'Form'].includes(d.doc_type || d.docType)).length,
      validationDocCount: docs.filter((d: any) => d.validation_phase || d.validationPhase).length,
      completedAuditCount: audits.filter((a: any) => a.status === 'Completed').length,
      totalAuditCount: audits.length,
      completedTraining: training.filter((t: any) => t.status === 'Completed').length,
      totalTraining: training.length,
      openRisk: risks.filter((r: any) => r.status === 'Open').length,
      totalRisk: risks.length,
      releasedBatch: batches.filter((b: any) => b.status === 'Released').length,
      totalBatch: batches.length,
      batchWithProductCode: batches.filter((b: any) => b.product_code || b.productCode).length,
      closedNcr: ncrs.filter((n: any) => n.status === 'Closed').length,
      totalNcr: ncrs.length,
      closedCapa: capas.filter((c: any) => c.status === 'Closed').length,
      totalCapa: capas.length,
      capaWithRootCause: capas.filter((c: any) => c.root_cause_category || c.rootCauseCategory || c.root_cause_analysis || c.rootCauseAnalysis).length,
    }

    return ok(complianceData)
  } catch (error: any) {
    return err(error.message || 'Erreur serveur', 500)
  }
}