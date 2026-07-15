'use client'

import { useState, useMemo, useCallback } from 'react'
import { useModule } from '@/hooks/useModule'
import { getFlowSteps, canTransition, isESigRequired } from '@/lib/status-flows'
import { getStatusColor } from '@/lib/status-colors'
import { ResponsiveTable } from '@/components/shared/ResponsiveTable'
import { ElectronicSignatureModal } from '@/components/shared/ElectronicSignatureModal'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { AlertTriangle, Plus, Search, ChevronRight, AlertOctagon, Zap, ShieldAlert, Link2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import type { NcrType, NcrSeverity, NcrStatus, NcrDisposition } from '@/types/qms'

const NCR_TYPE_LABELS: Record<NcrType, string> = {
  Product: 'Produit', Process: 'Processus', System: 'Système',
  Supplier: 'Fournisseur', OOS: 'Hors spécification', OOT: 'Hors tendance',
}

const SEVERITY_CONFIG: Record<NcrSeverity, { color: string; bg: string; label: string }> = {
  Critical: { color: 'text-red-700', bg: 'bg-red-100 border-red-300 dark:bg-red-950 dark:border-red-800', label: 'Critique' },
  Major: { color: 'text-amber-700', bg: 'bg-amber-100 border-amber-300 dark:bg-amber-950 dark:border-amber-800', label: 'Majeur' },
  Minor: { color: 'text-slate-600', bg: 'bg-slate-100 border-slate-300 dark:bg-slate-800 dark:border-slate-600', label: 'Mineur' },
}

const DISPOSITION_LABELS: Record<NcrDisposition, string> = {
  'Use As Is': 'Utiliser tel quel', Rework: 'Retraitement', Scrap: 'Rebut',
  'Return to Supplier': 'Retour fournisseur', Concession: 'Dérogation', Pending: 'En attente',
}

const NCR_STATUSES: NcrStatus[] = ['Open', 'Under Investigation', 'Pending Disposition', 'Closed']

export default function NcrView() {
  const { user } = useAuth()
  const { items, loading, create, update, refetch } = useModule('/ncr')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [severityFilter, setSeverityFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [selected, setSelected] = useState<any>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [newOpen, setNewOpen] = useState(false)
  const [esigOpen, setEsigOpen] = useState(false)
  const [esigTarget, setEsigTarget] = useState<{ id: string; status: string } | null>(null)

  const [form, setForm] = useState({
    title: '', ncr_type: 'Product' as NcrType, severity: 'Minor' as NcrSeverity,
    description: '', product_name: '', lot_number: '', initial_assessment: '',
  })
  const [creating, setCreating] = useState(false)

  const filtered = useMemo(() => {
    let list = items
    if (search) { const q = search.toLowerCase(); list = list.filter((n: any) => (n.title || '').toLowerCase().includes(q) || (n.ncr_number || '').toLowerCase().includes(q)) }
    if (statusFilter !== 'ALL') list = list.filter((n: any) => n.status === statusFilter)
    if (severityFilter !== 'ALL') list = list.filter((n: any) => n.severity === severityFilter)
    if (typeFilter !== 'ALL') list = list.filter((n: any) => n.ncr_type === typeFilter)
    return list
  }, [items, search, statusFilter, severityFilter, typeFilter])

  const stats = useMemo(() => {
    const all = items
    return {
      total: all.length,
      open: all.filter((n: any) => n.status === 'Open').length,
      investigation: all.filter((n: any) => n.status === 'Under Investigation').length,
      disposition: all.filter((n: any) => n.status === 'Pending Disposition').length,
      closed: all.filter((n: any) => n.status === 'Closed').length,
    }
  }, [items])

  const requestTransition = (id: string, targetStatus: string) => {
    if (!user) return
    const item = (items as any).find((n: any) => n.id === id)
    if (!item) return
    const check = canTransition('ncrs', item.status, targetStatus, user.role)
    if (!check.allowed) { alert(check.reason); return }
    if (check.requiresESignature) {
      setEsigTarget({ id, status: targetStatus }); setEsigOpen(true)
    } else { doTransition(id, targetStatus) }
  }

  const doTransition = async (id: string, newStatus: string) => {
    try {
      const m = (await import('@/lib/api-client')).api
      await m.module('/ncr').transition(id, newStatus)
      refetch(); setSheetOpen(false)
    } catch (e: any) { alert(e.message) }
  }

  const handleEsigConfirm = (_p: string, _h: string) => {
    if (esigTarget) { doTransition(esigTarget.id, esigTarget.status); setEsigOpen(false); setEsigTarget(null) }
  }

  const handleCreate = async () => {
    if (!form.title.trim()) return
    setCreating(true)
    try {
      await create({ title: form.title, ncr_type: form.ncr_type, severity: form.severity, description: form.description, product_name: form.product_name, lot_number: form.lot_number, initial_assessment: form.initial_assessment })
      setNewOpen(false)
      setForm({ title: '', ncr_type: 'Product', severity: 'Minor', description: '', product_name: '', lot_number: '', initial_assessment: '' })
    } catch (e: any) { alert(e.message) }
    finally { setCreating(false) }
  }

  const fmtDate = (d: string) => { try { return new Date(d).toLocaleDateString('fr-FR') } catch { return '—' } }

  const columns = [
    { key: 'ncr_number', label: 'N° NCR', render: (v: any) => v ? <Badge variant="outline" className="font-mono text-xs">{v}</Badge> : '—' },
    { key: 'title', label: 'Titre', sortable: true, render: (v: any) => <span className="font-medium truncate max-w-[200px] block">{v || '—'}</span> },
    { key: 'ncr_type', label: 'Type', render: (v: any) => <Badge variant="secondary" className="text-xs">{NCR_TYPE_LABELS[v as NcrType] || v}</Badge> },
    { key: 'severity', label: 'Sévérité', render: (v: any) => { const c = SEVERITY_CONFIG[v as NcrSeverity]; return c ? <Badge variant="outline" className={`text-xs border ${c.bg} ${c.color}`}>{c.label}</Badge> : v } },
    { key: 'status', label: 'Statut', render: (v: any) => <Badge variant="outline" className={`text-xs ${getStatusColor(v)}`}>{v}</Badge> },
    { key: 'created_at', label: 'Date', sortable: true, render: (v: any) => fmtDate(v) },
    { key: 'actions', label: '', className: 'w-24', render: (_v: any, r: any) => (
      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
        {r.status === 'Open' && (
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => requestTransition(r.id, 'Under Investigation')}>
            <Zap className="h-3.5 w-3.5 mr-1" /> Investiguer
          </Button>
        )}
      </div>
    )},
  ]

  const statCards = [
    { label: 'Total', value: stats.total, icon: AlertOctagon, color: 'text-slate-600' },
    { label: 'Ouvertes', value: stats.open, icon: AlertTriangle, color: 'text-red-600' },
    { label: 'Investigation', value: stats.investigation, icon: Search, color: 'text-amber-600' },
    { label: 'Disposition', value: stats.disposition, icon: ShieldAlert, color: 'text-orange-600' },
    { label: 'Clôturées', value: stats.closed, icon: AlertTriangle, color: 'text-green-600' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><AlertOctagon className="h-6 w-6 text-red-600" /> Non-Conformités (NCR)</h1>
          <p className="text-sm text-muted-foreground">Identification, investigation et disposition des non-conformités</p>
        </div>
        <Button onClick={() => setNewOpen(true)}><Plus className="h-4 w-4 mr-2" /> Nouvelle NCR</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {statCards.map(s => (
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
                {NCR_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Sévérité" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Toutes sévérités</SelectItem>
                {(['Critical', 'Major', 'Minor'] as NcrSeverity[]).map(s => (
                  <SelectItem key={s} value={s}>{SEVERITY_CONFIG[s].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les types</SelectItem>
                {Object.entries(NCR_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <ResponsiveTable columns={columns} data={filtered as any[]} loading={loading} onRowClick={r => { setSelected(r); setSheetOpen(true) }} emptyMessage="Aucune non-conformité trouvée." />

      {/* Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="font-mono text-xs">{selected.ncr_number || '—'}</Badge>
                  {selected.severity === 'Critical' && <Badge className="bg-red-600 text-white text-xs animate-pulse"><AlertTriangle className="h-3 w-3 mr-1" /> CRITIQUE</Badge>}
                  {selected.title}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-muted-foreground">Type</Label><p className="text-sm font-medium mt-1">{NCR_TYPE_LABELS[selected.ncr_type] || selected.ncr_type}</p></div>
                  <div><Label className="text-muted-foreground">Sévérité</Label><p className="mt-1"><Badge variant="outline" className={`border ${SEVERITY_CONFIG[selected.severity as NcrSeverity]?.bg} ${SEVERITY_CONFIG[selected.severity as NcrSeverity]?.color}`}>{SEVERITY_CONFIG[selected.severity as NcrSeverity]?.label || selected.severity}</Badge></p></div>
                  <div><Label className="text-muted-foreground">Statut</Label><div className="mt-1"><Badge variant="outline" className={getStatusColor(selected.status)}>{selected.status}</Badge></div></div>
                  <div><Label className="text-muted-foreground">Produit / Lot</Label><p className="text-sm mt-1">{selected.product_name || '—'} {selected.lot_number ? `— ${selected.lot_number}` : ''}</p></div>
                </div>
                {selected.description && <div><Label className="text-muted-foreground">Description</Label><p className="text-sm mt-1 whitespace-pre-wrap">{selected.description}</p></div>}
                {selected.initial_assessment && <div><Label className="text-muted-foreground">Évaluation initiale</Label><p className="text-sm mt-1 whitespace-pre-wrap">{selected.initial_assessment}</p></div>}

                {/* Disposition section */}
                {selected.status === 'Pending Disposition' && (
                  <div className="p-4 border border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800 rounded-lg">
                    <h4 className="font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2 mb-3"><ShieldAlert className="h-4 w-4" /> Disposition requise</h4>
                    <div className="flex flex-wrap gap-2">
                      {(['Use As Is', 'Rework', 'Scrap', 'Return to Supplier', 'Concession'] as NcrDisposition[]).map(d => (
                        <Button key={d} size="sm" variant="outline" onClick={() => { update(selected.id, { disposition: d }); requestTransition(selected.id, 'Closed') }}>
                          {DISPOSITION_LABELS[d]}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {selected.capa_id && (
                  <div className="p-3 bg-muted rounded-lg flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-primary" />
                    <span className="text-sm">CAPA associée : <span className="font-mono font-medium">{selected.capa_id}</span></span>
                  </div>
                )}

                {selected.severity === 'Critical' && (
                  <div className="p-3 border border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800 rounded-lg flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span className="text-sm text-red-700 dark:text-red-400 font-medium">Escalade requise — NCR critique nécessitant une action immédiate de la direction</span>
                  </div>
                )}

                <Separator />
                <div>
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider">Workflow</Label>
                  <div className="mt-3 flex items-center gap-1 flex-wrap">
                    {getFlowSteps('ncrs', selected.status).map((step, i, arr) => (
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
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* New NCR Dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouvelle non-conformité</DialogTitle>
            <DialogDescription>Enregistrer une nouvelle NCR dans le système qualité</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label>Titre *</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Titre de la NCR" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select value={form.ncr_type} onValueChange={v => setForm(p => ({ ...p, ncr_type: v as NcrType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(NCR_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sévérité</Label>
                <Select value={form.severity} onValueChange={v => setForm(p => ({ ...p, severity: v as NcrSeverity }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{(['Critical', 'Major', 'Minor'] as NcrSeverity[]).map(s => <SelectItem key={s} value={s}>{SEVERITY_CONFIG[s].label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Description *</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Description détaillée de la non-conformité..." rows={3} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Produit</Label><Input value={form.product_name} onChange={e => setForm(p => ({ ...p, product_name: e.target.value }))} placeholder="Nom du produit" /></div>
              <div><Label>N° de lot</Label><Input value={form.lot_number} onChange={e => setForm(p => ({ ...p, lot_number: e.target.value }))} placeholder="N° de lot" /></div>
            </div>
            <div><Label>Évaluation initiale</Label><Textarea value={form.initial_assessment} onChange={e => setForm(p => ({ ...p, initial_assessment: e.target.value }))} placeholder="Évaluation initiale de la non-conformité..." rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNewOpen(false)}>Annuler</Button>
            <Button onClick={handleCreate} disabled={!form.title.trim() || creating}>{creating ? 'Création...' : 'Créer la NCR'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ElectronicSignatureModal open={esigOpen} title="Signature électronique requise" description="Transition de statut NCR — confirmation par signature 21 CFR Part 11" recordId={esigTarget?.id} recordType="ncr" onConfirm={handleEsigConfirm} onCancel={() => { setEsigOpen(false); setEsigTarget(null) }} />
    </div>
  )
}