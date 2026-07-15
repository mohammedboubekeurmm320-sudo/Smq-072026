'use client'

import { useState, useMemo } from 'react'
import { useModule } from '@/hooks/useModule'
import { api } from '@/lib/api-client'
import { getFlowSteps, canTransition } from '@/lib/status-flows'
import { getStatusColor } from '@/lib/status-colors'
import { ResponsiveTable } from '@/components/shared/ResponsiveTable'
import { ElectronicSignatureModal } from '@/components/shared/ElectronicSignatureModal'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import {
  Plus, Search, ChevronRight, RefreshCw, AlertTriangle,
  CheckCircle, Clock, FileText, ShieldAlert, Zap, ListChecks,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import type { CcType, CcCategory, CcStatus } from '@/types/qms'

const TYPE_LABELS: Record<CcType, string> = { Planned: 'Planifié', Unplanned: 'Non planifié', Emergency: 'Urgence' }

const CATEGORY_LABELS: Record<CcCategory, string> = {
  Process: 'Processus', Equipment: 'Équipement', Facility: 'Installation',
  Document: 'Document', Material: 'Matière', 'Computer System': 'Système informatique',
  Organizational: 'Organisationnel', Manufacturing: 'Fabrication',
  Regulatory: 'Réglementaire', 'Supply Chain': 'Chaîne d\'approvisionnement',
  Warehouse: 'Entrepôt', Other: 'Autre',
}

const CC_STATUSES: CcStatus[] = ['Requested', 'Under Review', 'Approved', 'In Implementation', 'Completed', 'Rejected']

const DEFAULT_CHECKLIST = [
  { id: 'training', label: 'Formation du personnel réalisée' },
  { id: 'docs_updated', label: 'Documents mis à jour' },
  { id: 'validation', label: 'Validation / IQ/OQ/PQ effectuée' },
  { id: 'risk_reviewed', label: 'Évaluation des risques revue' },
  { id: 'regulatory', label: 'Impact réglementaire évalué' },
  { id: 'communication', label: 'Communication aux parties intéressées' },
  { id: 'effective_date', label: 'Date d\'effet définie' },
  { id: 'rollback_plan', label: 'Plan de retour en arrière défini' },
]

export default function ChangeControlView() {
  const { user } = useAuth()
  const { items, loading, create, update, refetch } = useModule('/change_control')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [selected, setSelected] = useState<any>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [newOpen, setNewOpen] = useState(false)
  const [esigOpen, setEsigOpen] = useState(false)
  const [esigTarget, setEsigTarget] = useState<{ id: string; status: string } | null>(null)
  const [checklist, setChecklist] = useState<Record<string, boolean>>({})

  const [form, setForm] = useState({
    title: '', change_type: 'Planned' as CcType,
    category: 'Process' as CcCategory,
    description: '', reason: '', risk_assessment: '', affected_documents: '',
  })
  const [creating, setCreating] = useState(false)

  const filtered = useMemo(() => {
    let list = items
    if (search) { const q = search.toLowerCase(); list = list.filter((c: any) => (c.title || '').toLowerCase().includes(q) || (c.cc_number || '').toLowerCase().includes(q)) }
    if (statusFilter !== 'ALL') list = list.filter((c: any) => c.status === statusFilter)
    if (typeFilter !== 'ALL') list = list.filter((c: any) => c.change_type === typeFilter)
    if (categoryFilter !== 'ALL') list = list.filter((c: any) => c.category === categoryFilter)
    return list
  }, [items, search, statusFilter, typeFilter, categoryFilter])

  const stats = useMemo(() => {
    const all = items
    return {
      total: all.length, requested: all.filter((c: any) => c.status === 'Requested').length,
      review: all.filter((c: any) => c.status === 'Under Review').length,
      implementation: all.filter((c: any) => c.status === 'In Implementation').length,
      completed: all.filter((c: any) => c.status === 'Completed').length,
      rejected: all.filter((c: any) => c.status === 'Rejected').length,
    }
  }, [items])

  const requestTransition = (id: string, targetStatus: string) => {
    if (!user) return
    const item = (items as any).find((c: any) => c.id === id)
    if (!item) return
    const check = canTransition('change-controls', item.status, targetStatus, user.role)
    if (!check.allowed) { alert(check.reason); return }
    if (check.requiresESignature) { setEsigTarget({ id, status: targetStatus }); setEsigOpen(true) }
    else { doTransition(id, targetStatus) }
  }

  const doTransition = async (id: string, newStatus: string) => {
    try { await api.module('/change_control').transition(id, newStatus); refetch(); setSheetOpen(false) }
    catch (e: any) { alert(e.message) }
  }

  const handleEsigConfirm = (_p: string, _h: string) => {
    if (esigTarget) { doTransition(esigTarget.id, esigTarget.status); setEsigOpen(false); setEsigTarget(null) }
  }

  const handleRowClick = (row: any) => {
    setSelected(row)
    setSheetOpen(true)
    // Parse checklist
    if (row.implementation_checklist) {
      try {
        const parsed = typeof row.implementation_checklist === 'string' ? JSON.parse(row.implementation_checklist) : row.implementation_checklist
        setChecklist(parsed)
      } catch { setChecklist({}) }
    } else { setChecklist({}) }
  }

  const toggleChecklist = async (itemId: string, checkId: string) => {
    const updated = { ...checklist, [checkId]: !checklist[checkId] }
    setChecklist(updated)
    try { await update(itemId, { implementation_checklist: updated }) }
    catch (e: any) { alert(e.message); setChecklist(checklist) }
  }

  const handleCreate = async () => {
    if (!form.title.trim()) return
    setCreating(true)
    try {
      await create({
        title: form.title, change_type: form.change_type, category: form.category,
        description: form.description, reason: form.reason,
        risk_assessment: form.risk_assessment, affected_documents: form.affected_documents,
      })
      setNewOpen(false)
      setForm({ title: '', change_type: 'Planned', category: 'Process', description: '', reason: '', risk_assessment: '', affected_documents: '' })
    } catch (e: any) { alert(e.message) }
    finally { setCreating(false) }
  }

  const fmtDate = (d: string) => { try { return new Date(d).toLocaleDateString('fr-FR') } catch { return '—' } }

  const columns = [
    { key: 'cc_number', label: 'N° CC', render: (v: any) => v ? <Badge variant="outline" className="font-mono text-xs">{v}</Badge> : '—' },
    { key: 'title', label: 'Titre', sortable: true, render: (v: any) => <span className="font-medium truncate max-w-[200px] block">{v || '—'}</span> },
    { key: 'change_type', label: 'Type', render: (v: any) => {
      const cls = v === 'Emergency' ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400' : v === 'Unplanned' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
      return <Badge variant="outline" className={`text-xs ${cls}`}>{TYPE_LABELS[v as CcType] || v}</Badge>
    }},
    { key: 'category', label: 'Catégorie', render: (v: any) => <span className="text-xs text-muted-foreground">{CATEGORY_LABELS[v as CcCategory] || v}</span> },
    { key: 'status', label: 'Statut', render: (v: any) => <Badge variant="outline" className={`text-xs ${getStatusColor(v)}`}>{v}</Badge> },
    { key: 'created_at', label: 'Date', sortable: true, render: (v: any) => fmtDate(v) },
    { key: 'actions', label: '', className: 'w-28', render: (_v: any, r: any) => (
      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
        {r.status === 'Requested' && (
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => requestTransition(r.id, 'Under Review')}>
            <Search className="h-3.5 w-3.5 mr-1" /> Réviser
          </Button>
        )}
        {r.status === 'Under Review' && (
          <Button size="sm" variant="ghost" className="h-7 text-xs text-green-600" onClick={() => requestTransition(r.id, 'Approved')}>
            <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approuver
          </Button>
        )}
      </div>
    )},
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><RefreshCw className="h-6 w-6 text-emerald-600" /> Maîtrise des Changements</h1>
          <p className="text-sm text-muted-foreground">Contrôle des modifications — évaluation, approbation, mise en œuvre et vérification</p>
        </div>
        <Button onClick={() => setNewOpen(true)}><Plus className="h-4 w-4 mr-2" /> Nouveau contrôle</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: stats.total, icon: RefreshCw, color: 'text-slate-600' },
          { label: 'Demandées', value: stats.requested, icon: Clock, color: 'text-slate-500' },
          { label: 'En révision', value: stats.review, icon: Search, color: 'text-amber-600' },
          { label: 'En cours', value: stats.implementation, icon: Zap, color: 'text-blue-600' },
          { label: 'Terminées', value: stats.completed, icon: CheckCircle, color: 'text-green-600' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`h-5 w-5 ${s.color}`} />
              <div><div className="text-2xl font-bold">{s.value}</div><div className="text-xs text-muted-foreground">{s.label}</div></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher par titre ou numéro..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Statut" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les statuts</SelectItem>
                {CC_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous types</SelectItem>
                {Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-52"><SelectValue placeholder="Catégorie" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Toutes catégories</SelectItem>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <ResponsiveTable columns={columns} data={filtered as any[]} loading={loading} onRowClick={handleRowClick} emptyMessage="Aucun contrôle de changement trouvé." />

      {/* Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="font-mono text-xs">{selected.cc_number || '—'}</Badge>
                  {selected.change_type === 'Emergency' && <Badge className="bg-red-600 text-white text-xs"><AlertTriangle className="h-3 w-3 mr-1" /> URGENCE</Badge>}
                  {selected.title}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-muted-foreground">Type</Label><p className="text-sm font-medium mt-1">{TYPE_LABELS[selected.change_type as CcType] || selected.change_type}</p></div>
                  <div><Label className="text-muted-foreground">Catégorie</Label><p className="text-sm font-medium mt-1">{CATEGORY_LABELS[selected.category as CcCategory] || selected.category}</p></div>
                  <div><Label className="text-muted-foreground">Statut</Label><div className="mt-1"><Badge variant="outline" className={getStatusColor(selected.status)}>{selected.status}</Badge></div></div>
                  <div><Label className="text-muted-foreground">Date de demande</Label><p className="text-sm mt-1">{fmtDate(selected.created_at)}</p></div>
                </div>
                {selected.description && <div><Label className="text-muted-foreground">Description du changement</Label><p className="text-sm mt-1 whitespace-pre-wrap">{selected.description}</p></div>}
                {selected.reason && <div><Label className="text-muted-foreground">Justification</Label><p className="text-sm mt-1 whitespace-pre-wrap">{selected.reason}</p></div>}

                {/* Risk Assessment */}
                <div className="p-4 border rounded-lg bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
                  <h4 className="font-semibold text-sm flex items-center gap-2 mb-2"><ShieldAlert className="h-4 w-4 text-amber-600" /> Évaluation des risques</h4>
                  {selected.risk_assessment
                    ? <p className="text-sm whitespace-pre-wrap">{selected.risk_assessment}</p>
                    : <p className="text-sm text-muted-foreground italic">Aucune évaluation de risque renseignée</p>
                  }
                </div>

                {/* Affected Documents */}
                {selected.affected_documents && (
                  <div className="p-4 border rounded-lg bg-muted/30">
                    <h4 className="font-semibold text-sm flex items-center gap-2 mb-2"><FileText className="h-4 w-4" /> Documents affectés</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {String(selected.affected_documents).split(',').map((doc, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{doc.trim()}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Implementation Checklist */}
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold text-sm flex items-center gap-2 mb-3"><ListChecks className="h-4 w-4 text-emerald-600" /> Liste de contrôle de mise en œuvre</h4>
                  <div className="space-y-2.5">
                    {DEFAULT_CHECKLIST.map(item => (
                      <label key={item.id} className="flex items-center gap-3 cursor-pointer group">
                        <Checkbox
                          checked={checklist[item.id] || false}
                          onCheckedChange={() => toggleChecklist(selected.id, item.id)}
                        />
                        <span className={`text-sm ${checklist[item.id] ? 'line-through text-muted-foreground' : ''} group-hover:text-foreground transition-colors`}>
                          {item.label}
                        </span>
                      </label>
                    ))}
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground">
                    {Object.values(checklist).filter(Boolean).length} / {DEFAULT_CHECKLIST.length} étapes complétées
                  </div>
                </div>

                <Separator />
                <div>
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider">Workflow</Label>
                  <div className="mt-3 flex items-center gap-1 flex-wrap">
                    {getFlowSteps('change-controls', selected.status).map((step, i, arr) => (
                      <div key={step.status} className="flex items-center gap-1">
                        <div className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                          step.isCurrent ? 'bg-primary text-primary-foreground border-primary'
                          : step.isCompleted ? 'bg-green-100 text-green-700 border-green-300'
                          : 'bg-muted text-muted-foreground border-muted-foreground/20'}`}>
                          {step.status} {step.requiresESig && '🔒'}
                        </div>
                        {i < arr.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                      </div>
                    ))}
                  </div>
                </div>
                <Separator />
                <div className="flex gap-2 flex-wrap">
                  {selected.status === 'Requested' && <Button size="sm" onClick={() => requestTransition(selected.id, 'Under Review')}><Search className="h-4 w-4 mr-2" /> Démarrer révision</Button>}
                  {selected.status === 'Under Review' && (
                    <>
                      <Button size="sm" onClick={() => requestTransition(selected.id, 'Approved')}><CheckCircle className="h-4 w-4 mr-2" /> Approuver</Button>
                      <Button size="sm" variant="destructive" onClick={() => requestTransition(selected.id, 'Rejected')}><AlertTriangle className="h-4 w-4 mr-2" /> Rejeter</Button>
                    </>
                  )}
                  {selected.status === 'Approved' && <Button size="sm" onClick={() => requestTransition(selected.id, 'In Implementation')}><Zap className="h-4 w-4 mr-2" /> Démarrer mise en œuvre</Button>}
                  {selected.status === 'In Implementation' && <Button size="sm" onClick={() => requestTransition(selected.id, 'Completed')}><CheckCircle className="h-4 w-4 mr-2" /> Terminer</Button>}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* New Change Control Dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouveau contrôle de changement</DialogTitle>
            <DialogDescription>Demander un nouveau contrôle de modification</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label>Titre *</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Titre du changement" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select value={form.change_type} onValueChange={v => setForm(p => ({ ...p, change_type: v as CcType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Catégorie</Label>
                <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v as CcCategory }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Description *</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Décrivez le changement proposé..." rows={3} /></div>
            <div><Label>Justification</Label><Textarea value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} placeholder="Pourquoi ce changement est nécessaire..." rows={2} /></div>
            <div><Label>Évaluation des risques</Label><Textarea value={form.risk_assessment} onChange={e => setForm(p => ({ ...p, risk_assessment: e.target.value }))} placeholder="Évaluation des risques associés au changement..." rows={2} /></div>
            <div><Label>Documents affectés</Label><Input value={form.affected_documents} onChange={e => setForm(p => ({ ...p, affected_documents: e.target.value }))} placeholder="Références séparées par des virgules" /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNewOpen(false)}>Annuler</Button>
            <Button onClick={handleCreate} disabled={!form.title.trim() || creating}>{creating ? 'Création...' : 'Créer le contrôle'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ElectronicSignatureModal open={esigOpen} title="Signature électronique requise" description="Transition de statut contrôle de changement — confirmation par signature 21 CFR Part 11" recordId={esigTarget?.id} recordType="change_control" onConfirm={handleEsigConfirm} onCancel={() => { setEsigOpen(false); setEsigTarget(null) }} />
    </div>
  )
}