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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import {
  Plus, Search, ChevronRight, ShieldCheck, ArrowLeftRight,
  AlertTriangle, CheckCircle2, Clock, HelpCircle, Target, Link2, Save,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import type { CapaType, CapaPriority, CapaSource, CapaStatus, RootCauseCategory, EffectivenessResult } from '@/types/qms'

const PRIORITY_CONFIG: Record<CapaPriority, { color: string; bg: string; label: string }> = {
  Critical: { color: 'text-red-700', bg: 'bg-red-100 border-red-300 dark:bg-red-950 dark:border-red-800', label: 'Critique' },
  High: { color: 'text-orange-700', bg: 'bg-orange-100 border-orange-300 dark:bg-orange-950 dark:border-orange-800', label: 'Élevée' },
  Medium: { color: 'text-amber-700', bg: 'bg-amber-100 border-amber-300 dark:bg-amber-950 dark:border-amber-800', label: 'Moyenne' },
  Low: { color: 'text-green-700', bg: 'bg-green-100 border-green-300 dark:bg-green-950 dark:border-green-800', label: 'Faible' },
}

const SOURCE_LABELS: Record<CapaSource, string> = {
  'Non-Conformance': 'Non-Conformité', 'Audit Finding': 'Constat d\'audit',
  'Customer Complaint': 'Plainte client', 'Management Review': 'Revue de direction',
  'Process Monitoring': 'Suivi processus', 'Supplier Issue': 'Problème fournisseur',
}

const ROOT_CAUSE_CATEGORIES: { value: RootCauseCategory; label: string; icon: string }[] = [
  { value: 'Man', label: 'Main-d\'œuvre', icon: '👤' },
  { value: 'Machine', label: 'Machine', icon: '⚙️' },
  { value: 'Method', label: 'Méthode', icon: '📋' },
  { value: 'Material', label: 'Matière', icon: '🧪' },
  { value: 'Measurement', label: 'Mesure', icon: '📏' },
  { value: 'Environment', label: 'Environnement', icon: '🏭' },
  { value: 'Management', label: 'Management', icon: '👔' },
]

const EFFECTIVENESS_CONFIG: Record<EffectivenessResult, { color: string; bg: string; label: string }> = {
  Effective: { color: 'text-green-700', bg: 'bg-green-100 dark:bg-green-950', label: 'Efficace' },
  'Not Effective': { color: 'text-red-700', bg: 'bg-red-100 dark:bg-red-950', label: 'Non efficace' },
  'Pending Review': { color: 'text-amber-700', bg: 'bg-amber-100 dark:bg-amber-950', label: 'En attente' },
}

const CAPA_STATUSES: CapaStatus[] = ['Open', 'Investigation', 'Implementation', 'Effectiveness Check', 'Closed']

function getDueDateClass(dueDate: string | null | undefined): string {
  if (!dueDate) return ''
  const now = new Date()
  const due = new Date(dueDate)
  const diffDays = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  if (diffDays < 0) return 'text-red-600 font-semibold'
  if (diffDays <= 7) return 'text-amber-600 font-semibold'
  return ''
}

export default function CapaView() {
  const { user } = useAuth()
  const { items, loading, create, update, refetch } = useModule('/capa')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [priorityFilter, setPriorityFilter] = useState('ALL')
  const [sourceFilter, setSourceFilter] = useState('ALL')
  const [selected, setSelected] = useState<any>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [newOpen, setNewOpen] = useState(false)
  const [esigOpen, setEsigOpen] = useState(false)
  const [esigTarget, setEsigTarget] = useState<{ id: string; status: string } | null>(null)
  const [detailTab, setDetailTab] = useState('info')

  // 5-Why state
  const [whys, setWhys] = useState<string[]>(['', '', '', '', ''])
  const [rootCauseCategory, setRootCauseCategory] = useState<RootCauseCategory | ''>('')
  // Effectiveness state
  const [effCriteria, setEffCriteria] = useState('')
  const [effResult, setEffResult] = useState<EffectivenessResult | ''>('')
  const [savingAnalysis, setSavingAnalysis] = useState(false)

  const [form, setForm] = useState({
    title: '', capa_type: 'Corrective' as CapaType, priority: 'Medium' as CapaPriority,
    source: 'Non-Conformance' as CapaSource, description: '', due_date: '', source_id: '',
  })
  const [creating, setCreating] = useState(false)

  const filtered = useMemo(() => {
    let list = items
    if (search) { const q = search.toLowerCase(); list = list.filter((c: any) => (c.title || '').toLowerCase().includes(q) || (c.capa_number || '').toLowerCase().includes(q)) }
    if (statusFilter !== 'ALL') list = list.filter((c: any) => c.status === statusFilter)
    if (priorityFilter !== 'ALL') list = list.filter((c: any) => c.priority === priorityFilter)
    if (sourceFilter !== 'ALL') list = list.filter((c: any) => c.source === sourceFilter)
    return list
  }, [items, search, statusFilter, priorityFilter, sourceFilter])

  const stats = useMemo(() => {
    const all = items
    return {
      total: all.length, open: all.filter((c: any) => c.status === 'Open').length,
      investigation: all.filter((c: any) => c.status === 'Investigation').length,
      implementation: all.filter((c: any) => c.status === 'Implementation').length,
      effCheck: all.filter((c: any) => c.status === 'Effectiveness Check').length,
      closed: all.filter((c: any) => c.status === 'Closed').length,
    }
  }, [items])

  const requestTransition = (id: string, targetStatus: string) => {
    if (!user) return
    const item = (items as any).find((c: any) => c.id === id)
    if (!item) return
    const check = canTransition('capas', item.status, targetStatus, user.role)
    if (!check.allowed) { alert(check.reason); return }
    if (check.requiresESignature) { setEsigTarget({ id, status: targetStatus }); setEsigOpen(true) }
    else { doTransition(id, targetStatus) }
  }

  const doTransition = async (id: string, newStatus: string) => {
    try { await api.module('/capa').transition(id, newStatus); refetch(); setSheetOpen(false) }
    catch (e: any) { alert(e.message) }
  }

  const handleEsigConfirm = (_p: string, _h: string) => {
    if (esigTarget) { doTransition(esigTarget.id, esigTarget.status); setEsigOpen(false); setEsigTarget(null) }
  }

  const handleRowClick = (row: any) => {
    setSelected(row)
    setDetailTab('info')
    setSheetOpen(true)
    // Load 5-why data if available
    if (row.five_why_analysis) {
      try { const parsed = typeof row.five_why_analysis === 'string' ? JSON.parse(row.five_why_analysis) : row.five_why_analysis; setWhys(parsed.whys || ['', '', '', '', '']); setRootCauseCategory(parsed.root_cause_category || '') } catch { setWhys(['', '', '', '', '']); setRootCauseCategory('') }
    } else { setWhys(['', '', '', '', '']); setRootCauseCategory('') }
    if (row.effectiveness) {
      try { const parsed = typeof row.effectiveness === 'string' ? JSON.parse(row.effectiveness) : row.effectiveness; setEffCriteria(parsed.criteria || ''); setEffResult(parsed.result || '') } catch { setEffCriteria(''); setEffResult('') }
    } else { setEffCriteria(''); setEffResult('') }
  }

  const saveFiveWhy = async () => {
    if (!selected) return
    setSavingAnalysis(true)
    try {
      await api.module('/capa').update(selected.id, {
        five_why_analysis: { whys, root_cause_category: rootCauseCategory },
      })
      await refetch()
    } catch (e: any) { alert(e.message) }
    finally { setSavingAnalysis(false) }
  }

  const saveEffectiveness = async () => {
    if (!selected) return
    setSavingAnalysis(true)
    try {
      await api.module('/capa').update(selected.id, {
        effectiveness: { criteria: effCriteria, result: effResult, pre_check_date: new Date().toISOString(), post_check_date: new Date().toISOString() },
      })
      await refetch()
    } catch (e: any) { alert(e.message) }
    finally { setSavingAnalysis(false) }
  }

  const handleCreate = async () => {
    if (!form.title.trim()) return
    setCreating(true)
    try {
      await create({ title: form.title, capa_type: form.capa_type, priority: form.priority, source: form.source, description: form.description, due_date: form.due_date || undefined, source_id: form.source_id || undefined })
      setNewOpen(false)
      setForm({ title: '', capa_type: 'Corrective', priority: 'Medium', source: 'Non-Conformance', description: '', due_date: '', source_id: '' })
    } catch (e: any) { alert(e.message) }
    finally { setCreating(false) }
  }

  const fmtDate = (d: string) => { try { return new Date(d).toLocaleDateString('fr-FR') } catch { return '—' } }

  const columns = [
    { key: 'capa_number', label: 'N° CAPA', render: (v: any) => v ? <Badge variant="outline" className="font-mono text-xs">{v}</Badge> : '—' },
    { key: 'title', label: 'Titre', sortable: true, render: (v: any) => <span className="font-medium truncate max-w-[200px] block">{v || '—'}</span> },
    { key: 'capa_type', label: 'Type', render: (v: any) => <Badge variant="secondary" className="text-xs">{v === 'Corrective' ? 'Corrective' : 'Préventive'}</Badge> },
    { key: 'priority', label: 'Priorité', render: (v: any) => { const c = PRIORITY_CONFIG[v as CapaPriority]; return c ? <Badge variant="outline" className={`text-xs border ${c.bg} ${c.color}`}>{c.label}</Badge> : v } },
    { key: 'source', label: 'Source', render: (v: any) => <span className="text-xs text-muted-foreground">{SOURCE_LABELS[v as CapaSource] || v}</span> },
    { key: 'status', label: 'Statut', render: (v: any) => <Badge variant="outline" className={`text-xs ${getStatusColor(v)}`}>{v}</Badge> },
    { key: 'due_date', label: 'Échéance', render: (v: any) => <span className={`text-xs ${getDueDateClass(v)}`}>{v ? fmtDate(v) : '—'}</span> },
    { key: 'actions', label: '', className: 'w-28', render: (_v: any, r: any) => (
      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
        {r.status === 'Open' && (
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => requestTransition(r.id, 'Investigation')}>
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
          <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-emerald-600" /> CAPA</h1>
          <p className="text-sm text-muted-foreground">Actions Correctives et Préventives — analyse, mise en œuvre et vérification d&apos;efficacité</p>
        </div>
        <Button onClick={() => setNewOpen(true)}><Plus className="h-4 w-4 mr-2" /> Nouvelle CAPA</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {[
          { label: 'Total', value: stats.total, icon: ArrowLeftRight, color: 'text-slate-600' },
          { label: 'Ouvertes', value: stats.open, icon: AlertTriangle, color: 'text-red-600' },
          { label: 'Investigation', value: stats.investigation, icon: Search, color: 'text-amber-600' },
          { label: 'Mise en œuvre', value: stats.implementation, icon: Target, color: 'text-blue-600' },
          { label: 'Vérification', value: stats.effCheck, icon: Clock, color: 'text-violet-600' },
          { label: 'Clôturées', value: stats.closed, icon: CheckCircle2, color: 'text-green-600' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`h-5 w-5 ${s.color} flex-shrink-0`} />
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
              <Input placeholder="Rechercher par titre ou numéro CAPA..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Statut" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les statuts</SelectItem>
                {CAPA_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Priorité" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Toutes priorités</SelectItem>
                {(['Critical', 'High', 'Medium', 'Low'] as CapaPriority[]).map(s => (
                  <SelectItem key={s} value={s}>{PRIORITY_CONFIG[s].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Source" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Toutes sources</SelectItem>
                {Object.entries(SOURCE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <ResponsiveTable columns={columns} data={filtered as any[]} loading={loading} onRowClick={handleRowClick} emptyMessage="Aucune CAPA trouvée." />

      {/* Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="font-mono text-xs">{selected.capa_number || '—'}</Badge>
                  <Badge variant="secondary" className="text-xs">{selected.capa_type === 'Corrective' ? 'Corrective' : 'Préventive'}</Badge>
                  {selected.title}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <Tabs value={detailTab} onValueChange={setDetailTab}>
                  <TabsList className="w-full">
                    <TabsTrigger value="info" className="flex-1">Informations</TabsTrigger>
                    <TabsTrigger value="five-why" className="flex-1">Analyse 5-Why</TabsTrigger>
                    <TabsTrigger value="effectiveness" className="flex-1">Vérification d&apos;efficacité</TabsTrigger>
                  </TabsList>

                  <TabsContent value="info" className="mt-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label className="text-muted-foreground">Priorité</Label><div className="mt-1"><Badge variant="outline" className={`border ${PRIORITY_CONFIG[selected.priority as CapaPriority]?.bg} ${PRIORITY_CONFIG[selected.priority as CapaPriority]?.color}`}>{PRIORITY_CONFIG[selected.priority as CapaPriority]?.label || selected.priority}</Badge></div></div>
                      <div><Label className="text-muted-foreground">Source</Label><p className="text-sm mt-1">{SOURCE_LABELS[selected.source as CapaSource] || selected.source}</p></div>
                      <div><Label className="text-muted-foreground">Statut</Label><div className="mt-1"><Badge variant="outline" className={getStatusColor(selected.status)}>{selected.status}</Badge></div></div>
                      <div><Label className="text-muted-foreground">Échéance</Label><p className={`text-sm mt-1 ${getDueDateClass(selected.due_date)}`}>{selected.due_date ? fmtDate(selected.due_date) : '—'}</p></div>
                    </div>
                    {selected.description && <div><Label className="text-muted-foreground">Description</Label><p className="text-sm mt-1 whitespace-pre-wrap">{selected.description}</p></div>}
                    {selected.source_id && (
                      <div className="p-3 bg-muted rounded-lg flex items-center gap-2">
                        <Link2 className="h-4 w-4 text-primary" />
                        <span className="text-sm">Source liée : <span className="font-mono font-medium">{selected.source_id}</span></span>
                      </div>
                    )}
                    <Separator />
                    <div>
                      <Label className="text-muted-foreground text-xs uppercase tracking-wider">Workflow</Label>
                      <div className="mt-3 flex items-center gap-1 flex-wrap">
                        {getFlowSteps('capas', selected.status).map((step, i, arr) => (
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
                      {selected.status === 'Open' && <Button size="sm" onClick={() => requestTransition(selected.id, 'Investigation')}><Search className="h-4 w-4 mr-2" /> Démarrer investigation</Button>}
                      {selected.status === 'Investigation' && <Button size="sm" onClick={() => requestTransition(selected.id, 'Implementation')}><Target className="h-4 w-4 mr-2" /> Passer en mise en œuvre</Button>}
                      {selected.status === 'Implementation' && <Button size="sm" onClick={() => requestTransition(selected.id, 'Effectiveness Check')}><Clock className="h-4 w-4 mr-2" /> Vérifier efficacité</Button>}
                      {selected.status === 'Effectiveness Check' && <Button size="sm" onClick={() => requestTransition(selected.id, 'Closed')}><CheckCircle2 className="h-4 w-4 mr-2" /> Clôturer</Button>}
                    </div>
                  </TabsContent>

                  {/* 5-Why Analysis Tab */}
                  <TabsContent value="five-why" className="mt-4 space-y-4">
                    <div className="p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <p className="text-sm text-amber-800 dark:text-amber-300">
                        L&apos;analyse 5-Why permet d&apos;identifier la cause racine en posant la question &quot;Pourquoi ?&quot; cinq fois de suite.
                      </p>
                    </div>
                    {whys.map((w, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <Label className="text-sm font-medium">
                          Pourquoi #{idx + 1} {idx === 4 && <span className="text-xs text-muted-foreground">(Cause racine)</span>}
                        </Label>
                        <Textarea value={w} onChange={e => { const n = [...whys]; n[idx] = e.target.value; setWhys(n) }}
                          placeholder={idx === 0 ? 'Pourquoi cette non-conformité s\'est-elle produite ?' : 'Pourquoi ?'}
                          rows={2} className={idx === 4 ? 'border-amber-300 dark:border-amber-700' : ''} />
                      </div>
                    ))}
                    <div>
                      <Label className="text-sm font-medium">Catégorie de cause racine</Label>
                      <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {ROOT_CAUSE_CATEGORIES.map(cat => (
                          <button key={cat.value} onClick={() => setRootCauseCategory(cat.value)}
                            className={`p-2.5 rounded-lg border text-left text-sm transition-colors flex items-center gap-2 ${
                              rootCauseCategory === cat.value
                                ? 'border-primary bg-primary/5 text-primary font-medium'
                                : 'border-muted hover:bg-muted/50'
                            }`}>
                            <span>{cat.icon}</span> {cat.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Button onClick={saveFiveWhy} disabled={savingAnalysis}>
                      <Save className="h-4 w-4 mr-2" /> {savingAnalysis ? 'Enregistrement...' : 'Enregistrer l\'analyse'}
                    </Button>
                  </TabsContent>

                  {/* Effectiveness Verification Tab */}
                  <TabsContent value="effectiveness" className="mt-4 space-y-4">
                    <div className="p-4 bg-violet-50 dark:bg-violet-950 border border-violet-200 dark:border-violet-800 rounded-lg">
                      <p className="text-sm text-violet-800 dark:text-violet-300">
                        La vérification d&apos;efficacité confirme que les actions correctives/préventives ont résolu le problème de manière durable.
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Critères d&apos;efficacité</Label>
                      <Textarea value={effCriteria} onChange={e => setEffCriteria(e.target.value)}
                        placeholder="Définir les critères mesurables permettant d'évaluer l'efficacité des actions..."
                        rows={3} className="mt-1.5" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Résultat</Label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(['Effective', 'Not Effective', 'Pending Review'] as EffectivenessResult[]).map(r => {
                          const cfg = EFFECTIVENESS_CONFIG[r]
                          return (
                            <button key={r} onClick={() => setEffResult(r)}
                              className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors flex items-center gap-2 ${
                                effResult === r ? `border-primary ${cfg.bg} ${cfg.color}` : 'border-muted hover:bg-muted/50'
                              }`}>
                              {r === 'Effective' && <CheckCircle2 className="h-4 w-4" />}
                              {r === 'Not Effective' && <AlertTriangle className="h-4 w-4" />}
                              {r === 'Pending Review' && <HelpCircle className="h-4 w-4" />}
                              {cfg.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <div className="p-3 border-2 border-dashed border-muted rounded-lg text-center text-sm text-muted-foreground">
                      📎 Zone de téléchargement de preuves (fonctionnalité à venir)
                    </div>
                    <Button onClick={saveEffectiveness} disabled={savingAnalysis}>
                      <Save className="h-4 w-4 mr-2" /> {savingAnalysis ? 'Enregistrement...' : 'Enregistrer la vérification'}
                    </Button>
                  </TabsContent>
                </Tabs>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* New CAPA Dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouvelle CAPA</DialogTitle>
            <DialogDescription>Créer une action corrective ou préventive</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label>Titre *</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Titre de la CAPA" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select value={form.capa_type} onValueChange={v => setForm(p => ({ ...p, capa_type: v as CapaType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Corrective">Corrective</SelectItem>
                    <SelectItem value="Preventive">Préventive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priorité</Label>
                <Select value={form.priority} onValueChange={v => setForm(p => ({ ...p, priority: v as CapaPriority }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['Critical', 'High', 'Medium', 'Low'] as CapaPriority[]).map(s => (
                      <SelectItem key={s} value={s}>{PRIORITY_CONFIG[s].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Source</Label>
                <Select value={form.source} onValueChange={v => setForm(p => ({ ...p, source: v as CapaSource }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(SOURCE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Échéance</Label>
                <Input type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
              </div>
            </div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Description de la CAPA..." rows={3} /></div>
            <div><Label>ID source (optionnel)</Label><Input value={form.source_id} onChange={e => setForm(p => ({ ...p, source_id: e.target.value }))} placeholder="Ex: NCR-2025-001" /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNewOpen(false)}>Annuler</Button>
            <Button onClick={handleCreate} disabled={!form.title.trim() || creating}>{creating ? 'Création...' : 'Créer la CAPA'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ElectronicSignatureModal open={esigOpen} title="Signature électronique requise" description="Transition de statut CAPA — confirmation par signature 21 CFR Part 11" recordId={esigTarget?.id} recordType="capa" onConfirm={handleEsigConfirm} onCancel={() => { setEsigOpen(false); setEsigTarget(null) }} />
    </div>
  )
}