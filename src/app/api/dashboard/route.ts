import { db } from '@/lib/db'
import { getServerSession } from '@/lib/auth-server'
import { apiSuccess, apiError, parseJson } from '@/lib/api-helpers'
import { INDUSTRY_CONFIG, type IndustryType } from '@/types/qms'
import { buildComplianceData } from '@/lib/compliance-checklists'

export async function GET() {
  try {
    const session = await getServerSession()
    if (!session) return apiError('Non authentifié', 401)
    const orgId = session.profile.organizationId

    const [documents, capas, ncrs, deviations, changeControls, audits, risks, trainings, batchRecords, suppliers, auditTrails, profiles] = await Promise.all([
      db.document.findMany({ where: { organizationId: orgId } }),
      db.cAPA.findMany({ where: { organizationId: orgId } }),
      db.nonConformance.findMany({ where: { organizationId: orgId } }),
      db.deviation.findMany({ where: { organizationId: orgId } }),
      db.changeControl.findMany({ where: { organizationId: orgId } }),
      db.audit.findMany({ where: { organizationId: orgId } }),
      db.risk.findMany({ where: { organizationId: orgId } }),
      db.training.findMany({ where: { organizationId: orgId } }),
      db.batchRecord.findMany({ where: { organizationId: orgId } }),
      db.supplier.findMany({ where: { organizationId: orgId } }),
      db.auditTrail.findMany({ where: { organizationId: orgId }, take: 10, orderBy: { createdAt: 'desc' } }),
      db.profile.findMany({ where: { organizationId: orgId }, select: { id: true, email: true, fullName: true, role: true, department: true, jobTitle: true, active: true } }),
    ])

    const industry = (session.organization.settings.industry_type || 'medical_device') as IndustryType
    const indConfig = INDUSTRY_CONFIG[industry] || INDUSTRY_CONFIG.medical_device
    const w = indConfig.complianceWeights

    const openCapas = capas.filter(c => c.status !== 'Closed').length
    const overdueCapas = capas.filter(c => c.status !== 'Closed' && c.dueDate && c.dueDate < new Date()).length
    const openNcrs = ncrs.filter(n => n.status !== 'Closed').length
    const criticalNcrs = ncrs.filter(n => n.severity === 'Critical').length
    const openDeviations = deviations.filter(d => d.status !== 'Closed').length
    const openChangeControls = changeControls.filter(c => !['Completed', 'Rejected'].includes(c.status)).length
    const approvedDocs = documents.filter(d => d.status === 'Approved' || d.status === 'Effective').length
    const inReviewDocs = documents.filter(d => d.status === 'Under Review').length
    const releasedBatches = batchRecords.filter(b => b.status === 'Released').length
    const qualifiedSuppliers = suppliers.filter(s => s.status === 'Qualified').length
    const activeRisks = risks.filter(r => r.riskLevel === 'High' || r.riskLevel === 'Critical').length
    const overdueTraining = trainings.filter(t => t.status !== 'Completed' && t.dueDate && t.dueDate < new Date()).length

    const complianceData = buildComplianceData({ documents: documents as any, capas: capas as any, ncrs: ncrs as any, audits: audits as any, training: trainings as any, risks: risks as any, batchRecords: batchRecords as any, suppliers: suppliers as any, changeControls: changeControls as any, deviations: deviations as any })
    const docCompliance = documents.length === 0 ? 100 : Math.round((approvedDocs / documents.length) * 100)
    const capaCompliance = capas.length === 0 ? 100 : Math.round((capas.filter(c => c.status === 'Closed').length / capas.length) * 100)
    const trainingCompliance = trainings.length === 0 ? 100 : Math.round((trainings.filter(t => t.status === 'Completed').length / trainings.length) * 100)
    const auditCompliance = audits.length === 0 ? 100 : Math.round((audits.filter(a => a.status === 'Completed').length / audits.length) * 100)
    const ncrCompliance = ncrs.length === 0 ? 100 : Math.round((ncrs.filter(n => n.status === 'Closed').length / ncrs.length) * 100)
    const riskCompliance = risks.length === 0 ? 100 : Math.round((risks.filter(r => r.status !== 'Open').length / risks.length) * 100)
    const batchCompliance = batchRecords.length === 0 ? 100 : Math.round((releasedBatches / batchRecords.length) * 100)
    const supplierCompliance = suppliers.length === 0 ? 100 : Math.round((qualifiedSuppliers / suppliers.length) * 100)
    const complianceScore = Math.round(
      docCompliance * w.documents + capaCompliance * w.capas + trainingCompliance * w.training +
      auditCompliance * w.audits + ncrCompliance * w.ncrs + riskCompliance * w.risks +
      batchCompliance * (w.batchRecords || 0) + supplierCompliance * w.suppliers
    )

    const capaStatusCounts = ['Open', 'Investigation', 'Implementation', 'Effectiveness Check', 'Closed'].map(s => ({ status: s, count: capas.filter(c => c.status === s).length }))
    const ncrTypeCounts = ['Product', 'Process', 'System', 'Supplier', 'OOS', 'OOT'].map(t => ({ type: t, count: ncrs.filter(n => n.ncrType === t).length }))
    const riskLevelCounts = ['Low', 'Medium', 'High', 'Critical'].map(l => ({ level: l, count: risks.filter(r => r.riskLevel === l).length }))

    return apiSuccess({
      session,
      kpis: {
        openCapas, overdueCapas, openNcrs, criticalNcrs, openDeviations, openChangeControls,
        approvedDocs, inReviewDocs, releasedBatches, qualifiedSuppliers, activeRisks, overdueTraining,
        totalDocs: documents.length, totalCapas: capas.length, totalNcrs: ncrs.length, totalAudits: audits.length,
        totalRisks: risks.length, totalTrainings: trainings.length, totalBatchRecords: batchRecords.length, totalSuppliers: suppliers.length,
        totalDeviations: deviations.length, totalChangeControls: changeControls.length, totalProfiles: profiles.length,
      },
      complianceScore,
      complianceBreakdown: { documents: docCompliance, capas: capaCompliance, training: trainingCompliance, audits: auditCompliance, ncrs: ncrCompliance, risks: riskCompliance, batchRecords: batchCompliance, suppliers: supplierCompliance },
      charts: { capaStatusCounts, ncrTypeCounts, riskLevelCounts },
      recentActivity: auditTrails,
      profiles,
      industryConfig: { label: indConfig.label, primaryStandard: indConfig.primaryStandard },
    })
  } catch (e: any) { return apiError(e.message, 500) }
}
