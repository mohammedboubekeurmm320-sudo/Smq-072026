'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiGet } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft, BarChart3, TrendingUp, ClipboardCheck, GraduationCap,
  Shield, Truck, LayoutDashboard, Download, Calendar, Loader2, FileText,
} from 'lucide-react'

// ─── Report types ──────────────────────────────────────────────────────────
const REPORT_TYPES = [
  {
    id: 'capa-analysis',
    title: 'Analyse CAPA',
    description: 'Analyse détaillée des actions correctives et préventives : tendances, délais, efficacité.',
    icon: Shield,
    color: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400',
    lastGenerated: '2025-06-20T14:00:00Z',
  },
  {
    id: 'ncr-trends',
    title: 'Tendances NCR',
    description: 'Évolution des non-conformités par type, sévérité et département sur une période donnée.',
    icon: TrendingUp,
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
    lastGenerated: '2025-06-18T10:30:00Z',
  },
  {
    id: 'audit-summary',
    title: 'Résumé des audits',
    description: 'Synthèse des audits internes et externes : constats, conformité, plans d\'action.',
    icon: ClipboardCheck,
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
    lastGenerated: '2025-06-15T16:00:00Z',
  },
  {
    id: 'training-matrix',
    title: 'Matrice de formation',
    description: 'Vue d\'ensemble des compétences, formations réalisées et formations en retard.',
    icon: GraduationCap,
    color: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400',
    lastGenerated: '2025-06-10T09:00:00Z',
  },
  {
    id: 'risk-register',
    title: 'Registre des risques',
    description: 'Inventaire complet des risques avec niveaux RPN et mesures de mitigation.',
    icon: BarChart3,
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400',
    lastGenerated: '2025-06-12T11:00:00Z',
  },
  {
    id: 'supplier-scorecard',
    title: 'Scorecard fournisseurs',
    description: 'Évaluation des performances fournisseurs : qualité, délais, conformité.',
    icon: Truck,
    color: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-400',
    lastGenerated: '2025-06-08T15:00:00Z',
  },
  {
    id: 'compliance-dashboard',
    title: 'Tableau de conformité',
    description: 'Vue consolidée du taux de conformité par exigence normative et par module.',
    icon: LayoutDashboard,
    color: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
    lastGenerated: '2025-06-22T08:00:00Z',
  },
]

const fmtDate = (d: string) => {
  try { return new Date(d).toLocaleDateString('fr-FR') } catch { return '—' }
}

export default function ReportsView() {
  const router = useRouter()
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [exportFormat, setExportFormat] = useState('csv')
  const [generating, setGenerating] = useState<string | null>(null)

  const handleGenerate = async (reportId: string) => {
    setGenerating(reportId)
    // Simulate generation
    await new Promise(r => setTimeout(r, 1500))
    setGenerating(null)
  }

  const totalReports = REPORT_TYPES.length
  const scheduledReports = 3

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <button onClick={() => router.push('/dashboard')} className="text-sm text-muted-foreground hover:text-foreground mb-1 flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Tableau de bord
          </button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" /> Rapports
          </h1>
          <p className="text-sm text-muted-foreground">Centre de rapports et analyses qualité</p>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
              <FileText className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalReports}</p>
              <p className="text-xs text-muted-foreground">Types de rapports disponibles</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-sky-100 dark:bg-sky-950 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-sky-700 dark:text-sky-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{scheduledReports}</p>
              <p className="text-xs text-muted-foreground">Rapports programmés actifs</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Date range + export format */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="flex-1">
              <Label className="text-sm">Date de début</Label>
              <Input
                type="date"
                className="mt-1 h-9"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Label className="text-sm">Date de fin</Label>
              <Input
                type="date"
                className="mt-1 h-9"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
              />
            </div>
            <div className="w-40">
              <Label className="text-sm">Format d&apos;export</Label>
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger className="mt-1 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="html">HTML</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report type cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORT_TYPES.map(rpt => {
          const Icon = rpt.icon
          return (
            <Card key={rpt.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${rpt.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => handleGenerate(rpt.id)}
                    disabled={generating === rpt.id}
                  >
                    {generating === rpt.id ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <Download className="h-3 w-3 mr-1" />
                    )}
                    Générer
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <CardTitle className="text-base mb-1">{rpt.title}</CardTitle>
                <CardDescription className="text-xs line-clamp-2 mb-3">{rpt.description}</CardDescription>
                <p className="text-xs text-muted-foreground">
                  Dernière génération : {fmtDate(rpt.lastGenerated)}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}