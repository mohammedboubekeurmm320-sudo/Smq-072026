'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useModule } from '@/hooks/useModule'
import { api, apiGet, apiPost, apiPut } from '@/lib/api-client'
import { getStatusColor } from '@/lib/status-colors'
import { getFlowSteps, canTransition, isESigRequired } from '@/lib/status-flows'
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
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import {
  Plus, ArrowLeft, Search, Building2, Truck, ClipboardCheck,
  ChevronLeft, ChevronRight, AlertTriangle, FileWarning, Eye,
  Calendar, User, Star, ShieldAlert, Save, X as XIcon, Loader2, ListChecks,
} from 'lucide-react'
import { AuditChecklist, type AuditChecklistItem } from '@/components/shared/AuditChecklist'
import type { AuditType, AuditStatus, FindingSeverity, AuditFinding } from '@/types/qms'

// ─── Helpers ────────────────────────────────────────────────────────────────

const AUDIT_TYPE_ICON: Record<string, React.ReactNode> = {
  Internal: <Building2 className="h-4 w-4" />,
  External: <ClipboardCheck className="h-4 w-4" />,
  Supplier: <Truck className="h-4 w-4" />,
}

const SEVERITY_STYLES: Record<FindingSeverity, string> = {
  Critical: 'bg-red-100 text-red-700 border-red-300',
  Major: 'bg-orange-100 text-orange-700 border-orange-300',
  Minor: 'bg-amber-100 text-amber-700 border-amber-300',
  Observation: 'bg-sky-100 text-sky-700 border-sky-300',
}

const fmtDate = (d: string) => { try { return new Date(d).toLocaleDateString('fr-FR') } catch { return '—' } }

// ─── Component ──────────────────────────────────────────────────────────────

export default function AuditView() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [page, setPage] = useState(1)

  const { items, loading, refetch } = useModule('audits')

  // Detail view
  const [selected, setSelected] = useState<any | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Findings
  const [findings, setFindings] = useState<AuditFinding[]>([])
  const [findingForm, setFindingForm] = useState({ description: '', severity: 'Minor' as FindingSeverity, referenceClause: '', correctiveActionRequired: false })
  const [showFindingDialog, setShowFindingDialog] = useState(false)
  const [savingFinding, setSavingFinding] = useState(false)

  // Workflow
  const [sigModal, setSigModal] = useState<{ open: boolean; targetStatus: string }>({ open: false, targetStatus: '' })
  const [transitioning, setTransitioning] = useState(false)

  // ── Filtered items ──
  const filtered = items.filter((a: any) => {
    if (typeFilter !== 'ALL' && a.audit_type !== typeFilter) return false
    if (statusFilter !== 'ALL' && a.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (a.title || '').toLowerCase().includes(q) || (a.audit_number || '').toLowerCase().includes(q)
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
      const m = api.module('audits')
      const item = await m.getById(id)
      setSelected(item)
      // Load findings
      try {
        const f = await apiGet<AuditFinding[]>(`/api/audits/${id}/findings`)
        setFindings(Array.isArray(f) ? f : [])
      } catch { setFindings([]) }
    } catch { setSelected(null) }
    finally { setDetailLoading(false) }
  }, [])

  // ── Add finding ──
  const handleAddFinding = async () => {
    if (!selected || !findingForm.description.trim()) return
    setSavingFinding(true)
    try {
      const f = await apiPost(`/api/audits/${selected.id}/findings`, findingForm)
      setFindings(prev => [...prev, ...(Array.isArray(f) ? f : [f])])
      setFindingForm({ description: '', severity: 'Minor', referenceClause: '', correctiveActionRequired: false })
      setShowFindingDialog(false)
    } catch (e: any) { alert(e.message) }
    finally { setSavingFinding(false) }
  }

  // ── Transition ──
  const handleTransition = async (targetStatus: string, password?: string, hash?: string) => {
    if (!selected) return
    setTransitioning(true)
    setSigModal({ open: false, targetStatus: '' })
    try {
      const m = api.module('audits')
      await m.transition(selected.id, targetStatus, password, hash)
      await loadDetail(selected.id)
      refetch()
    } catch (e: any) { alert(e.message) }
    finally { setTransitioning(false) }
  }

  // ── Back to list ──
  const goBack = () => { setSelected(null); setFindings([]) }

  // ──────────────────────────────────────────────────────────────────────────
  // DETAIL VIEW
  // ──────────────────────────────────────────────────────────────────────────
  if (selected) {
    const flowSteps = getFlowSteps('audits', selected.status)
    const nextStatuses = flowSteps.filter(s => s.isCurrent || s.isCompleted).length < flowSteps.length
      ? [flowSteps[flowSteps.findIndex(s => s.isCurrent) + 1]].filter(Boolean).map(s => s.status)
      : []

    return (
      <div className="space-y-6">
        <button onClick={goBack} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> Retour à la liste
        </button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge variant="outline" className="font-mono text-xs">{selected.audit_number || selected.id}</Badge>
              <Badge className={getStatusColor(selected.status)}>{selected.status}</Badge>
              <Badge variant="outline">{selected.audit_type}</Badge>
            </div>
            <h1 className="text-xl font-bold">{selected.title || '—'}</h1>
            {selected.description && <p className="text-sm text-muted-foreground mt-1">{selected.description}</p>}
          </div>
          <div className="flex gap-2">
            {nextStatuses.map(ns => {
              const needsSig = isESigRequired('audits', ns)
              return (
                <Button key={ns} size="sm" disabled={transitioning} onClick={() => {
                  if (needsSig) { setSigModal({ open: true, targetStatus: ns }) }
                  else { handleTransition(ns) }
                }}>
                  {transitioning && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  {needsSig && <ShieldAlert className="h-4 w-4 mr-1" />}
                  {ns === 'Completed' ? 'Terminer' : ns}
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
                {step.isCompleted ? <Star className="h-3 w-3" /> : null}
                {step.requiresESig && <ShieldAlert className="h-3 w-3" />}
                {step.status}
              </div>
              {i < flowSteps.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
            </div>
          ))}
        </div>

        <Tabs defaultValue="details">
          <TabsList>
            <TabsTrigger value="details">Détails</TabsTrigger>
            <TabsTrigger value="findings">Constats ({findings.length})</TabsTrigger>
            <TabsTrigger value="checklist" className="gap-1"><ListChecks className="h-3.5 w-3.5" /> Checklist</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Informations</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Type d&apos;audit</span><span className="font-medium flex items-center gap-1">{AUDIT_TYPE_ICON[selected.audit_type] || null} {selected.audit_type}</span></div>
                  <Separator />
                  <div className="flex justify-between"><span className="text-muted-foreground">Auditeur</span><span className="font-medium">{selected.auditor_id || selected.auditor_name || 'Non assigné'}</span></div>
                  <Separator />
                  <div className="flex justify-between"><span className="text-muted-foreground">Date prévue</span><span className="font-medium flex items-center gap-1"><Calendar className="h-3 w-3" />{fmtDate(selected.scheduled_date || selected.createdAt)}</span></div>
                  <Separator />
                  <div className="flex justify-between"><span className="text-muted-foreground">Score</span><span className="font-medium">{selected.score != null ? `${selected.score}/100` : '—'}</span></div>
                  <Separator />
                  <div className="flex justify-between"><span className="text-muted-foreground">Évaluation</span><span className="font-medium">{selected.rating || '—'}</span></div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Résumé des constats</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {(['Critical', 'Major', 'Minor', 'Observation'] as FindingSeverity[]).map(sev => {
                    const count = findings.filter(f => f.severity === sev).length
                    return (
                      <div key={sev} className="flex items-center justify-between">
                        <Badge variant="outline" className={SEVERITY_STYLES[sev]}>{sev}</Badge>
                        <span className="font-bold">{count}</span>
                      </div>
                    )
                  })}
                  <Separator />
                  <div className="flex justify-between font-medium"><span>Total</span><span>{findings.length}</span></div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="findings" className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">Constats de l&apos;audit</h3>
              {selected.status !== 'Completed' && (
                <Button size="sm" onClick={() => setShowFindingDialog(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Ajouter un constat
                </Button>
              )}
            </div>
            {findings.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">Aucun constat enregistré</CardContent></Card>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {findings.map((f, idx) => (
                  <Card key={f.id || idx}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className={`shrink-0 ${SEVERITY_STYLES[f.severity]}`}>{f.severity}</Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{f.description}</p>
                          {f.referenceClause && <p className="text-xs text-muted-foreground mt-1">Référence : {f.referenceClause}</p>}
                          <div className="flex items-center gap-2 mt-2">
                            {f.correctiveActionRequired && <Badge variant="destructive" className="text-xs">Action corrective requise</Badge>}
                            {f.capaId && (
                              <Button variant="link" size="sm" className="text-xs h-auto p-0" onClick={() => router.push(`/qms/capas/${f.capaId}`)}>
                                CAPA liée →
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Checklist Tab */}
          <TabsContent value="checklist" className="mt-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Checklist d&apos;audit</CardTitle></CardHeader>
              <CardContent>
                <AuditChecklist
                  items={(() => {
                    const raw = selected.checklist_items || []
                    return raw.map((c: any, i: number) => ({
                      id: c.id || `cl-${i}`,
                      clause: c.clause || c.reference || `§${i + 1}`,
                      requirement: c.requirement || c.description || 'Point de contrôle',
                      status: c.status || 'pending',
                      evidence: c.evidence,
                      finding_severity: c.finding_severity,
                    })) as AuditChecklistItem[]
                  })()}
                  onUpdate={(itemId, data) => {
                    const items = [...(selected.checklist_items || [])]
                    const idx = items.findIndex((c: any) => (c.id || `cl-${items.indexOf(c)}`) === itemId)
                    if (idx >= 0) {
                      items[idx] = { ...items[idx], ...data }
                      update(selected.id, { checklist_items: JSON.stringify(items) })
                    }
                  }}
                  disabled={selected.status === 'Closed' || selected.status === 'Completed'}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* E-Signature Modal */}
        <ElectronicSignatureModal
          open={sigModal.open}
          title="Terminer l'audit"
          description="Confirmez la complétion de cet audit avec votre signature électronique."
          recordId={selected.id}
          recordType="audit"
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
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <button onClick={() => router.push('/dashboard')} className="text-sm text-muted-foreground hover:text-foreground mb-1 flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Tableau de bord
          </button>
          <h1 className="text-2xl font-bold">Audits</h1>
          <p className="text-sm text-muted-foreground">Gestion des audits internes, externes et fournisseurs · {items.length} enregistrement(s)</p>
        </div>
        <Button onClick={() => router.push('/qms/audits/new')}>
          <Plus className="h-4 w-4 mr-2" /> Nouvel audit
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher par titre ou numéro..." value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }} className="pl-9" />
            </div>
            <Select value={typeFilter} onValueChange={v => { setTypeFilter(v); setPage(1) }}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Type d'audit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les types</SelectItem>
                <SelectItem value="Internal">Interne</SelectItem>
                <SelectItem value="External">Externe</SelectItem>
                <SelectItem value="Supplier">Fournisseur</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1) }}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les statuts</SelectItem>
                <SelectItem value="Planned">Planifié</SelectItem>
                <SelectItem value="In Progress">En cours</SelectItem>
                <SelectItem value="Completed">Terminé</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      {loading ? (
        <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}</div>
      ) : paged.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardCheck className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-4">Aucun audit trouvé</p>
            <Button variant="outline" onClick={() => router.push('/qms/audits/new')}>
              <Plus className="h-4 w-4 mr-2" /> Créer le premier
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3">
            {paged.map((a: any) => (
              <Card key={a.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => loadDetail(a.id)}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-muted shrink-0">
                      {AUDIT_TYPE_ICON[a.audit_type] || <Eye className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {a.audit_number && <Badge variant="outline" className="font-mono text-xs">{a.audit_number}</Badge>}
                        <Badge className={getStatusColor(a.status)}>{a.status}</Badge>
                        <Badge variant="outline" className="text-xs">{a.audit_type}</Badge>
                      </div>
                      <h3 className="font-medium truncate">{a.title || '—'}</h3>
                      {a.description && <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">{a.description}</p>}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        {a.auditor_name && <span className="flex items-center gap-1"><User className="h-3 w-3" />{a.auditor_name}</span>}
                        {a.scheduled_date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{fmtDate(a.scheduled_date)}</span>}
                        {a.score != null && <span className="flex items-center gap-1"><Star className="h-3 w-3" />{a.score}/100</span>}
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

      {/* Add Finding Dialog */}
      <Dialog open={showFindingDialog} onOpenChange={setShowFindingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un constat</DialogTitle>
            <DialogDescription>Enregistrez un nouveau constat pour cet audit.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Description</Label>
              <Textarea value={findingForm.description} onChange={e => setFindingForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Décrivez le constat..." rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Sévérité</Label>
                <Select value={findingForm.severity} onValueChange={v => setFindingForm(f => ({ ...f, severity: v as FindingSeverity }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Critical">Critique</SelectItem>
                    <SelectItem value="Major">Majeur</SelectItem>
                    <SelectItem value="Minor">Mineur</SelectItem>
                    <SelectItem value="Observation">Observation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Clause de référence</Label>
                <Input value={findingForm.referenceClause} onChange={e => setFindingForm(f => ({ ...f, referenceClause: e.target.value }))}
                  placeholder="ex: 4.2.4" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={findingForm.correctiveActionRequired} onCheckedChange={v => setFindingForm(f => ({ ...f, correctiveActionRequired: v }))} />
              <Label>Action corrective requise</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowFindingDialog(false)}>Annuler</Button>
            <Button onClick={handleAddFinding} disabled={!findingForm.description.trim() || savingFinding}>
              {savingFinding && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}