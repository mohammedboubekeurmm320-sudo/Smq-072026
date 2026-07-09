'use client'
import { useShallow } from 'zustand/react/shallow'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/contexts/AuthContext'
import { useQmsStore } from '@/lib/demo-store'
import { CHECKLISTS, buildComplianceData, getChecklistForIndustry, getChecklistById, statusFromPct } from '@/lib/compliance-checklists'
import { INDUSTRY_CONFIG } from '@/types/qms'
import { CheckCircle2, AlertTriangle, XCircle, Circle } from 'lucide-react'

const STATUS_LABELS = {
  compliant: { label: 'Conforme', color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle2 },
  partially: { label: 'Partiellement conforme', color: 'text-amber-600', bg: 'bg-amber-100', icon: AlertTriangle },
  non_compliant: { label: 'Non conforme', color: 'text-red-600', bg: 'bg-red-100', icon: XCircle },
  not_assessed: { label: 'Non évalué', color: 'text-slate-500', bg: 'bg-slate-100', icon: Circle },
}

const CATEGORY_LABELS: Record<string, string> = {
  quality_system: 'Système Qualité', management: 'Management', resources: 'Ressources',
  realization: 'Réalisation', measurement: 'Mesure', improvement: 'Amélioration',
}

export function ComplianceView() {
  const { organization } = useAuth()
  const orgId = organization?.id || ''
  const industry = organization?.settings.industry_type || 'medical_device'
  const defaultChecklistId = INDUSTRY_CONFIG[industry].checklistId
  const [checklistId, setChecklistId] = useState(defaultChecklistId)

  const capas = useQmsStore(useShallow(s => s.capas)).filter(c => c.organizationId === orgId)
  const ncrs = useQmsStore(useShallow(s => s.ncrs)).filter(n => n.organizationId === orgId)
  const audits = useQmsStore(useShallow(s => s.audits)).filter(a => a.organizationId === orgId)
  const trainings = useQmsStore(useShallow(s => s.trainings)).filter(t => t.organizationId === orgId)
  const risks = useQmsStore(useShallow(s => s.risks)).filter(r => r.organizationId === orgId)
  const batchRecords = useQmsStore(useShallow(s => s.batchRecords)).filter(b => b.organizationId === orgId)
  const suppliers = useQmsStore(useShallow(s => s.suppliers)).filter(s => s.organizationId === orgId)
  const documents = useQmsStore(useShallow(s => s.documents)).filter(d => d.organizationId === orgId)
  const deviations = useQmsStore(useShallow(s => s.deviations)).filter(d => d.organizationId === orgId)
  const changeControls = useQmsStore(useShallow(s => s.changeControls)).filter(c => c.organizationId === orgId)

  const data = useMemo(() => buildComplianceData({ documents, capas, ncrs, audits, training: trainings as any, risks, batchRecords, suppliers, changeControls, deviations }), [documents, capas, ncrs, audits, trainings, risks, batchRecords, suppliers, changeControls, deviations])
  const checklist = getChecklistById(checklistId) || CHECKLISTS[0]

  // Group by category
  const byCategory = checklist.clauses.reduce((acc, c) => {
    if (!acc[c.category]) acc[c.category] = []
    acc[c.category].push(c)
    return acc
  }, {} as Record<string, typeof checklist.clauses>)

  const overallScore = Math.round(checklist.clauses.reduce((sum, c) => sum + c.calculator(data).percent, 0) / checklist.clauses.length)

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><CheckCircle2 className="h-6 w-6 text-emerald-600" /> Conformité</h1>
          <p className="text-sm text-muted-foreground">Évaluation de la conformité aux normes applicables</p>
        </div>
        <Select value={checklistId} onValueChange={setChecklistId}>
          <SelectTrigger className="w-full md:w-80"><SelectValue /></SelectTrigger>
          <SelectContent>{CHECKLISTS.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-6 flex items-center gap-6">
          <div className="relative w-32 h-32 flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" fill="none" stroke="#e2e8f0" strokeWidth="12" />
              <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="12" strokeLinecap="round"
                className={overallScore >= 80 ? 'text-green-600' : overallScore >= 60 ? 'text-amber-600' : 'text-red-600'}
                strokeDasharray={`${overallScore * 3.14} 314`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl font-bold ${overallScore >= 80 ? 'text-green-600' : overallScore >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{overallScore}%</span>
              <span className="text-xs text-muted-foreground">Conformité</span>
            </div>
          </div>
          <div>
            <h3 className="font-semibold">{checklist.name}</h3>
            <p className="text-sm text-muted-foreground">{checklist.standard} · {checklist.clauses.length} clauses</p>
            <p className="text-xs text-muted-foreground mt-2">Score global = moyenne des scores par clause</p>
          </div>
        </CardContent>
      </Card>

      {Object.entries(byCategory).map(([cat, clauses]) => (
        <div key={cat}>
          <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <Badge variant="outline">{CATEGORY_LABELS[cat] || cat}</Badge>
            <span className="text-sm text-muted-foreground font-normal">{clauses.length} clauses</span>
          </h2>
          <div className="grid gap-3">
            {clauses.map(c => {
              const r = c.calculator(data)
              const statusInfo = STATUS_LABELS[r.status]
              return (
                <Card key={c.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge variant="outline" className="font-mono">{c.clause}</Badge>
                          <h4 className="font-medium">{c.title}</h4>
                          <Badge variant="outline" className={`${statusInfo.bg} ${statusInfo.color} border`}>
                            <statusInfo.icon className="h-3 w-3 mr-1" />{statusInfo.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{c.description}</p>
                        {r.evidence.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {r.evidence.map((e, i) => <Badge key={i} variant="secondary" className="text-xs">{e}</Badge>)}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${statusInfo.color}`}>{r.percent}%</div>
                      </div>
                    </div>
                    <Progress value={r.percent} className="h-2" />
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
