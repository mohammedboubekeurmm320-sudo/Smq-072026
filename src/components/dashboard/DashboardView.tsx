'use client'
import { useShallow } from 'zustand/react/shallow'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useAuth } from '@/contexts/AuthContext'
import { useQmsStore } from '@/lib/demo-store'
import { INDUSTRY_CONFIG } from '@/types/qms'
import { buildComplianceData, getChecklistForIndustry } from '@/lib/compliance-checklists'
import { Activity, AlertTriangle, ClipboardList, ShieldCheck, FileText, CheckCircle2, Users, Package, Truck, BarChart3, TrendingUp, Clock } from 'lucide-react'
import { fmtDate, fmtDateTime } from '@/lib/ui-labels'

export function DashboardView({ onNavigate }: { onNavigate: (s: any) => void }) {
  const { profile, organization } = useAuth()
  const orgId = organization?.id || ''
  const capas = useQmsStore(useShallow(s => s.capas)).filter(c => c.organizationId === orgId)
  const ncrs = useQmsStore(useShallow(s => s.ncrs)).filter(n => n.organizationId === orgId)
  const deviations = useQmsStore(useShallow(s => s.deviations)).filter(d => d.organizationId === orgId)
  const changeControls = useQmsStore(useShallow(s => s.changeControls)).filter(c => c.organizationId === orgId)
  const audits = useQmsStore(useShallow(s => s.audits)).filter(a => a.organizationId === orgId)
  const risks = useQmsStore(useShallow(s => s.risks)).filter(r => r.organizationId === orgId)
  const trainings = useQmsStore(useShallow(s => s.trainings)).filter(t => t.organizationId === orgId)
  const batchRecords = useQmsStore(useShallow(s => s.batchRecords)).filter(b => b.organizationId === orgId)
  const suppliers = useQmsStore(useShallow(s => s.suppliers)).filter(s => s.organizationId === orgId)
  const documents = useQmsStore(useShallow(s => s.documents)).filter(d => d.organizationId === orgId)
  const auditTrails = useQmsStore(useShallow(s => s.auditTrails)).filter(a => a.organizationId === orgId).slice(0, 8)

  const industryConfig = organization?.settings.industry_type ? INDUSTRY_CONFIG[organization.settings.industry_type] : INDUSTRY_CONFIG.medical_device
  const firstName = profile?.fullName.split(' ')[0] || ''

  // KPIs
  const openCapas = capas.filter(c => c.status !== 'Closed').length
  const overdueCapas = capas.filter(c => c.status !== 'Closed' && c.dueDate && new Date(c.dueDate) < new Date()).length
  const openNcrs = ncrs.filter(n => n.status !== 'Closed').length
  const criticalNcrs = ncrs.filter(n => n.severity === 'Critical').length
  const openDeviations = deviations.filter(d => d.status !== 'Closed').length
  const pendingQaDeviations = deviations.filter(d => d.status === 'Pending QA Review').length
  const openChangeControls = changeControls.filter(c => !['Completed', 'Rejected'].includes(c.status)).length
  const overdueTraining = trainings.filter(t => t.status !== 'Completed' && t.dueDate && new Date(t.dueDate) < new Date()).length
  const approvedDocs = documents.filter(d => d.status === 'Approved' || d.status === 'Effective').length
  const inReviewDocs = documents.filter(d => d.status === 'Under Review').length
  const releasedBatches = batchRecords.filter(b => b.status === 'Released').length
  const qualifiedSuppliers = suppliers.filter(s => s.status === 'Qualified').length
  const activeRisks = risks.filter(r => r.riskLevel === 'High' || r.riskLevel === 'Critical').length

  // Compliance score (weighted by industry)
  const complianceData = buildComplianceData({ documents, capas, ncrs, audits, training: trainings as any, risks, batchRecords, suppliers, changeControls, deviations })
  const w = industryConfig.complianceWeights
  const docCompliance = documents.length === 0 ? 100 : Math.round((approvedDocs / documents.length) * 100)
  const capaCompliance = capas.length === 0 ? 100 : Math.round((capas.filter(c => c.status === 'Closed').length / capas.length) * 100)
  const trainingCompliance = trainings.length === 0 ? 100 : Math.round((trainings.filter((t: any) => t.status === 'Completed').length / trainings.length) * 100)
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

  const complianceColor = complianceScore >= 80 ? 'text-green-600' : complianceScore >= 60 ? 'text-amber-600' : 'text-red-600'
  const complianceBg = complianceScore >= 80 ? 'bg-green-500' : complianceScore >= 60 ? 'bg-amber-500' : 'bg-red-500'

  // Charts data
  const capaStatusCounts = ['Open', 'Investigation', 'Implementation', 'Effectiveness Check', 'Closed'].map(s => ({
    status: s, count: capas.filter(c => c.status === s).length
  }))
  const ncrTypeCounts = ['Product', 'Process', 'System', 'Supplier', 'OOS', 'OOT'].map(t => ({
    type: t, count: ncrs.filter(n => n.ncrType === t).length
  }))
  const riskLevelCounts = ['Low', 'Medium', 'High', 'Critical'].map(l => ({
    level: l, count: risks.filter(r => r.riskLevel === l).length
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bonjour, {firstName}</h1>
          <p className="text-muted-foreground text-sm">
            {organization?.name} · {industryConfig.label} · {profile?.jobTitle || profile?.role}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
            <ShieldCheck className="h-3 w-3 mr-1" /> {industryConfig.primaryStandard}
          </Badge>
          <Badge variant="outline">{organization?.settings.applicable_standards?.length || 0} normes</Badge>
        </div>
      </div>

      {/* Compliance gauge */}
      <Card>
        <CardContent className="p-6 flex items-center gap-6">
          <div className="relative w-32 h-32 flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" fill="none" stroke="#e2e8f0" strokeWidth="12" />
              <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="12" strokeLinecap="round"
                className={complianceColor}
                strokeDasharray={`${complianceScore * 3.14} 314`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl font-bold ${complianceColor}`}>{complianceScore}%</span>
              <span className="text-xs text-muted-foreground">Conformité</span>
            </div>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold mb-2">Score de conformité global</h3>
            <p className="text-sm text-muted-foreground mb-3">Calcul pondéré par module selon l'industrie {industryConfig.label}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              {[['Documents', docCompliance], ['CAPA', capaCompliance], ['Formation', trainingCompliance], ['Audit', auditCompliance], ['NCR', ncrCompliance], ['Risque', riskCompliance], ['Lot', batchCompliance], ['Fournisseur', supplierCompliance]].map(([l, v]) => (
                <div key={l as string} className="flex flex-col">
                  <span className="text-muted-foreground">{l}</span>
                  <span className={`font-medium ${Number(v) >= 80 ? 'text-green-600' : Number(v) >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{v}%</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard title="CAPAs ouvertes" value={openCapas} subtitle={`${overdueCapas} en retard`} icon={ShieldCheck} color="text-violet-600 bg-violet-50" onClick={() => onNavigate('capa')} />
        <KpiCard title="NCRs ouvertes" value={openNcrs} subtitle={`${criticalNcrs} critiques`} icon={AlertTriangle} color="text-amber-600 bg-amber-50" onClick={() => onNavigate('ncr')} />
        <KpiCard title="Déviations ouvertes" value={openDeviations} subtitle={`${pendingQaDeviations} en attente QA`} icon={Activity} color="text-rose-600 bg-rose-50" onClick={() => onNavigate('deviations')} />
        <KpiCard title="Contrôles Changement" value={openChangeControls} subtitle="En cours" icon={ClipboardList} color="text-cyan-600 bg-cyan-50" onClick={() => onNavigate('change-control')} />
        <KpiCard title="Documents approuvés" value={approvedDocs} subtitle={`${inReviewDocs} en révision`} icon={FileText} color="text-sky-600 bg-sky-50" onClick={() => onNavigate('documents')} />
        <KpiCard title="Risques actifs" value={activeRisks} subtitle={`${risks.length} total`} icon={BarChart3} color="text-red-600 bg-red-50" onClick={() => onNavigate('risks')} />
        <KpiCard title="Lots libérés" value={releasedBatches} subtitle={`${batchRecords.length} total`} icon={Package} color="text-emerald-600 bg-emerald-50" onClick={() => onNavigate('batch-records')} />
        <KpiCard title="Fournisseurs qualifiés" value={qualifiedSuppliers} subtitle={`${suppliers.length} total`} icon={Truck} color="text-indigo-600 bg-indigo-50" onClick={() => onNavigate('suppliers')} />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-base">Statut des CAPAs</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {capaStatusCounts.map(s => (
                <div key={s.status}>
                  <div className="flex justify-between text-xs mb-1">
                    <span>{s.status}</span>
                    <span className="font-medium">{s.count}</span>
                  </div>
                  <Progress value={capas.length === 0 ? 0 : (s.count / capas.length) * 100} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">NCR par type</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {ncrTypeCounts.map(t => (
                <div key={t.type} className="flex items-center justify-between text-sm">
                  <span>{t.type}</span>
                  <Badge variant="outline">{t.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Risques par niveau</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {riskLevelCounts.map(l => (
                <div key={l.level}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className={l.level === 'Critical' ? 'text-red-600 font-medium' : l.level === 'High' ? 'text-amber-600' : ''}>{l.level}</span>
                    <span className="font-medium">{l.count}</span>
                  </div>
                  <Progress value={risks.length === 0 ? 0 : (l.count / risks.length) * 100} className={`h-2 ${l.level === 'Critical' ? '[&>div]:bg-red-500' : l.level === 'High' ? '[&>div]:bg-amber-500' : l.level === 'Medium' ? '[&>div]:bg-yellow-400' : '[&>div]:bg-green-500'}`} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> Activité récente (piste d'audit)</CardTitle>
          <CardDescription>Dernières actions enregistrées (chaîne HMAC-SHA256)</CardDescription>
        </CardHeader>
        <CardContent>
          {auditTrails.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune activité</p>
          ) : (
            <div className="space-y-2">
              {auditTrails.map(a => (
                <div key={a.id} className="flex items-center justify-between border-b last:border-0 pb-2 last:pb-0 text-sm">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Badge variant="secondary" className="text-xs">{a.auditAction}</Badge>
                    <span className="text-xs text-muted-foreground">{a.tableName}</span>
                    <span className="truncate text-xs">{a.userEmail || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>#{a.sequenceNumber}</span>
                    <span>{fmtDateTime(a.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function KpiCard({ title, value, subtitle, icon: Icon, color, onClick }: any) {
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          </div>
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
