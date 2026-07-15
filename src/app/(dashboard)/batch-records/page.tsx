'use client'

import { useState, useCallback } from 'react'
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
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import {
  Plus, ArrowLeft, Search, ChevronLeft, ChevronRight,
  Package, ChevronDown, ChevronUp, CheckCircle2, XCircle,
  Clock, Loader2, ShieldAlert, FileText, User,
} from 'lucide-react'
import type { BatchStatus, BatchStepStatus, BatchStep, RawMaterial, BatchSizeUnit, BatchStepType } from '@/types/qms'

// ─── Helpers ────────────────────────────────────────────────────────────────

const STEP_STATUS_ICON: Record<BatchStepStatus, React.ReactNode> = {
  Pending: <Clock className="h-4 w-4 text-slate-400" />,
  'In Progress': <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />,
  Completed: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  Failed: <XCircle className="h-4 w-4 text-red-600" />,
}

const STEP_STATUS_STYLES: Record<BatchStepStatus, string> = {
  Pending: 'bg-slate-100 text-slate-700',
  'In Progress': 'bg-blue-100 text-blue-700',
  Completed: 'bg-green-100 text-green-700',
  Failed: 'bg-red-100 text-red-700',
}

const MATERIAL_STATUS_STYLES: Record<string, string> = {
  Verified: 'bg-green-100 text-green-700',
  Pending: 'bg-amber-100 text-amber-700',
  Rejected: 'bg-red-100 text-red-700',
}

const UNIT_LABELS: Record<BatchSizeUnit, string> = {
  vials: 'flacons',
  units: 'unités',
  tablets: 'comprimés',
  kg: 'kg',
  liters: 'litres',
}

const fmtDate = (d: string) => { try { return new Date(d).toLocaleDateString('fr-FR') } catch { return '—' } }

// ─── Component ──────────────────────────────────────────────────────────────

export default function BatchRecordView() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [page, setPage] = useState(1)

  const { items, loading, refetch } = useModule('batch-records')

  // Detail
  const [selected, setSelected] = useState<any | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [steps, setSteps] = useState<BatchStep[]>([])
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([])
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set())

  // Step interaction
  const [stepValues, setStepValues] = useState<Record<string, string>>({})
  const [stepSigModal, setStepSigModal] = useState<{ open: boolean; stepId: string; stepName: string }>({ open: false, stepId: '', stepName: '' })
  const [savingStep, setSavingStep] = useState(false)

  // Workflow
  const [sigModal, setSigModal] = useState<{ open: boolean; targetStatus: string }>({ open: false, targetStatus: '' })
  const [transitioning, setTransitioning] = useState(false)

  // ── Filtered ──
  const filtered = items.filter((b: any) => {
    if (statusFilter !== 'ALL' && b.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (b.batch_number || '').toLowerCase().includes(q) || (b.product_name || '').toLowerCase().includes(q) || (b.product_code || '').toLowerCase().includes(q)
    }
    return true
  })

  const pageSize = 15
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize)

  // ── Load detail ──
  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true)
    setSelected(null)
    try {
      const m = api.module('batch-records')
      const item = await m.getById(id)
      setSelected(item)
      // Load steps
      try {
        const s = await apiGet<BatchStep[]>(`/api/batch-records/${id}/steps`)
        setSteps(Array.isArray(s) ? s : [])
      } catch { setSteps([]) }
      // Raw materials
      setRawMaterials(Array.isArray(item.raw_materials) ? item.raw_materials : [])
    } catch { setSelected(null) }
    finally { setDetailLoading(false) }
  }, [])

  // ── Toggle step expansion ──
  const toggleStep = (stepId: string) => {
    setExpandedSteps(prev => {
      const next = new Set(prev)
      if (next.has(stepId)) next.delete(stepId)
      else next.add(stepId)
      return next
    })
  }

  // ── Complete step with signature ──
  const handleStepComplete = async (password: string, hash: string) => {
    if (!selected || !stepSigModal.stepId) return
    setSavingStep(true)
    setStepSigModal({ open: false, stepId: '', stepName: '' })
    try {
      const actualVal = stepValues[stepSigModal.stepId] || ''
      await apiPost(`/api/batch-records/${selected.id}/steps`, {
        stepId: stepSigModal.stepId,
        actualValue: actualVal,
        status: 'Completed',
        signatureHash: hash,
      })
      setSteps(prev => prev.map(s => s.id === stepSigModal.stepId ? { ...s, actualValue: actualVal, status: 'Completed' as BatchStepStatus, signatureHash: hash, performedAt: new Date().toISOString() } : s))
    } catch (e: any) { alert(e.message) }
    finally { setSavingStep(false) }
  }

  // ── Transition ──
  const handleTransition = async (targetStatus: string, password?: string, hash?: string) => {
    if (!selected) return
    setTransitioning(true)
    setSigModal({ open: false, targetStatus: '' })
    try {
      const m = api.module('batch-records')
      await m.transition(selected.id, targetStatus, password, hash)
      await loadDetail(selected.id)
      refetch()
    } catch (e: any) { alert(e.message) }
    finally { setTransitioning(false) }
  }

  const goBack = () => { setSelected(null); setSteps([]); setRawMaterials([]); setExpandedSteps(new Set()) }

  // ──────────────────────────────────────────────────────────────────────────
  // DETAIL VIEW
  // ──────────────────────────────────────────────────────────────────────────
  if (selected) {
    const flowSteps = getFlowSteps('batch-records', selected.status)
    const completedSteps = steps.filter(s => s.status === 'Completed').length
    const progressPct = steps.length > 0 ? Math.round((completedSteps / steps.length) * 100) : 0

    const getNextStatuses = () => {
      // Can submit for QA review only if all steps completed
      if (selected.status === 'In Progress' && completedSteps < steps.length && steps.length > 0) return []
      const idx = flowSteps.findIndex(s => s.isCurrent)
      if (idx >= 0 && idx < flowSteps.length - 1) return [flowSteps[idx + 1]]
      return []
    }
    const nextStatuses = getNextStatuses()

    return (
      <div className="space-y-6">
        <button onClick={goBack} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> Retour à la liste
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge variant="outline" className="font-mono text-xs">{selected.batch_number || selected.id}</Badge>
              <Badge className={getStatusColor(selected.status)}>{selected.status}</Badge>
            </div>
            <h1 className="text-xl font-bold">{selected.product_name || 'Lot sans nom'}</h1>
          </div>
          <div className="flex gap-2">
            {nextStatuses.map(ns => {
              const needsSig = isESigRequired('batch-records', ns)
              return (
                <Button key={ns} size="sm" disabled={transitioning} onClick={() => {
                  if (needsSig) setSigModal({ open: true, targetStatus: ns })
                  else handleTransition(ns)
                }}>
                  {transitioning && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  {needsSig && <ShieldAlert className="h-4 w-4 mr-1" />}
                  {ns === 'Released' ? 'Libérer le lot' : ns === 'Rejected' ? 'Rejeter' : ns}
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

        {/* Product Info + Progress */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Package className="h-4 w-4" /> Informations produit</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Code produit</span><span className="font-medium">{selected.product_code || '—'}</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Nom du produit</span><span className="font-medium">{selected.product_name || '—'}</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Taille du lot</span><span className="font-medium">{selected.batch_size ?? '—'} {UNIT_LABELS[selected.size_unit as BatchSizeUnit] || selected.size_unit || ''}</span></div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Date de fabrication</span><span className="font-medium">{fmtDate(selected.manufacturing_date || selected.created_at)}</span></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Progression des étapes</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">{completedSteps} / {steps.length} étapes</span>
                <span className="text-sm font-bold">{progressPct}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
              </div>
              {steps.length > 0 && selected.status === 'In Progress' && completedSteps < steps.length && (
                <p className="text-xs text-amber-600 mt-2">Complétez toutes les étapes avant de soumettre pour revue QA.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Raw Materials */}
        {rawMaterials.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Matières premières</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground border-b">
                      <th className="text-left p-2">Matière</th>
                      <th className="text-left p-2">N° de lot</th>
                      <th className="text-left p-2">Fournisseur</th>
                      <th className="text-left p-2">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rawMaterials.map((rm, idx) => (
                      <tr key={idx} className="border-b last:border-0">
                        <td className="p-2 font-medium">{rm.material}</td>
                        <td className="p-2 font-mono text-xs">{rm.lotNumber}</td>
                        <td className="p-2">{rm.supplier || '—'}</td>
                        <td className="p-2"><Badge variant="outline" className={`text-xs ${MATERIAL_STATUS_STYLES[rm.status] || ''}`}>{rm.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Manufacturing Steps */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><FileText className="h-4 w-4" /> Étapes de fabrication ({steps.length})</CardTitle></CardHeader>
          <CardContent>
            {steps.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Aucune étape définie pour ce lot.</p>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {steps.sort((a, b) => a.stepOrder - b.stepOrder).map((step) => {
                  const isExpanded = expandedSteps.has(step.id)
                  const canComplete = selected.status === 'In Progress' && step.status !== 'Completed' && step.status !== 'Failed'
                  return (
                    <div key={step.id} className="border rounded-lg">
                      <button className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/50 transition-colors rounded-lg" onClick={() => toggleStep(step.id)}>
                        <span className="text-xs font-mono text-muted-foreground w-6">{step.stepOrder}.</span>
                        {STEP_STATUS_ICON[step.status]}
                        <span className="flex-1 font-medium text-sm">{step.stepName}</span>
                        <Badge variant="outline" className="text-xs">{step.stepType}</Badge>
                        <Badge variant="outline" className={`text-xs ${STEP_STATUS_STYLES[step.status]}`}>{step.status}</Badge>
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </button>
                      {isExpanded && (
                        <div className="px-3 pb-3 space-y-3 border-t pt-3">
                          {step.instructions && (
                            <div>
                              <Label className="text-xs text-muted-foreground">Instructions</Label>
                              <p className="text-sm mt-1 bg-muted/50 rounded p-2">{step.instructions}</p>
                            </div>
                          )}
                          {step.expectedValue && (
                            <div className="flex items-center gap-4 text-sm">
                              <div><span className="text-muted-foreground">Valeur attendue :</span> <span className="font-medium">{step.expectedValue}</span></div>
                            </div>
                          )}
                          {step.actualValue && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Valeur réelle :</span> <span className="font-medium">{step.actualValue}</span>
                            </div>
                          )}
                          {step.status === 'Completed' && step.performedAt && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <User className="h-3 w-3" /> Complété le {fmtDate(step.performedAt)} {step.signatureHash && '✓ Signé'}
                            </p>
                          )}
                          {canComplete && (
                            <div className="flex items-end gap-3">
                              <div className="flex-1">
                                <Label className="text-xs">Valeur réelle</Label>
                                <Input className="mt-1" placeholder="Saisir la valeur mesurée..."
                                  value={stepValues[step.id] || ''} onChange={e => setStepValues(prev => ({ ...prev, [step.id]: e.target.value }))} />
                              </div>
                              <Button size="sm" disabled={savingStep} onClick={() => setStepSigModal({ open: true, stepId: step.id, stepName: step.stepName })}>
                                <ShieldAlert className="h-4 w-4 mr-1" /> Signer &amp; Compléter
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step E-Signature Modal */}
        <ElectronicSignatureModal
          open={stepSigModal.open}
          title={`Compléter l'étape : ${stepSigModal.stepName}`}
          description="Signez électroniquement la complétion de cette étape de fabrication."
          recordId={selected.id}
          recordType="batch_record_step"
          purpose="verification"
          onConfirm={handleStepComplete}
          onCancel={() => setStepSigModal({ open: false, stepId: '', stepName: '' })}
        />

        {/* Batch Transition E-Signature Modal */}
        <ElectronicSignatureModal
          open={sigModal.open}
          title={sigModal.targetStatus === 'Released' ? 'Libération du lot' : `Transition vers : ${sigModal.targetStatus}`}
          description={sigModal.targetStatus === 'Released'
            ? 'Confirmez la libération de ce lot de fabrication avec votre signature électronique.'
            : `Confirmez la transition vers "${sigModal.targetStatus}" avec votre signature électronique.`}
          recordId={selected.id}
          recordType="batch_record"
          purpose={sigModal.targetStatus === 'Rejected' ? 'rejection' : 'approval'}
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
          <h1 className="text-2xl font-bold">Dossiers de lot</h1>
          <p className="text-sm text-muted-foreground">Gestion des dossiers de lot et étapes de fabrication · {items.length} lot(s)</p>
        </div>
        <Button onClick={() => router.push('/qms/batch-records/new')}>
          <Plus className="h-4 w-4 mr-2" /> Nouveau lot
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher par n° de lot, code ou nom de produit..." value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1) }}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Statut" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les statuts</SelectItem>
                <SelectItem value="In Progress">En cours</SelectItem>
                <SelectItem value="Pending QA Review">En attente revue QA</SelectItem>
                <SelectItem value="Released">Libéré</SelectItem>
                <SelectItem value="Rejected">Rejeté</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      {loading ? (
        <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}</div>
      ) : paged.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-4">Aucun dossier de lot trouvé</p>
            <Button variant="outline" onClick={() => router.push('/qms/batch-records/new')}>
              <Plus className="h-4 w-4 mr-2" /> Créer le premier
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3">
            {paged.map((b: any) => (
              <Card key={b.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => loadDetail(b.id)}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-muted shrink-0">
                      <Package className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge variant="outline" className="font-mono text-xs">{b.batch_number || b.id}</Badge>
                        <Badge className={getStatusColor(b.status)}>{b.status}</Badge>
                      </div>
                      <h3 className="font-medium">{b.product_name || '—'}</h3>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        {b.product_code && <span>Code : {b.product_code}</span>}
                        {b.batch_size != null && <span>Lot : {b.batch_size} {UNIT_LABELS[b.size_unit as BatchSizeUnit] || b.size_unit || ''}</span>}
                        <span>{fmtDate(b.created_at)}</span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
                  </div>
                </CardContent>
              </Card>
            ))}
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