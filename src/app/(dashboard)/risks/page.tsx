'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useModule } from '@/hooks/useModule'
import { api, apiGet, apiPost } from '@/lib/api-client'
import { getStatusColor } from '@/lib/status-colors'
import { getFlowSteps, isESigRequired } from '@/lib/status-flows'
import { ElectronicSignatureModal } from '@/components/shared/ElectronicSignatureModal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import {
  Plus, ArrowLeft, Search, ChevronLeft, ChevronRight,
  AlertTriangle, Shield, ShieldAlert, Loader2, Save,
} from 'lucide-react'
import type {
  RiskStatus, RiskLevel, RiskCategory, RiskAcceptability,
  ControlType, calcRpn, rpnToLevel,
} from '@/types/qms'

// ─── Helpers ────────────────────────────────────────────────────────────────

function calcRpnFn(s: number, p: number, d: number): number {
  return Math.max(1, Math.min(5, s)) * Math.max(1, Math.min(5, p)) * Math.max(1, Math.min(5, d))
}

function rpnToLevelFn(rpn: number): RiskLevel {
  if (rpn <= 20) return 'Low'
  if (rpn <= 60) return 'Medium'
  if (rpn <= 100) return 'High'
  return 'Critical'
}

const RISK_LEVEL_STYLES: Record<RiskLevel, string> = {
  Low: 'bg-green-100 text-green-700 border-green-300',
  Medium: 'bg-amber-100 text-amber-700 border-amber-300',
  High: 'bg-orange-100 text-orange-700 border-orange-300',
  Critical: 'bg-red-100 text-red-700 border-red-300',
}

const ACCEPTABILITY_STYLES: Record<RiskAcceptability, string> = {
  acceptable: 'bg-green-100 text-green-700',
  ALARP: 'bg-amber-100 text-amber-700',
  unacceptable: 'bg-red-100 text-red-700',
}

const CONTROL_TYPE_LABELS: Record<ControlType, string> = {
  inherent_safe_design: 'Conception intrinsèquement sûre',
  protective_measures: 'Mesures de protection',
  information_for_safety: 'Informations pour la sécurité',
}

const SCALE_OPTIONS = [1, 2, 3, 4, 5].map(n => ({ value: String(n), label: String(n) }))

const fmtDate = (d: string) => { try { return new Date(d).toLocaleDateString('fr-FR') } catch { return '—' } }

// ─── Risk Matrix Heatmap ────────────────────────────────────────────────────

function getMatrixColor(prob: number, severity: number): string {
  const rpn = prob * severity
  if (rpn >= 16) return 'bg-red-500 text-white'
  if (rpn >= 10) return 'bg-orange-400 text-white'
  if (rpn >= 5) return 'bg-amber-300 text-amber-900'
  return 'bg-green-300 text-green-900'
}

function RiskMatrixHeatmap() {
  const pLabels = ['', 'Très rare', 'Rare', 'Occasionnel', 'Probable', 'Fréquent']
  const sLabels = ['', 'Négligeable', 'Mineur', 'Modéré', 'Majeur', 'Catastrophique']

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Matrice des risques (5×5)</CardTitle></CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-center text-xs">
            <thead>
              <tr>
                <th className="p-1.5 w-10"></th>
                {sLabels.slice(1).map(s => <th key={s} className="p-1.5 font-medium text-muted-foreground">{s}</th>)}
                <th className="p-1.5"></th>
              </tr>
            </thead>
            <tbody>
              {[5,4,3,2,1].map(p => (
                <tr key={p}>
                  <td className="p-1.5 font-medium text-muted-foreground text-right">{pLabels[p]}</td>
                  {[1,2,3,4,5].map(s => (
                    <td key={`${p}-${s}`} className={`p-1.5 rounded-sm font-bold ${getMatrixColor(p, s)}`}>
                      {p * s}
                    </td>
                  ))}
                  <td className="p-1.5 font-medium text-muted-foreground pl-2">{pLabels[p]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">Probabilité (↑) × Sévérité (→) = RPN simplifié</p>
      </CardContent>
    </Card>
  )
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function RiskView() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')
  const [levelFilter, setLevelFilter] = useState<string>('ALL')

  const { items, loading, refetch } = useModule('risks')

  // Detail
  const [selected, setSelected] = useState<any | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // FMEA state
  const [initialS, setInitialS] = useState(3)
  const [initialP, setInitialP] = useState(3)
  const [initialD, setInitialD] = useState(3)
  const [residualS, setResidualS] = useState(2)
  const [residualP, setResidualP] = useState(2)
  const [residualD, setResidualD] = useState(2)
  const [riskAcceptability, setRiskAcceptability] = useState<RiskAcceptability>('ALARP')
  const [saving, setSaving] = useState(false)
  const [fmeaData, setFmeaData] = useState<any>(null)

  // Workflow
  const [sigModal, setSigModal] = useState<{ open: boolean; targetStatus: string }>({ open: false, targetStatus: '' })
  const [transitioning, setTransitioning] = useState(false)

  // ── Computed RPNs ──
  const initialRpn = useMemo(() => calcRpnFn(initialS, initialP, initialD), [initialS, initialP, initialD])
  const residualRpn = useMemo(() => calcRpnFn(residualS, residualP, residualD), [residualS, residualP, residualD])
  const initialLevel = useMemo(() => rpnToLevelFn(initialRpn), [initialRpn])
  const residualLevel = useMemo(() => rpnToLevelFn(residualRpn), [residualRpn])

  // ── Filtered items ──
  const filtered = items.filter((r: any) => {
    if (categoryFilter !== 'ALL' && r.risk_category !== categoryFilter) return false
    if (levelFilter !== 'ALL') {
      const rpn = (r.severity || 3) * (r.probability || 3) * (r.detectability || 3)
      const lvl = rpnToLevelFn(rpn)
      if (lvl !== levelFilter) return false
    }
    if (search) {
      const q = search.toLowerCase()
      return (r.title || '').toLowerCase().includes(q) || (r.hazard_description || '').toLowerCase().includes(q) || (r.risk_number || '').toLowerCase().includes(q)
    }
    return true
  })

  const pageSize = 15
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize)
  const [page, setPage] = useState(1)

  // ── Load detail ──
  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true)
    setSelected(null)
    try {
      const m = api.module('risks')
      const item = await m.getById(id)
      setSelected(item)
      setInitialS(item.severity || 3)
      setInitialP(item.probability || 3)
      setInitialD(item.detectability || 3)
      setResidualS(item.residual_severity || 2)
      setResidualP(item.residual_probability || 2)
      setResidualD(item.residual_detectability || 2)
      setRiskAcceptability(item.risk_acceptability || 'ALARP')
      try {
        const f = await apiGet(`/api/risks/${id}/fmea`)
        setFmeaData(f)
      } catch { setFmeaData(null) }
    } catch { setSelected(null) }
    finally { setDetailLoading(false) }
  }, [])

  // ── Save FMEA ──
  const saveFmea = async () => {
    if (!selected) return
    setSaving(true)
    try {
      await apiPost(`/api/risks/${selected.id}/fmea`, {
        initialSeverity: initialS, initialProbability: initialP, initialDetectability: initialD,
        residualSeverity: residualS, residualProbability: residualP, residualDetectability: residualD,
        riskAcceptability,
      })
      refetch()
    } catch (e: any) { alert(e.message) }
    finally { setSaving(false) }
  }

  // ── Transition ──
  const handleTransition = async (targetStatus: string, password?: string, hash?: string) => {
    if (!selected) return
    setTransitioning(true)
    setSigModal({ open: false, targetStatus: '' })
    try {
      const m = api.module('risks')
      await m.transition(selected.id, targetStatus, password, hash)
      await loadDetail(selected.id)
      refetch()
    } catch (e: any) { alert(e.message) }
    finally { setTransitioning(false) }
  }

  const goBack = () => { setSelected(null); setFmeaData(null) }

  // ──────────────────────────────────────────────────────────────────────────
  // DETAIL VIEW
  // ──────────────────────────────────────────────────────────────────────────
  if (selected) {
    const flowSteps = getFlowSteps('risks', selected.status)

    const getNext = () => {
      const idx = flowSteps.findIndex(s => s.isCurrent)
      if (idx >= 0 && idx < flowSteps.length - 1) return [flowSteps[idx + 1]]
      return []
    }
    const nextStatuses = getNext()

    const controls: any[] = fmeaData?.controls || selected.controls || []

    return (
      <div className="space-y-6">
        <button onClick={goBack} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> Retour à la liste
        </button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge variant="outline" className="font-mono text-xs">{selected.risk_number || selected.id}</Badge>
              <Badge className={getStatusColor(selected.status)}>{selected.status}</Badge>
              <Badge variant="outline" className={RISK_LEVEL_STYLES[initialLevel]}>{initialLevel} ({initialRpn})</Badge>
            </div>
            <h1 className="text-xl font-bold">{selected.title || '—'}</h1>
            {selected.hazard_description && <p className="text-sm text-muted-foreground mt-1">{selected.hazard_description}</p>}
          </div>
          <div className="flex gap-2">
            {nextStatuses.map(ns => {
              const needsSig = isESigRequired('risks', ns)
              return (
                <Button key={ns} size="sm" disabled={transitioning} onClick={() => {
                  if (needsSig) setSigModal({ open: true, targetStatus: ns })
                  else handleTransition(ns)
                }}>
                  {transitioning && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  {ns === 'Closed' ? 'Clôturer' : ns}
                </Button>
              )
            })}
          </div>
        </div>

        {/* Workflow progress */}
        <div className="flex items-center gap-1 flex-wrap">
          {flowSteps.map((step, i) => (
            <div key={step.status} className="flex items-center gap-1">
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                step.isCurrent ? 'bg-primary text-primary-foreground' :
                step.isCompleted ? 'bg-green-100 text-green-700' :
                'bg-muted text-muted-foreground'
              }`}>
                {step.requiresESig && <ShieldAlert className="h-3 w-3" />}
                {step.status}
              </div>
              {i < flowSteps.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
            </div>
          ))}
        </div>

        <Tabs defaultValue="identification">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="identification">Identification</TabsTrigger>
            <TabsTrigger value="controls">Contrôles</TabsTrigger>
            <TabsTrigger value="residual">Évaluation résiduelle</TabsTrigger>
            <TabsTrigger value="actions">Plan d&apos;action</TabsTrigger>
            <TabsTrigger value="matrix">Matrice</TabsTrigger>
          </TabsList>

          {/* Identification Tab */}
          <TabsContent value="identification" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Identification du risque</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Description du danger</span><span className="font-medium max-w-md text-right">{selected.hazard_description || '—'}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Catégorie</span><span className="font-medium">{selected.risk_category || '—'}</span></div>
                <Separator />
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="text-center">
                    <Label className="text-xs text-muted-foreground">Sévérité initiale</Label>
                    <div className="text-2xl font-bold text-primary mt-1">{initialS}</div>
                  </div>
                  <div className="text-center">
                    <Label className="text-xs text-muted-foreground">Probabilité initiale</Label>
                    <div className="text-2xl font-bold text-primary mt-1">{initialP}</div>
                  </div>
                  <div className="text-center">
                    <Label className="text-xs text-muted-foreground">Détectabilité initiale</Label>
                    <div className="text-2xl font-bold text-primary mt-1">{initialD}</div>
                  </div>
                </div>
                <div className="text-center mt-4 p-4 rounded-lg bg-muted">
                  <Label className="text-xs text-muted-foreground">RPN initial</Label>
                  <div className="text-3xl font-bold mt-1">{initialRpn}</div>
                  <Badge variant="outline" className={RISK_LEVEL_STYLES[initialLevel]}>{initialLevel}</Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Controls Tab */}
          <TabsContent value="controls" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Contrôles existants</CardTitle></CardHeader>
              <CardContent>
                {controls.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Aucun contrôle enregistré</p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {controls.map((c: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-lg border">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">{c.description || c.name || 'Contrôle'}</p>
                            <Badge variant="outline" className="text-xs mt-1">{CONTROL_TYPE_LABELS[c.control_type as ControlType] || c.control_type || '—'}</Badge>
                          </div>
                          {c.effectiveness != null && (
                            <Badge variant="outline" className="text-xs">Efficacité : {c.effectiveness}/5</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Residual Tab */}
          <TabsContent value="residual" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Évaluation résiduelle</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Sévérité résiduelle</Label>
                    <Select value={String(residualS)} onValueChange={v => setResidualS(Number(v))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>{SCALE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Probabilité résiduelle</Label>
                    <Select value={String(residualP)} onValueChange={v => setResidualP(Number(v))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>{SCALE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Détectabilité résiduelle</Label>
                    <Select value={String(residualD)} onValueChange={v => setResidualD(Number(v))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>{SCALE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted">
                  <Label className="text-xs text-muted-foreground">RPN résiduel</Label>
                  <div className="text-3xl font-bold mt-1">{residualRpn}</div>
                  <Badge variant="outline" className={RISK_LEVEL_STYLES[residualLevel]}>{residualLevel}</Badge>
                </div>
                <div>
                  <Label>Acceptabilité du risque</Label>
                  <Select value={riskAcceptability} onValueChange={v => setRiskAcceptability(v as RiskAcceptability)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="acceptable">Acceptable</SelectItem>
                      <SelectItem value="ALARP">ALARP (aussi bas que raisonnablement possible)</SelectItem>
                      <SelectItem value="unacceptable">Inacceptable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={saveFmea} disabled={saving} className="w-full sm:w-auto">
                  {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  <Save className="h-4 w-4 mr-1" /> Sauvegarder l&apos;évaluation
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Actions Tab */}
          <TabsContent value="actions" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Plan d&apos;atténuation</CardTitle></CardHeader>
              <CardContent>
                {(!fmeaData?.actions && !selected.actions) ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Aucune action d&apos;atténuation définie</p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {(fmeaData?.actions || selected.actions || []).map((a: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">{a.description || a.action || 'Action'}</p>
                          <p className="text-xs text-muted-foreground">
                            {a.responsible && `Responsable : ${a.responsible}`}
                            {a.due_date && ` · Échéance : ${fmtDate(a.due_date)}`}
                          </p>
                        </div>
                        <Badge className={getStatusColor(a.status || 'Open')}>{a.status || 'Open'}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Matrix Tab */}
          <TabsContent value="matrix" className="mt-4">
            <RiskMatrixHeatmap />
          </TabsContent>
        </Tabs>

        <ElectronicSignatureModal
          open={sigModal.open}
          title="Transition du risque"
          description={`Confirmez la transition vers le statut "${sigModal.targetStatus}" avec votre signature électronique.`}
          recordId={selected.id}
          recordType="risk"
          purpose="approval"
          onConfirm={(pwd, hash) => handleTransition(sigModal.targetStatus, pwd, hash)}
          onCancel={() => setSigModal({ open: false, targetStatus: '' })}
        />
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────────────────────
  // LIST VIEW
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <button onClick={() => router.push('/dashboard')} className="text-sm text-muted-foreground hover:text-foreground mb-1 flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Tableau de bord
          </button>
          <h1 className="text-2xl font-bold">Gestion des risques</h1>
          <p className="text-sm text-muted-foreground">Analyse FMEA et évaluation des risques · {items.length} risque(s)</p>
        </div>
        <Button onClick={() => router.push('/qms/risks/new')}>
          <Plus className="h-4 w-4 mr-2" /> Nouveau risque
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher par titre ou description du danger..." value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }} className="pl-9" />
            </div>
            <Select value={categoryFilter} onValueChange={v => { setCategoryFilter(v); setPage(1) }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Toutes</SelectItem>
                <SelectItem value="Product">Produit</SelectItem>
                <SelectItem value="Process">Processus</SelectItem>
                <SelectItem value="System">Système</SelectItem>
                <SelectItem value="Supplier">Fournisseur</SelectItem>
              </SelectContent>
            </Select>
            <Select value={levelFilter} onValueChange={v => { setLevelFilter(v); setPage(1) }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Niveau" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous</SelectItem>
                <SelectItem value="Low">Faible</SelectItem>
                <SelectItem value="Medium">Moyen</SelectItem>
                <SelectItem value="High">Élevé</SelectItem>
                <SelectItem value="Critical">Critique</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Risk Matrix Summary */}
      <RiskMatrixHeatmap />

      {/* List */}
      {loading ? (
        <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}</div>
      ) : paged.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-4">Aucun risque trouvé</p>
            <Button variant="outline" onClick={() => router.push('/qms/risks/new')}>
              <Plus className="h-4 w-4 mr-2" /> Créer le premier
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3">
            {paged.map((r: any) => {
              const rpn = calcRpnFn(r.severity || 3, r.probability || 3, r.detectability || 3)
              const lvl = rpnToLevelFn(rpn)
              return (
                <Card key={r.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => loadDetail(r.id)}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-muted shrink-0">
                        <AlertTriangle className={`h-4 w-4 ${lvl === 'Critical' ? 'text-red-600' : lvl === 'High' ? 'text-orange-500' : 'text-amber-500'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {r.risk_number && <Badge variant="outline" className="font-mono text-xs">{r.risk_number}</Badge>}
                          <Badge className={getStatusColor(r.status)}>{r.status}</Badge>
                          <Badge variant="outline" className={RISK_LEVEL_STYLES[lvl]}>{lvl} (RPN {rpn})</Badge>
                          <Badge variant="outline" className="text-xs">{r.risk_category}</Badge>
                        </div>
                        <h3 className="font-medium truncate">{r.title || '—'}</h3>
                        {r.hazard_description && <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">{r.hazard_description}</p>}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>S: {r.severity || 3} · P: {r.probability || 3} · D: {r.detectability || 3}</span>
                          <span className="font-medium">{fmtDate(r.created_at || r.createdAt)}</span>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Page {page} / {totalPages}</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}