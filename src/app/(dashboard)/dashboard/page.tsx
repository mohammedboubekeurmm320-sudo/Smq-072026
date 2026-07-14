'use client'

import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'
import { useDashboardKpis, useDeadlines } from '@/hooks/useQmsQuery'
import { KpiGrid } from '@/components/dashboard/KpiCards'
import { StatusPieChart, StatusBarChart, ComplianceGauge } from '@/components/dashboard/StatusCharts'
import { DeadlinesPanel } from '@/components/dashboard/DeadlinesPanel'
import { ShieldCheck } from 'lucide-react'

export default function DashboardPage() {
  const router = useRouter()
  const { user, currentOrgName } = useAuth()
  const { data: kpiData, isLoading: kpiLoading } = useDashboardKpis()
  const { data: deadlinesData, isLoading: deadlinesLoading } = useDeadlines(14)

  const kpis = kpiData?.kpis || kpiData?.data?.kpis || {}
  const complianceScore = kpiData?.complianceScore || kpiData?.data?.complianceScore || 0
  const charts = kpiData?.charts || kpiData?.data?.charts || {}
  const deadlines = deadlinesData?.data || deadlinesData || []

  const firstName = user?.full_name?.split(' ')[0] || ''

  const handleNavigate = (slug: string) => {
    router.push(`/qms/${slug}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Bonjour, {firstName || 'Utilisateur'}
          </h1>
          <p className="text-muted-foreground text-sm">
            {currentOrgName || 'Organisation'} · Système de Management de la Qualité
          </p>
        </div>
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 w-fit">
          <ShieldCheck className="h-3 w-3 mr-1" /> ISO 13485:2016
        </Badge>
      </div>

      {/* Compliance Gauge */}
      <ComplianceGauge score={complianceScore} loading={kpiLoading} />

      {/* KPI Grid */}
      <KpiGrid kpisData={kpis} onNavigate={handleNavigate} />

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatusPieChart
          title="CAPAs par statut"
          data={charts.capaStatusCounts || []}
          loading={kpiLoading}
        />
        <StatusBarChart
          title="NCRs par type"
          data={(charts.ncrTypeCounts || []).map((n: any) => ({ name: n.type, value: n.count }))}
          loading={kpiLoading}
        />
        <StatusBarChart
          title="Risques par niveau"
          data={(charts.riskLevelCounts || []).map((r: any) => ({ name: r.level, value: r.count }))}
          loading={kpiLoading}
          color="#f97316"
        />
      </div>

      {/* Deadlines Panel */}
      <DeadlinesPanel
        deadlines={deadlines}
        loading={deadlinesLoading}
      />
    </div>
  )
}