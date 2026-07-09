import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, ok, fail, getOrgStandards } from '@/lib/api-helpers'

// GET /api/dashboard — KPIs globaux
export async function GET() {
  const { user, error } = await requireUser()
  if (error || !user) return error

  const orgId = user.organizationId
  const [
    documents, risks, audits, nonconformities, capas, trainings, suppliers, processes, users, standards
  ] = await Promise.all([
    db.document.findMany({ where: { organizationId: orgId } }),
    db.risk.findMany({ where: { organizationId: orgId } }),
    db.audit.findMany({ where: { organizationId: orgId } }),
    db.nonconformity.findMany({ where: { organizationId: orgId } }),
    db.cAPA.findMany({ where: { organizationId: orgId } }),
    db.training.findMany({ where: { organizationId: orgId } }),
    db.supplier.findMany({ where: { organizationId: orgId } }),
    db.process.findMany({ where: { organizationId: orgId } }),
    db.user.findMany({ where: { organizationId: orgId }, select: { id: true, name: true, email: true, role: true, position: true, department: true, active: true } }),
    getOrgStandards(orgId)
  ])

  // Documents by status
  const docsByStatus = groupBy(documents, 'status')
  const docsByCategory = groupBy(documents, 'category')

  // Risks: count by RPN threshold (>=80 high)
  const risksHigh = risks.filter(r => r.rpn >= 80).length
  const risksMedium = risks.filter(r => r.rpn >= 30 && r.rpn < 80).length
  const risksLow = risks.filter(r => r.rpn < 30).length

  // Open NCs
  const openNcs = nonconformities.filter(n => n.status !== 'CLOSED').length
  const ncBySeverity = groupBy(nonconformities, 'severity')
  const ncByStatus = groupBy(nonconformities, 'status')

  // CAPA
  const openCapas = capas.filter(c => c.status !== 'COMPLETED' && c.status !== 'VERIFIED').length
  const capaByStatus = groupBy(capas, 'status')
  const overdueCapas = capas.filter(c => c.dueDate && c.dueDate < new Date() && c.status !== 'COMPLETED' && c.status !== 'VERIFIED').length

  // Audits
  const plannedAudits = audits.filter(a => a.status === 'PLANNED').length
  const completedAudits = audits.filter(a => a.status === 'COMPLETED').length

  // Documents to review (nextReviewDate within 90 days or past)
  const now = new Date()
  const ninetyDaysAhead = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
  const docsToReview = documents.filter(d => d.nextReviewDate && d.nextReviewDate <= ninetyDaysAhead && d.status === 'APPROVED').length

  // Trainings
  const completedTrainings = trainings.filter(t => t.status === 'COMPLETED').length
  const plannedTrainings = trainings.filter(t => t.status === 'PLANNED').length

  // Suppliers
  const approvedSuppliers = suppliers.filter(s => s.evaluation === 'APPROVED').length

  // Recent activities (latest items)
  const recent = [
    ...documents.slice(-3).map(d => ({ type: 'document', title: d.title, code: d.code, at: d.updatedAt })),
    ...nonconformities.slice(-3).map(n => ({ type: 'nc', title: n.title, code: n.reference, at: n.updatedAt })),
    ...capas.slice(-3).map(c => ({ type: 'capa', title: c.title, code: c.reference, at: c.updatedAt })),
    ...audits.slice(-2).map(a => ({ type: 'audit', title: a.title, code: '', at: a.updatedAt }))
  ].sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 8)

  return ok({
    user,
    organization: {
      id: user.organizationId,
      name: user.organizationName
    },
    standards,
    kpis: {
      documents: { total: documents.length, byStatus: docsByStatus, byCategory: docsByCategory, toReview: docsToReview },
      risks: { total: risks.length, high: risksHigh, medium: risksMedium, low: risksLow },
      audits: { total: audits.length, planned: plannedAudits, completed: completedAudits },
      nonconformities: { total: nonconformities.length, open: openNcs, bySeverity: ncBySeverity, byStatus: ncByStatus },
      capas: { total: capas.length, open: openCapas, overdue: overdueCapas, byStatus: capaByStatus },
      trainings: { total: trainings.length, completed: completedTrainings, planned: plannedTrainings },
      suppliers: { total: suppliers.length, approved: approvedSuppliers },
      processes: { total: processes.length },
      users: { total: users.length, active: users.filter(u => u.active).length }
    },
    recent,
    users
  })
}

function groupBy<T extends Record<string, any>>(arr: T[], key: keyof T): Record<string, number> {
  return arr.reduce((acc, item) => {
    const k = String(item[key])
    acc[k] = (acc[k] || 0) + 1
    return acc
  }, {} as Record<string, number>)
}
