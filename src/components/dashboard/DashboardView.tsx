'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api-client'
import { useApiData } from '@/hooks/useApiData'
import { INDUSTRY_CONFIG } from '@/types/qms'
import { Activity, AlertTriangle, ClipboardList, ShieldCheck, FileText, CheckCircle2, Users, Package, Truck, BarChart3, TrendingUp, Clock } from 'lucide-react'
import { fmtDate, fmtDateTime } from '@/lib/ui-labels'

interface DashboardData {
  session: any
  kpis: {
    openCapas: number; overdueCapas: number; openNcrs: number; criticalNcrs: number
    openDeviations: number; openChangeControls: number; approvedDocs: number; inReviewDocs: number
    releasedBatches: number; qualifiedSuppliers: number; activeRisks: number; overdueTraining: number
    totalDocs: number; totalCapas: number; totalNcrs: number; totalAudits: number; totalRisks: number
    totalTrainings: number; totalBatchRecords: number; totalSuppliers: number; totalDeviations: number
    totalChangeControls: number; totalProfiles: number
  }
  complianceScore: number
  complianceBreakdown: { documents: number; capas: number; training: number; audits: number; ncrs: number; risks: number; batchRecords: number; suppliers: number }
  charts: { capaStatusCounts: { status: string; count: number }[]; ncrTypeCounts: { type: string; count: number }[]; riskLevelCounts: { level: string; count: number }[] }
  recentActivity: any[]
  profiles: any[]
  industryConfig: { label: string; primaryStandard: string }
}

export function DashboardView({ onNavigate }: { onNavigate: (s: any) => void }) {
  const { profile, organization } = useAuth()
  const { data, loading } = useApiData<DashboardData>(() => api.dashboard())

  if (loading || !data) {
    return <div className="flex items-center justify-center py-20"><div className="animate-pulse text-muted-foreground">Chargement du tableau de bord…</div></div>
  }

  const k = data.kpis
  const firstName = profile?.fullName.split(' ')[0] || ''
  const industryConfig = INDUSTRY_CONFIG[(organization?.settings.industry_type || 'medical_device') as keyof typeof INDUSTRY_CONFIG] || INDUSTRY_CONFIG.medical_device
  const complianceScore = data.complianceScore
  const complianceColor = complianceScore >= 80 ? 'text-green-600' : complianceScore >= 60 ? 'text-amber-600' : 'text-red-600'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bonjour, {firstName}</h1>
          <p className="text-muted-foreground text-sm">
            {organization?.name} · {data.industryConfig.label} · {profile?.jobTitle || profile?.role}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
            <ShieldCheck className="h-3 w-3 mr-1" /> {data.industryConfig.primaryStandard}
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
            <p className="text-sm text-muted-foreground mb-3">Calcul pondéré par module selon l'industrie {data.industryConfig.label}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              {[['Documents', data.complianceBreakdown.documents], ['CAPA', data.complianceBreakdown.capas], ['Formation', data.complianceBreakdown.training], ['Audit', data.complianceBreakdown.audits], ['NCR', data.complianceBreakdown.ncrs], ['Risque', data.complianceBreakdown.risks], ['Lot', data.complianceBreakdown.batchRecords], ['Fournisseur', data.complianceBreakdown.suppliers]].map(([l, v]) => (
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
        <KpiCard title="CAPAs ouvertes" value={k.openCapas} subtitle={`${k.overdueCapas} en retard`} icon={ShieldCheck} color="text-violet-600 bg-violet-50" onClick={() => onNavigate('capa')} />
        <KpiCard title="NCRs ouvertes" value={k.openNcrs} subtitle={`${k.criticalNcrs} critiques`} icon={AlertTriangle} color="text-amber-600 bg-amber-50" onClick={() => onNavigate('ncr')} />
        <KpiCard title="Déviations ouvertes" value={k.openDeviations} subtitle="En cours" icon={Activity} color="text-rose-600 bg-rose-50" onClick={() => onNavigate('deviations')} />
        <KpiCard title="Contrôles Changement" value={k.openChangeControls} subtitle="En cours" icon={ClipboardList} color="text-cyan-600 bg-cyan-50" onClick={() => onNavigate('change-control')} />
        <KpiCard title="Documents approuvés" value={k.approvedDocs} subtitle={`${k.inReviewDocs} en révision`} icon={FileText} color="text-sky-600 bg-sky-50" onClick={() => onNavigate('documents')} />
        <KpiCard title="Risques actifs" value={k.activeRisks} subtitle={`${k.totalRisks} total`} icon={BarChart3} color="text-red-600 bg-red-50" onClick={() => onNavigate('risks')} />
        <KpiCard title="Lots libérés" value={k.releasedBatches} subtitle={`${k.totalBatchRecords} total`} icon={Package} color="text-emerald-600 bg-emerald-50" onClick={() => onNavigate('batch-records')} />
        <KpiCard title="Fournisseurs qualifiés" value={k.qualifiedSuppliers} subtitle={`${k.totalSuppliers} total`} icon={Truck} color="text-indigo-600 bg-indigo-50" onClick={() => onNavigate('suppliers')} />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-base">Statut des CAPAs</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.charts.capaStatusCounts.map(s => (
                <div key={s.status}>
                  <div className="flex justify-between text-xs mb-1">
                    <span>{s.status}</span>
                    <span className="font-medium">{s.count}</span>
                  </div>
                  <Progress value={k.totalCapas === 0 ? 0 : (s.count / k.totalCapas) * 100} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">NCR par type</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.charts.ncrTypeCounts.map(t => (
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
              {data.charts.riskLevelCounts.map(l => (
                <div key={l.level}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className={l.level === 'Critical' ? 'text-red-600 font-medium' : l.level === 'High' ? 'text-amber-600' : ''}>{l.level}</span>
                    <span className="font-medium">{l.count}</span>
                  </div>
                  <Progress value={k.totalRisks === 0 ? 0 : (l.count / k.totalRisks) * 100} className={`h-2 ${l.level === 'Critical' ? '[&>div]:bg-red-500' : l.level === 'High' ? '[&>div]:bg-amber-500' : l.level === 'Medium' ? '[&>div]:bg-yellow-400' : '[&>div]:bg-green-500'}`} />
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
          {data.recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune activité</p>
          ) : (
            <div className="space-y-2">
              {data.recentActivity.slice(0, 8).map(a => (
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
