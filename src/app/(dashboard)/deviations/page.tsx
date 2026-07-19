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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import {
  Plus, Search, ChevronRight, ArrowLeftRight, AlertTriangle,
  CheckCircle, Clock, Link2, ShieldAlert, FileText, Beaker,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RootCauseAnalysis } from '@/components/shared/RootCauseAnalysis'
import { ProductStageTracker } from '@/components/shared/ProductStageTracker'
import type { DeviationType, DeviationCategory, DeviationStatus, ProductStage } from '@/types/qms'

const TYPE_LABELS: Record<DeviationType, string> = { Planned: 'Planifiée', Unplanned: 'Non planifiée' }
const CATEGORY_LABELS: Record<DeviationCategory, string> = {
  Process: 'Processus', Equipment: 'Équipement', Material: 'Matière',
  Environment: 'Environnement', Personnel: 'Personnel', Documentation: 'Documentation',
}
const STAGE_LABELS: Record<ProductStage, string> = {
  'Raw Material': 'Matière première', 'In-Process': 'En cours', 'Finished Product': 'Produit fini',
  Stability: 'Stabilité', Other: 'Autre',
}
const DEVIATION_STATUSES: DeviationStatus[] = ['Open', 'Under Investigation', 'Pending QA Review', 'Approved', 'Closed']

export default function DeviationView() {
  const { user } = useAuth()
  const { items, loading, create, update, refetch } = useModule('/deviation')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [stageFilter, setStageFilter] = useState('ALL')
  const [selected, setSelected] = useState<any>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [newOpen, setNewOpen] = useState(false)
  const [esigOpen, setEsigOpen] = useState(false)
  const [esigTarget, setEsigTarget] = useState<{ id: string; status: string } | null>(null)

  const [form, setForm] = useState({
    title: '', deviation_type: 'Unplanned' as DeviationType,
    category: 'Process' as DeviationCategory, product_stage: 'In-Process' as ProductStage,
    description: '', product_name: '', lot_number: '', impact_assessment: '',
  })
  const [creating, setCreating] = useState(false)

  const filtered = useMemo(() => {
    let list = items
    if (search) { const q = search.toLowerCase(); list = list.filter((d: any) => (d.title || '').toLowerCase().includes(q) || (d.deviation_number || '').toLowerCase().includes(q)) }
    if (statusFilter !== 'ALL') list = list.filter((d: any) => d.status === statusFilter)
    if (typeFilter !== 'ALL') list = list.filter((d: any) => d.deviation_type === typeFilter)
    if (categoryFilter !== 'ALL') list = list.filter((d: any) => d.category === categoryFilter)
    if (stageFilter !== 'ALL') list = list.filter((d: any) => d.product_stage === stageFilter)
    return list
  }, [items, search, statusFilter, typeFilter, categoryFilter, stageFilter])

  const stats = useMemo(() => {
    const all = items
    return {
      total: all.length, open: all.filter((d: any) => d.status === 'Open').length,
      investigation: all.filter((d: any) => d.status === 'Under Investigation').length,
      qaReview: all.filter((d: any) => d.status === 'Pending QA Review').length,
      approved: all.filter((d: any) => d.status === 'Approved').length,
      closed: all.filter((d: any) => d.status === 'Closed').length,
    }
  }, [items])

  const requestTransition = (id: string, targetStatus: string) => {
    if (!user) return
    const item = (items as any).find((d: any) => d.id === id)
    if (!item) return
    const check = canTransition('deviations', item.status, targetStatus, user.role)
    if (!check.allowed) { alert(check.reason); return }
    if (check.requiresESignature) { setEsigTarget({ id, status: targetStatus }); setEsigOpen(true) }
    else { doTransition(id, targetStatus) }
  }

  const doTransition = async (id: string, newStatus: string) => {
    try { await api.module('/deviation').transition(id, newStatus); refetch(); setSheetOpen(false) }
    catch (e: any) { alert(e.message) }
  }

  const handleEsigConfirm = (_p: string, _h: string) => {
    if (esigTarget) { doTransition(esigTarget.id, esigTarget.status); setEsigOpen(false); setEsigTarget(null) }
  }

  const handleCreate = async () => {
    if (!form.title.trim()) return
    setCreating(true)
    try {
      await create({
        title: form.title, deviation_type: form.deviation_type, category: form.category,
        product_stage: form.product_stage, description: form.description,
        product_name: form.product_name, lot_number: form.lot_number,
        impact_assessment: form.impact_assessment,
      })
      setNewOpen(false)
      setForm({ title: '', deviation_type: 'Unplanned', category: 'Process', product_stage: 'In-Process', description: '', product_name: '', lot_number: '', impact_assessment: '' })
    } catch (e: any) { alert(e.message) }
    finally { setCreating(false) }
  }

  const fmtDate = (d: string) => { try { return new Date(d).toLocaleDateString('fr-FR') } catch { return '—' } }

  const columns = [
    { key: 'deviation_number', label: 'N° Déviation', render: (v: any) => v ? <Badge variant="outline" className="font-mono text-xs">{v}</Badge> : '—' },
    { key: 'title', label: 'Titre', sortable: true, render: (v: any) => <span className="font-medium truncate max-w-[200px] block">{v || '—'}</span> },
    { key: 'deviation_type', label: 'Type', render: (v: any) => <Badge variant="secondary" className="text-xs">{TYPE_LABELS[v as DeviationType] || v}</Badge> },
    { key: 'category', label: 'Catégorie', render: (v: any) => <span className="text-xs text-muted-foreground">{CATEGORY_LABELS[v as DeviationCategory] || v}</span> },
    { key: 'product_stage', label: 'Étape produit', render: (v: any) => v ? <Badge variant="outline" className="text-xs">{STAGE_LABELS[v as ProductStage] || v}</Badge> : '—' },
    { key: 'status', label: 'Statut', render: (v: any) => <Badge variant="outline" className={`text-xs ${getStatusColor(v)}`}>{v}</Badge> },
    { key: 'created_at', label: 'Date', sortable: true, render: (v: any) => fmtDate(v) },
    { key: 'actions', label: '', className: 'w-28', render: (_v: any, r: any) => (
      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
        {r.status === 'Open' && (
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => requestTransition(r.id, 'Under Investigation')}>
            <Search className="h-3.5 w-3.5 mr-1" /> Investiguer
          </Button>
        )}
      </div>
    )},
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ArrowLeftRight className="h-6 w-6 text-orange-600" /> Déviations</h1>
          <p className="text-sm text-muted-foreground">Gestion des écarts — planifiés et non planifiés — avec évaluation d&apos;impact</p>
        </div>
        <Button onClick={() => setNewOpen(true)}><Plus className="h-4 w-4 mr-2" /> Nouvelle déviation</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: stats.total, icon: ArrowLeftRight, color: 'text-slate-600' },
          { label: 'Ouvertes', value: stats.open, icon: AlertTriangle, color: 'text-red-600' },
          { label: 'Investigation', value: stats.investigation, icon: Search, color: 'text-amber-600' },
          { label: 'Revue QA', value: stats.qaReview, icon: ShieldAlert, color: 'text-orange-600' },
          { label: 'Clôturées', value: stats.closed, icon: CheckCircle, color: 'text-green-600' },
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
                {DEVIATION_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
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
              <SelectTrigger className="w-44"><SelectValue placeholder="Catégorie" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Toutes catégories</SelectItem>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Étape produit" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Toutes étapes</SelectItem>
                {Object.entries(STAGE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <ResponsiveTable columns={columns} data={filtered as any[]} loading={loading} onRowClick={r => { setSelected(r); setSheetOpen(true) }} emptyMessage="Aucune déviation trouvée." />

      {/* Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="font-mono text-xs">{selected.deviation_number || '—'}</Badge>
                  <Badge variant="secondary" className="text-xs">{TYPE_LABELS[selected.deviation_type as DeviationType] || selected.deviation_type}</Badge>
                  {selected.title}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <Tabs defaultValue="overview">
                  <TabsList className="w-full">
                    <TabsTrigger value="overview" className="flex-1">Vue d&apos;ensemble</TabsTrigger>
                    <TabsTrigger value="rca" className="flex-1 gap-1"><Beaker className="h-3.5 w-3.5" /> Cause racine</TabsTrigger>
                    <TabsTrigger value="workflow" className="flex-1">Workflow</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-muted-foreground">Catégorie</Label><p className="text-sm font-medium mt-1">{CATEGORY_LABELS[selected.category as DeviationCategory] || selected.category}</p></div>
                  <div><Label className="text-muted-foreground">Statut</Label><div className="mt-1"><Badge variant="outline" className={getStatusColor(selected.status)}>{selected.status}</Badge></div></div>
                  <div><Label className="text-muted-foreground">Produit / Lot</Label><p className="text-sm mt-1">{selected.product_name || '—'} {selected.lot_number ? `— ${selected.lot_number}` : ''}</p></div>
                </div>
                {selected.description && <div><Label className="text-muted-foreground">Description</Label><p className="text-sm mt-1 whitespace-pre-wrap">{selected.description}</p></div>}

                {/* Product Stage Tracker */}
                <ProductStageTracker currentStage={selected.product_stage} disabled />

                {/* Impact Assessment */}
                <div className="p-4 border rounded-lg bg-muted/30">
                  <h4 className="font-semibold text-sm flex items-center gap-2 mb-2"><ShieldAlert className="h-4 w-4 text-orange-600" /> Évaluation d&apos;impact</h4>
                  {selected.impact_assessment
                    ? <p className="text-sm whitespace-pre-wrap">{selected.impact_assessment}</p>
                    : <p className="text-sm text-muted-foreground italic">Aucune évaluation d&apos;impact renseignée</p>
                  }
                </div>

                {/* CAPA Linkage */}
                {selected.capa_id && (
                  <div className="p-3 bg-muted rounded-lg flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-primary" />
                    <span className="text-sm">CAPA requise : <span className="font-mono font-medium">{selected.capa_id}</span></span>
                  </div>
                )}
                  </TabsContent>

                  {/* Root Cause Analysis Tab */}
                  <TabsContent value="rca" className="mt-4">
                    <div className="p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg mb-4">
                      <p className="text-sm text-amber-800 dark:text-amber-300">
                        Utilisez les outils d&apos;analyse de cause racine ci-dessous pour investiguer la déviation.
                        Choisissez entre la méthode 5 Pourquoi, le diagramme Ishikawa 6M ou une analyse libre.
                      </p>
                    </div>
                    <RootCauseAnalysis
                      value={selected.root_cause || selected.rootCause || ''}
                      onChange={(val) => update(selected.id, { root_cause: val })}
                      disabled={selected.status === 'Closed' || selected.status === 'Approved'}
                    />
                  </TabsContent>

                  {/* Workflow Tab */}
                  <TabsContent value="workflow" className="mt-4">
                <div>
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider">Workflow</Label>
                  <div className="mt-3 flex items-center gap-1 flex-wrap">
                    {getFlowSteps('deviations', selected.status).map((step, i, arr) => (
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
                <Separator className="my-4" />
                <div className="flex gap-2 flex-wrap">
                  {selected.status === 'Open' && <Button size="sm" onClick={() => requestTransition(selected.id, 'Under Investigation')}><Search className="h-4 w-4 mr-2" /> Investiguer</Button>}
                  {selected.status === 'Under Investigation' && <Button size="sm" onClick={() => requestTransition(selected.id, 'Pending QA Review')}><ShieldAlert className="h-4 w-4 mr-2" /> Soumettre revue QA</Button>}
                  {selected.status === 'Pending QA Review' && <Button size="sm" onClick={() => requestTransition(selected.id, 'Approved')}><CheckCircle className="h-4 w-4 mr-2" /> Approuver</Button>}
                  {selected.status === 'Approved' && <Button size="sm" onClick={() => requestTransition(selected.id, 'Closed')}><CheckCircle className="h-4 w-4 mr-2" /> Clôturer</Button>}
                </div>
                  </TabsContent>
                </Tabs>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* New Deviation Dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouvelle déviation</DialogTitle>
            <DialogDescription>Enregistrer un écart planifié ou non planifié</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label>Titre *</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Titre de la déviation" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select value={form.deviation_type} onValueChange={v => setForm(p => ({ ...p, deviation_type: v as DeviationType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Catégorie</Label>
                <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v as DeviationCategory }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Étape produit</Label>
                <Select value={form.product_stage} onValueChange={v => setForm(p => ({ ...p, product_stage: v as ProductStage }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STAGE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>N° de lot</Label><Input value={form.lot_number} onChange={e => setForm(p => ({ ...p, lot_number: e.target.value }))} placeholder="N° de lot" /></div>
            </div>
            <div><Label>Description *</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Description de la déviation..." rows={3} /></div>
            <div><Label>Évaluation d&apos;impact</Label><Textarea value={form.impact_assessment} onChange={e => setForm(p => ({ ...p, impact_assessment: e.target.value }))} placeholder="Analyse de l'impact sur le produit, le processus et la qualité..." rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNewOpen(false)}>Annuler</Button>
            <Button onClick={handleCreate} disabled={!form.title.trim() || creating}>{creating ? 'Création...' : 'Créer la déviation'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ElectronicSignatureModal open={esigOpen} title="Signature électronique requise" description="Transition de statut déviation — confirmation par signature 21 CFR Part 11" recordId={esigTarget?.id} recordType="deviation" onConfirm={handleEsigConfirm} onCancel={() => { setEsigOpen(false); setEsigTarget(null) }} />
    </div>
  )
}