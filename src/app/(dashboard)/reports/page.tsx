'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  ArrowLeft, BarChart3, TrendingUp, ClipboardCheck, GraduationCap,
  Shield, Truck, LayoutDashboard, Download, Calendar, Loader2, FileText,
  CheckCircle2, AlertCircle,
} from 'lucide-react'

// ─── Report types ──────────────────────────────────────────────────────────
const REPORT_TYPES = [
  {
    id: 'capa-analysis' as const,
    title: 'Analyse CAPA',
    description: 'Analyse détaillée des actions correctives et préventives : tendances, délais, efficacité.',
    icon: Shield,
    color: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400',
  },
  {
    id: 'ncr-trends' as const,
    title: 'Tendances NCR',
    description: 'Évolution des non-conformités par type, sévérité et département sur une période donnée.',
    icon: TrendingUp,
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  },
  {
    id: 'audit-summary' as const,
    title: 'Résumé des audits',
    description: 'Synthèse des audits internes et externes : constats, conformité, plans d\'action.',
    icon: ClipboardCheck,
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
  },
  {
    id: 'training-matrix' as const,
    title: 'Matrice de formation',
    description: 'Vue d\'ensemble des compétences, formations réalisées et formations en retard.',
    icon: GraduationCap,
    color: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400',
  },
  {
    id: 'risk-register' as const,
    title: 'Registre des risques',
    description: 'Inventaire complet des risques avec niveaux RPN et mesures de mitigation.',
    icon: BarChart3,
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400',
  },
  {
    id: 'supplier-scorecard' as const,
    title: 'Scorecard fournisseurs',
    description: 'Évaluation des performances fournisseurs : qualité, délais, conformité.',
    icon: Truck,
    color: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-400',
  },
  {
    id: 'compliance-dashboard' as const,
    title: 'Tableau de conformité',
    description: 'Vue consolidée du taux de conformité par exigence normative et par module.',
    icon: LayoutDashboard,
    color: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
  },
]

const FORMAT_ICONS: Record<string, string> = {
  pdf: '📄',
  csv: '📊',
  html: '🌐',
}

// ─── State for last generation timestamps ──────────────────────────────────
interface LastGenerated {
  [reportId: string]: string
}

export default function ReportsView() {
  const router = useRouter()
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [exportFormat, setExportFormat] = useState('pdf')
  const [generating, setGenerating] = useState<string | null>(null)
  const [lastGenerated, setLastGenerated] = useState<LastGenerated>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleGenerate = async (reportId: string) => {
    // Clear previous error for this report
    setErrors(prev => {
      const next = { ...prev }
      delete next[reportId]
      return next
    })
    setGenerating(reportId)

    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          type: reportId,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          format: exportFormat,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `Erreur HTTP ${res.status}`)
      }

      // Download the file
      const contentDisposition = res.headers.get('content-disposition')
      let filename = `rapport_${reportId}_${new Date().toISOString().slice(0, 10)}.${exportFormat}`
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/)
        if (match) filename = match[1]
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      // Update last generated timestamp
      setLastGenerated(prev => ({
        ...prev,
        [reportId]: new Date().toISOString(),
      }))

      const reportTitle = REPORT_TYPES.find(r => r.id === reportId)?.title || reportId

    } catch (err: any) {
      const msg = err.message || 'Erreur lors de la génération'
      setErrors(prev => ({ ...prev, [reportId]: msg }))

    } finally {
      setGenerating(null)
    }
  }

  const fmtDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('fr-FR') } catch { return '—' }
  }

  const fmtDateTime = (d: string) => {
    try { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) } catch { return '—' }
  }

  const totalReports = REPORT_TYPES.length

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
          <p className="text-sm text-muted-foreground">Centre de rapports et analyses qualité — ISO 13485 §4.2.2</p>
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
              <p className="text-2xl font-bold">{Object.keys(lastGenerated).length}</p>
              <p className="text-xs text-muted-foreground">Rapports générés cette session</p>
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
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
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
          const isGenerating = generating === rpt.id
          const lastGen = lastGenerated[rpt.id]
          const errorMsg = errors[rpt.id]

          return (
            <Card key={rpt.id} className={`hover:shadow-md transition-shadow ${errorMsg ? 'border-red-200 dark:border-red-900' : ''}`}>
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
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <Download className="h-3 w-3 mr-1" />
                    )}
                    {isGenerating ? 'Génération...' : 'Générer'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <CardTitle className="text-base mb-1">{rpt.title}</CardTitle>
                <CardDescription className="text-xs line-clamp-2 mb-3">{rpt.description}</CardDescription>
                {lastGen ? (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" />
                    Dernière génération : {fmtDateTime(lastGen)}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {FORMAT_ICONS[exportFormat]} Pas encore généré cette session
                  </p>
                )}
                {errorMsg && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {errorMsg}
                  </p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}