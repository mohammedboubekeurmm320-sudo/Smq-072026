'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/lib/store/auth'
import { Activity, Building2, CheckCircle2, ClipboardList, FileText, AlertTriangle, ShieldCheck, Users, TrendingUp, Clock, Award } from 'lucide-react'
import type { DashboardData } from '@/lib/types'
import { LABELS, fmtDate, fmtDateTime, rpnLevel } from '@/lib/ui-labels'

export function Dashboard({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-muted-foreground">Chargement du tableau de bord…</div>
      </div>
    )
  }
  if (!data) return <div className="text-muted-foreground">Erreur de chargement</div>

  const k = data.kpis
  const firstName = user?.name?.split(' ')[0] || ''

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bonjour, {firstName}</h1>
          <p className="text-muted-foreground text-sm">
            {data.organization.name} · {user?.position || LABELS.role(user?.role || '')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.standards.map(s => (
            <Badge key={s.id} variant="outline" className={s.certified ? 'border-green-300 bg-green-50 text-green-700' : ''}>
              <Award className="mr-1 h-3 w-3" />
              {s.code}
              {s.certified ? ' ✓' : ''}
            </Badge>
          ))}
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard title="Documents" value={k.documents.total} subtitle={`${k.documents.toReview} à revoir`} icon={FileText} color="text-sky-600 bg-sky-50" onClick={() => onNavigate('documents')} />
        <KpiCard title="Non-conformités" value={k.nonconformities.open} subtitle={`${k.nonconformities.total} au total`} icon={AlertTriangle} color="text-amber-600 bg-amber-50" onClick={() => onNavigate('nonconformities')} />
        <KpiCard title="CAPA ouvertes" value={k.capas.open} subtitle={`${k.capas.overdue} en retard`} icon={ClipboardList} color="text-violet-600 bg-violet-50" onClick={() => onNavigate('capas')} />
        <KpiCard title="Risques" value={k.risks.total} subtitle={`${k.risks.high} élevés`} icon={ShieldCheck} color="text-red-600 bg-red-50" onClick={() => onNavigate('risks')} />
        <KpiCard title="Audits" value={k.audits.total} subtitle={`${k.audits.planned} planifiés`} icon={CheckCircle2} color="text-emerald-600 bg-emerald-50" onClick={() => onNavigate('audits')} />
        <KpiCard title="Formations" value={k.trainings.total} subtitle={`${k.trainings.planned} planifiées`} icon={Users} color="text-indigo-600 bg-indigo-50" onClick={() => onNavigate('trainings')} />
        <KpiCard title="Fournisseurs" value={k.suppliers.total} subtitle={`${k.suppliers.approved} approuvés`} icon={Building2} color="text-cyan-600 bg-cyan-50" onClick={() => onNavigate('suppliers')} />
        <KpiCard title="Processus" value={k.processes.total} subtitle={`${k.users.total} utilisateurs`} icon={Activity} color="text-rose-600 bg-rose-50" onClick={() => onNavigate('processes')} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Documents by status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Documents par statut</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(k.documents.byStatus).length === 0 && <p className="text-sm text-muted-foreground">Aucun document</p>}
              {Object.entries(k.documents.byStatus).map(([s, n]) => (
                <div key={s} className="flex items-center justify-between text-sm">
                  <span>{LABELS.docStatus(s)}</span>
                  <Badge variant="outline">{n as number}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Risks distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Risques par criticité (RPN)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <RiskBar label="Élevé (≥80)" count={k.risks.high} total={k.risks.total} color="bg-red-500" />
              <RiskBar label="Moyen (30-79)" count={k.risks.medium} total={k.risks.total} color="bg-amber-500" />
              <RiskBar label="Faible (<30)" count={k.risks.low} total={k.risks.total} color="bg-green-500" />
            </div>
          </CardContent>
        </Card>

        {/* NCs by severity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Non-conformités par sévérité</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(k.nonconformities.bySeverity).length === 0 && <p className="text-sm text-muted-foreground">Aucune non-conformité</p>}
              {Object.entries(k.nonconformities.bySeverity).map(([s, n]) => (
                <div key={s} className="flex items-center justify-between text-sm">
                  <span>{LABELS.ncSeverity(s)}</span>
                  <Badge variant="outline">{n as number}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> Activité récente</CardTitle>
          <CardDescription>Dernières modifications sur les objets QMS</CardDescription>
        </CardHeader>
        <CardContent>
          {data.recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune activité</p>
          ) : (
            <div className="space-y-2">
              {data.recent.map((r, i) => (
                <div key={i} className="flex items-center justify-between border-b last:border-0 pb-2 last:pb-0 text-sm">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="text-xs">{r.type}</Badge>
                    <div>
                      <div className="font-medium">{r.title}</div>
                      {r.code && <div className="text-xs text-muted-foreground">{r.code}</div>}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{fmtDateTime(r.at)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function KpiCard({ title, value, subtitle, icon: Icon, color, onClick }: {
  title: string; value: number; subtitle: string; icon: any; color: string; onClick: () => void
}) {
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

function RiskBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="font-medium">{count} ({pct}%)</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
