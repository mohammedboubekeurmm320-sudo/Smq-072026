'use client'

import { useState, useEffect, useMemo } from 'react'
import { apiGet } from '@/lib/api-client'
import { useAuth } from '@/contexts/AuthContext'
import {
  ISO_13485_CHECKLIST, ICH_Q10_CHECKLIST, IVDR_CHECKLIST,
  CHECKLISTS, buildComplianceData,
  type ComplianceData, type ClauseStatus, type ClauseCategory,
} from '@/lib/compliance-checklists'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  ShieldCheck, AlertTriangle, CheckCircle2, XCircle, HelpCircle,
  BarChart3, FileText, GraduationCap, ClipboardCheck, Package,
} from 'lucide-react'

const STATUS_CONFIG: Record<ClauseStatus, { color: string; icon: any; label: string }> = {
  compliant: { color: 'text-green-600 bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800', icon: CheckCircle2, label: 'Conforme' },
  partially: { color: 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800', icon: AlertTriangle, label: 'Partiellement' },
  non_compliant: { color: 'text-red-600 bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800', icon: XCircle, label: 'Non conforme' },
  not_assessed: { color: 'text-slate-500 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700', icon: HelpCircle, label: 'Non évalué' },
}

const CATEGORY_LABELS: Record<ClauseCategory, string> = {
  quality_system: 'Système Qualité',
  management: 'Direction',
  resources: 'Ressources',
  realization: 'Réalisation',
  measurement: 'Mesure & Surveillance',
  improvement: 'Amélioration',
}

const CATEGORY_ICONS: Record<string, any> = {
  quality_system: FileText,
  management: BarChart3,
  resources: GraduationCap,
  realization: Package,
  measurement: ClipboardCheck,
  improvement: ShieldCheck,
}

export default function CompliancePage() {
  const { user: profile } = useAuth()
  const [checklistId, setChecklistId] = useState('iso13485')
  const [rawData, setRawData] = useState<ComplianceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    apiGet<ComplianceData>('/api/compliance')
      .then(data => setRawData(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const checklist = CHECKLISTS.find(c => c.id === checklistId) || ISO_13485_CHECKLIST
  const complianceData = rawData || buildComplianceData({})

  // Evaluate all clauses
  const evaluations = useMemo(() => {
    return checklist.clauses.map(clause => ({
      ...clause,
      result: clause.calculator(complianceData),
    }))
  }, [checklist, complianceData])

  // Overall score
  const overallPercent = useMemo(() => {
    if (evaluations.length === 0) return 0
    const total = evaluations.reduce((sum, e) => sum + e.result.percent, 0)
    return Math.round(total / evaluations.length)
  }, [evaluations])

  // Status distribution
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { compliant: 0, partially: 0, non_compliant: 0, not_assessed: 0 }
    for (const e of evaluations) counts[e.result.status]++
    return counts
  }, [evaluations])

  // Group by category
  const byCategory = useMemo(() => {
    const groups: Record<string, typeof evaluations> = {}
    for (const e of evaluations) {
      if (!groups[e.category]) groups[e.category] = []
      groups[e.category].push(e)
    }
    return groups
  }, [evaluations])

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Conformité Réglementaire</h1>
          <p className="text-sm text-muted-foreground">
            Évaluation de la conformité basée sur les données QMS en temps réel
          </p>
        </div>
        <Select value={checklistId} onValueChange={setChecklistId}>
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CHECKLISTS.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.standard}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Score Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="md:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Score Global</h2>
              <div className={`text-3xl font-bold ${overallPercent >= 80 ? 'text-green-600' : overallPercent >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                {overallPercent}%
              </div>
            </div>
            <Progress value={overallPercent} className="h-3" />
            <p className="text-xs text-muted-foreground mt-2">
              {checklist.name} — {evaluations.length} articles évalués
            </p>
          </CardContent>
        </Card>

        {(['compliant', 'partially', 'non_compliant', 'not_assessed'] as ClauseStatus[]).map(status => {
          const cfg = STATUS_CONFIG[status]
          const Icon = cfg.icon
          return (
            <Card key={status}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg border ${cfg.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{statusCounts[status]}</div>
                  <div className="text-xs text-muted-foreground">{cfg.label}</div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Clauses by Category */}
      {Object.entries(byCategory).map(([category, clauses]) => {
        const CatIcon = CATEGORY_ICONS[category] || FileText
        const catPercent = Math.round(clauses.reduce((s, c) => s + c.result.percent, 0) / clauses.length)

        return (
          <Card key={category}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <CatIcon className="h-4 w-4" />
                  {CATEGORY_LABELS[category as ClauseCategory] || category}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${catPercent >= 80 ? 'text-green-600' : catPercent >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                    {catPercent}%
                  </span>
                  <Badge variant="outline" className="text-xs">{clauses.length} articles</Badge>
                </div>
              </div>
              <Progress value={catPercent} className="h-1.5 mt-2" />
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {clauses.map(clause => {
                  const cfg = STATUS_CONFIG[clause.result.status]
                  const StatusIcon = cfg.icon
                  return (
                    <div key={clause.id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <Badge variant="outline" className="font-mono text-xs">{clause.clause}</Badge>
                            <h3 className="text-sm font-medium">{clause.title}</h3>
                          </div>
                          <p className="text-xs text-muted-foreground">{clause.description}</p>
                          {clause.result.evidence.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {clause.result.evidence.map((ev, i) => (
                                <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded">{ev}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="w-16 text-right">
                            <div className={`text-sm font-semibold ${clause.result.percent >= 80 ? 'text-green-600' : clause.result.percent >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                              {clause.result.percent}%
                            </div>
                          </div>
                          <div className={`p-1.5 rounded-full border ${cfg.color}`}>
                            <StatusIcon className="h-3.5 w-3.5" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}