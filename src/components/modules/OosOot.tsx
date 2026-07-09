'use client'

import { useShallow } from 'zustand/react/shallow'
import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/contexts/AuthContext'
import { useQmsStore } from '@/lib/demo-store'
import { useToast } from '@/hooks/use-toast'
import { useRecordWorkflow } from '@/hooks/useRecordWorkflow'
import { ElectronicSignatureModal } from '@/components/shared/ElectronicSignatureModal'
import { RecordLinkPanel } from '@/components/shared/RecordLinkPanel'
import { FlaskConical, Plus, Pencil, Trash2, ArrowRight, AlertTriangle, CheckCircle2, XCircle, Beaker } from 'lucide-react'
import type { NonConformance, Phase1Conclusion, Phase2Conclusion } from '@/types/qms'

// ============================================================================
// Barr Decision Tree constants
// ============================================================================
const PHASE1_CONCLUSIONS: { value: Phase1Conclusion; label: string; color: string }[] = [
  { value: 'Assignable Cause Found', label: 'Cause assignable identifiée', color: 'text-amber-600' },
  { value: 'No Assignable Cause Found', label: 'Aucune cause assignable', color: 'text-red-600' },
  { value: 'Error Found', label: 'Erreur analytique trouvée', color: 'text-blue-600' },
  { value: 'No Error Found', label: 'Aucune erreur analytique', color: 'text-red-600' },
  { value: 'Pending', label: 'En attente', color: 'text-slate-500' },
]

const PHASE2_CONCLUSIONS: { value: Phase2Conclusion; label: string; color: string }[] = [
  { value: 'Confirmed OOS', label: 'OOS confirmé', color: 'text-red-600' },
  { value: 'Invalidated', label: 'OOS invalidé', color: 'text-green-600' },
  { value: 'Pending', label: 'En attente', color: 'text-slate-500' },
]

export function OosOotView() {
  const { profile, hasPermission } = useAuth()
  const orgId = profile?.organizationId || ''
  const allNcrs = useQmsStore(useShallow(s => s.ncrs)).filter(n => n.organizationId === orgId && n.isOosOot)
  const createNcr = useQmsStore(s => s.createNcr)
  const updateNcr = useQmsStore(s => s.updateNcr)
  const deleteNcr = useQmsStore(s => s.deleteNcr)
  const { toast } = useToast()
  const { canTransition, getNextStatuses, isESigRequired, isTerminal } = useRecordWorkflow()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')  // OOS or OOT
  const [editing, setEditing] = useState<NonConformance | null>(null)
  const [viewing, setViewing] = useState<NonConformance | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [pendingTransition, setPendingTransition] = useState<{ id: string; target: string } | null>(null)

  const filtered = useMemo(() => {
    let list = allNcrs
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(n => n.ncrNumber.toLowerCase().includes(q) || n.title.toLowerCase().includes(q) || (n.lotNumber || '').toLowerCase().includes(q))
    }
    if (statusFilter !== 'ALL') list = list.filter(n => n.status === statusFilter)
    if (typeFilter !== 'ALL') list = list.filter(n => n.ncrType === typeFilter)
    return list
  }, [allNcrs, search, statusFilter, typeFilter])

  const handleAdvance = (record: NonConformance, target: string) => {
    if (!profile) return
    const check = canTransition('oos_oot', record.status, target, profile.role)
    if (!check.allowed) { toast({ title: 'Transition refusée', description: check.reason, variant: 'destructive' }); return }
    if (check.requiresESignature) setPendingTransition({ id: record.id, target })
    else {
      updateNcr(orgId, profile.id, record.id, { status: target } as any)
      setViewing(null)
      toast({ title: `Statut → ${target}` })
    }
  }

  const handleSigConfirm = (_pwd: string, hash: string) => {
    if (!pendingTransition || !profile) return
    updateNcr(orgId, profile.id, pendingTransition.id, {
      status: pendingTransition.target,
      closedSignatureHash: hash,
      closedSignedAt: new Date().toISOString(),
      closedById: profile.id,
    } as any)
    setPendingTransition(null)
    setViewing(null)
    toast({ title: `Statut → ${pendingTransition.target} (signé)` })
  }

  const statusBadgeClass = (s: string) => {
    const m: Record<string, string> = {
      Open: 'bg-red-100 text-red-700 border-red-200',
      'Under Investigation': 'bg-amber-100 text-amber-700 border-amber-200',
      'Pending Disposition': 'bg-amber-100 text-amber-700 border-amber-200',
      Closed: 'bg-green-100 text-green-700 border-green-200',
    }
    return m[s] || 'bg-slate-100 text-slate-700'
  }

  const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString('fr-FR') : '—'

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FlaskConical className="h-6 w-6 text-emerald-600" /> OOS / OOT (HSP / HOT)</h1>
          <p className="text-sm text-muted-foreground">Hors Spécification / Hors Tendance — Barr Decision Tree (ISO 13485 §8.2.6)</p>
        </div>
        {hasPermission('ncr.create' as any) && (
          <Button onClick={() => { setEditing(null); setShowForm(true) }}>
            <Plus className="h-4 w-4 mr-2" /> Nouveau OOS/OOT
          </Button>
        )}
      </div>

      {/* Barr Decision Tree info banner */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4 text-sm">
          <div className="flex items-start gap-2">
            <Beaker className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900">Barr Decision Tree</p>
              <p className="text-blue-800 text-xs mt-1">
                Le résultat OOS doit être investigué selon le Barr Decision Tree :
                <strong> Phase I</strong> (investigation laboratoire — recherche de cause assignable ou d'erreur analytique) puis,
                si aucune cause n'est identifiée, <strong>Phase II</strong> (investigation de production — confirmation ou invalidation de l'OOS).
                Un OOS confirmé entraîne le rejet du lot et la création d'une CAPA.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 flex flex-col gap-3 md:flex-row">
          <Input placeholder="Rechercher (N°, titre, lot)…" value={search} onChange={e => setSearch(e.target.value)} className="flex-1" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous statuts</SelectItem>
              <SelectItem value="Open">Ouvert</SelectItem>
              <SelectItem value="Under Investigation">Investigation</SelectItem>
              <SelectItem value="Pending Disposition">Disposition</SelectItem>
              <SelectItem value="Closed">Clôturé</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full md:w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous</SelectItem>
              <SelectItem value="OOS">OOS</SelectItem>
              <SelectItem value="OOT">OOT</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Aucun OOS/OOT enregistré</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map(n => (
            <Card key={n.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setViewing(n)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge variant="outline" className="font-mono text-xs">{n.ncrNumber}</Badge>
                      <Badge variant="outline" className={`text-xs ${n.ncrType === 'OOS' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{n.ncrType}</Badge>
                      <Badge variant="outline" className={`text-xs ${statusBadgeClass(n.status)}`}>{n.status}</Badge>
                      {n.severity === 'Critical' && <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">Critique</Badge>}
                      {n.rejectLot && <Badge variant="outline" className="text-xs bg-red-100 text-red-700 border-red-200">Lot à rejeter</Badge>}
                    </div>
                    <h3 className="font-medium truncate">{n.title}</h3>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2 flex-wrap">
                      {n.lotNumber && <span>Lot: {n.lotNumber}</span>}
                      {n.analyticalMethod && <span>Méthode: {n.analyticalMethod}</span>}
                      {n.measuredValue != null && <span>Mesuré: {n.measuredValue} {n.measuredUnit}</span>}
                      {n.specLimit && <span>Spec: {n.specLimit}</span>}
                    </div>
                    {/* Phase indicators */}
                    <div className="flex items-center gap-2 mt-2">
                      {n.phase1Conclusion && (
                        <Badge variant="outline" className={`text-xs ${n.phase1Conclusion === 'Assignable Cause Found' || n.phase1Conclusion === 'Error Found' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                          Phase I: {n.phase1Conclusion}
                        </Badge>
                      )}
                      {n.phase2Required && (
                        <Badge variant="outline" className={`text-xs ${n.phase2Conclusion === 'Invalidated' ? 'bg-green-50 text-green-700' : n.phase2Conclusion === 'Confirmed OOS' ? 'bg-red-50 text-red-700' : ''}`}>
                          Phase II: {n.phase2Conclusion || 'En cours'}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <OosOotForm
          record={editing}
          onClose={() => setShowForm(false)}
          onSave={(data) => {
            if (editing) {
              updateNcr(orgId, profile?.id || '', editing.id, data)
              toast({ title: 'OOS/OOT mis à jour' })
            } else {
              createNcr(orgId, profile?.id || '', data)
              toast({ title: 'OOS/OOT créé' })
            }
            setShowForm(false)
          }}
        />
      )}

      {viewing && !showForm && (
        <OosOotViewDialog
          record={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => { setEditing(viewing); setViewing(null); setShowForm(true) }}
          onAdvance={handleAdvance}
          getNextStatuses={(status) => getNextStatuses('oos_oot', status)}
          isTerminal={(status) => isTerminal('oos_oot', status)}
          isESigRequired={(target) => isESigRequired('oos_oot', target)}
          canEdit={hasPermission('ncr.update' as any)}
          canDelete={hasPermission('ncr.delete' as any)}
          onDelete={() => { if (confirm('Supprimer ?')) { deleteNcr(orgId, profile?.id || '', viewing.id); setViewing(null); toast({ title: 'Supprimé' }) } }}
          statusBadgeClass={statusBadgeClass}
          fmtDate={fmtDate}
        />
      )}

      {pendingTransition && (
        <ElectronicSignatureModal
          open
          title="Confirmer la clôture OOS/OOT"
          description={`Passer le statut à "${pendingTransition.target}". Cette action nécessite votre signature électronique (21 CFR Part 11).`}
          onConfirm={handleSigConfirm}
          onCancel={() => setPendingTransition(null)}
        />
      )}
    </div>
  )
}

// ============================================================================
// Form dialog
// ============================================================================
function OosOotForm({ record, onClose, onSave }: {
  record: NonConformance | null
  onClose: () => void
  onSave: (data: Partial<NonConformance>) => void
}) {
  const [form, setForm] = useState({
    title: record?.title || '',
    ncrType: record?.ncrType || 'OOS' as 'OOS' | 'OOT',
    severity: record?.severity || 'Major',
    source: record?.source || 'Laboratoire QC',
    description: record?.description || '',
    lotNumber: record?.lotNumber || '',
    quantityAffected: record?.quantityAffected || '',
    analyticalMethod: record?.analyticalMethod || '',
    measuredValue: record?.measuredValue ?? '',
    measuredUnit: record?.measuredUnit || '',
    specLimit: record?.specLimit || '',
    // Phase I
    phase1Conclusion: record?.phase1Conclusion || 'Pending' as Phase1Conclusion,
    // Phase II
    phase2Required: record?.phase2Required || false,
    phase2Conclusion: record?.phase2Conclusion || 'Pending' as Phase2Conclusion,
    rejectLot: record?.rejectLot || false,
    disposition: record?.disposition || 'Pending',
    affectedProduct: record?.affectedProduct || '',
    containmentActions: record?.containmentActions || '',
    impactAssessment: record?.impactAssessment || '',
    dueDate: record?.dueDate ? String(record.dueDate).split('T')[0] : '',
  })
  const [error, setError] = useState('')

  const handleSave = () => {
    if (!form.title) { setError('Titre requis'); return }
    onSave({
      ...form,
      measuredValue: form.measuredValue === '' ? undefined : Number(form.measuredValue),
      isOosOot: true,
      status: record?.status || 'Open',
    } as any)
  }

  // Auto-determine rejectLot based on phase2Conclusion
  const autoReject = form.phase2Conclusion === 'Confirmed OOS'

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FlaskConical className="h-5 w-5" /> {record ? 'Modifier' : 'Nouvel'} OOS/OOT</DialogTitle>
          <DialogDescription>Investigation selon Barr Decision Tree</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div><Label>Titre *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={form.ncrType} onValueChange={v => setForm({ ...form, ncrType: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="OOS">OOS (Hors Spécification)</SelectItem><SelectItem value="OOT">OOT (Hors Tendance)</SelectItem></SelectContent>
              </Select>
            </div>
            <div>
              <Label>Sévérité</Label>
              <Select value={form.severity} onValueChange={v => setForm({ ...form, severity: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Critical">Critique</SelectItem><SelectItem value="Major">Majeure</SelectItem><SelectItem value="Minor">Mineure</SelectItem></SelectContent>
              </Select>
            </div>
            <div>
              <Label>Source</Label>
              <Input value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} />
            </div>
          </div>
          <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} /></div>

          {/* Spécification et mesure */}
          <div className="border-t pt-3">
            <div className="text-sm font-medium mb-2">Spécification et mesure</div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Méthode analytique</Label><Input value={form.analyticalMethod} onChange={e => setForm({ ...form, analyticalMethod: e.target.value })} placeholder="HPLC-001" /></div>
              <div><Label>Valeur mesurée</Label><Input type="number" value={form.measuredValue} onChange={e => setForm({ ...form, measuredValue: e.target.value === '' ? '' : Number(e.target.value) })} /></div>
              <div><Label>Unité</Label><Input value={form.measuredUnit} onChange={e => setForm({ ...form, measuredUnit: e.target.value })} placeholder="mg/L" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-2">
              <div><Label>Limite spec</Label><Input value={form.specLimit} onChange={e => setForm({ ...form, specLimit: e.target.value })} placeholder="≤ 0.5 mg/L" /></div>
              <div><Label>N° Lot</Label><Input value={form.lotNumber} onChange={e => setForm({ ...form, lotNumber: e.target.value })} /></div>
              <div><Label>Quantité affectée</Label><Input value={form.quantityAffected} onChange={e => setForm({ ...form, quantityAffected: e.target.value })} /></div>
            </div>
          </div>

          {/* Phase I - Laboratory Investigation */}
          <div className="border-t pt-3">
            <div className="text-sm font-medium mb-2 flex items-center gap-2"><Beaker className="h-4 w-4 text-blue-600" /> Phase I — Investigation Laboratoire</div>
            <div className="text-xs text-muted-foreground mb-2">Recherche de cause assignable ou d'erreur analytique dans le laboratoire.</div>
            <div>
              <Label>Conclusion Phase I</Label>
              <Select value={form.phase1Conclusion} onValueChange={v => {
                const conclusion = v as Phase1Conclusion
                setForm({
                  ...form,
                  phase1Conclusion: conclusion,
                  // If assignable cause or error found, Phase II not required
                  phase2Required: conclusion === 'No Assignable Cause Found' || conclusion === 'No Error Found',
                })
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PHASE1_CONCLUSIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {(form.phase1Conclusion === 'Assignable Cause Found' || form.phase1Conclusion === 'Error Found') && (
              <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                <AlertTriangle className="h-3 w-3 inline mr-1" />
                Cause assignable/erreur trouvée : le résultat OOS est invalidé. Phase II non requise.
              </div>
            )}
          </div>

          {/* Phase II - Production Investigation */}
          {form.phase2Required && (
            <div className="border-t pt-3">
              <div className="text-sm font-medium mb-2 flex items-center gap-2"><FlaskConical className="h-4 w-4 text-red-600" /> Phase II — Investigation Production</div>
              <div className="text-xs text-muted-foreground mb-2">Investigation complète de la production pour confirmer ou invalider l'OOS.</div>
              <div>
                <Label>Conclusion Phase II</Label>
                <Select value={form.phase2Conclusion} onValueChange={v => {
                  const conclusion = v as Phase2Conclusion
                  setForm({ ...form, phase2Conclusion: conclusion, rejectLot: conclusion === 'Confirmed OOS' })
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PHASE2_CONCLUSIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {form.phase2Conclusion === 'Confirmed OOS' && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
                  <XCircle className="h-3 w-3 inline mr-1" />
                  OOS confirmé : le lot doit être rejeté et une CAPA doit être créée.
                </div>
              )}
              {form.phase2Conclusion === 'Invalidated' && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-800">
                  <CheckCircle2 className="h-3 w-3 inline mr-1" />
                  OOS invalidé : le lot peut être libéré (avec justification documentée).
                </div>
              )}
            </div>
          )}

          {/* Disposition & Impact */}
          <div className="border-t pt-3">
            <div className="text-sm font-medium mb-2">Disposition et impact</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Disposition</Label>
                <Select value={form.disposition} onValueChange={v => setForm({ ...form, disposition: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">En attente</SelectItem>
                    <SelectItem value="Use As Is">Utiliser tel quel</SelectItem>
                    <SelectItem value="Rework">Retravailler</SelectItem>
                    <SelectItem value="Scrap">Mettre au rebut</SelectItem>
                    <SelectItem value="Return to Supplier">Retourner au fournisseur</SelectItem>
                    <SelectItem value="Concession">Concession</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 p-2 border rounded w-full">
                  <input type="checkbox" checked={form.rejectLot || autoReject} disabled={autoReject} onChange={e => setForm({ ...form, rejectLot: e.target.checked })} />
                  <span className="text-sm">Rejeter le lot</span>
                </label>
              </div>
            </div>
            <div className="mt-2"><Label>Produit affecté</Label><Input value={form.affectedProduct} onChange={e => setForm({ ...form, affectedProduct: e.target.value })} /></div>
            <div className="mt-2"><Label>Actions de confinement</Label><Textarea value={form.containmentActions} onChange={e => setForm({ ...form, containmentActions: e.target.value })} rows={2} /></div>
            <div className="mt-2"><Label>Évaluation d'impact</Label><Textarea value={form.impactAssessment} onChange={e => setForm({ ...form, impactAssessment: e.target.value })} rows={2} /></div>
            <div className="mt-2"><Label>Échéance</Label><Input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} /></div>
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSave}>{record ? 'Mettre à jour' : 'Créer'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// View dialog with Barr tree visualization
// ============================================================================
function OosOotViewDialog({ record, onClose, onEdit, onAdvance, getNextStatuses, isTerminal, isESigRequired, canEdit, canDelete, onDelete, statusBadgeClass, fmtDate }: any) {
  const nextStatuses = getNextStatuses(record.status)
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2 flex-wrap">
            <FlaskConical className="h-5 w-5" />
            {record.title}
            <Badge variant="outline" className={record.ncrType === 'OOS' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}>{record.ncrType}</Badge>
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2 flex-wrap mt-2">
            <Badge variant="outline" className="font-mono">{record.ncrNumber}</Badge>
            <Badge variant="outline" className={statusBadgeClass(record.status)}>{record.status}</Badge>
            <Badge variant="outline">{record.severity}</Badge>
            {record.rejectLot && <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200">Lot à rejeter</Badge>}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="barr">Barr Decision Tree</TabsTrigger>
            <TabsTrigger value="links">Liens</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">N° Lot:</span> {record.lotNumber || '—'}</div>
              <div><span className="text-muted-foreground">Quantité affectée:</span> {record.quantityAffected || '—'}</div>
              <div><span className="text-muted-foreground">Méthode analytique:</span> {record.analyticalMethod || '—'}</div>
              <div><span className="text-muted-foreground">Valeur mesurée:</span> {record.measuredValue ?? '—'} {record.measuredUnit || ''}</div>
              <div><span className="text-muted-foreground">Limite spec:</span> {record.specLimit || '—'}</div>
              <div><span className="text-muted-foreground">Produit affecté:</span> {record.affectedProduct || '—'}</div>
              <div><span className="text-muted-foreground">Disposition:</span> {record.disposition}</div>
              <div><span className="text-muted-foreground">Échéance:</span> {fmtDate(record.dueDate)}</div>
            </div>
            {record.description && <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-900 rounded border text-sm"><span className="font-medium">Description:</span> {record.description}</div>}
            {record.containmentActions && <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-900 rounded border text-sm"><span className="font-medium">Actions de confinement:</span> {record.containmentActions}</div>}
            {record.impactAssessment && <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-900 rounded border text-sm"><span className="font-medium">Évaluation d'impact:</span> {record.impactAssessment}</div>}

            {nextStatuses.length > 0 && (
              <div className="mt-4 p-3 border rounded-lg bg-slate-50 dark:bg-slate-900">
                <div className="text-sm font-medium mb-2 flex items-center gap-2"><ArrowRight className="h-4 w-4" /> Transitions disponibles</div>
                <div className="flex flex-wrap gap-2">
                  {nextStatuses.map((s: string) => (
                    <Button key={s} size="sm" variant="outline" onClick={() => onAdvance(record, s)}>
                      {s}
                      {isESigRequired(s) && <Badge variant="secondary" className="ml-1 text-xs">E-sig</Badge>}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {isTerminal(record.status) && (
              <div className="mt-4 p-3 border rounded-lg bg-green-50 text-green-700 text-sm">Statut terminal atteint</div>
            )}
          </TabsContent>

          <TabsContent value="barr" className="mt-4">
            <BarrDecisionTreeVisualization record={record} />
          </TabsContent>

          <TabsContent value="links" className="mt-4">
            <RecordLinkPanel recordId={record.id} recordType="oos_oot" recordLabel={`${record.ncrNumber} — ${record.title}`} />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          {canDelete && <Button variant="ghost" onClick={onDelete} className="text-red-600"><Trash2 className="h-4 w-4 mr-2" /> Supprimer</Button>}
          {canEdit && <Button onClick={onEdit}><Pencil className="h-4 w-4 mr-2" /> Modifier</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// Barr Decision Tree visualization
// ============================================================================
function BarrDecisionTreeVisualization({ record }: { record: NonConformance }) {
  const phase1 = record.phase1Conclusion || 'Pending'
  const phase2Required = record.phase2Required
  const phase2 = record.phase2Conclusion || 'Pending'

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Visualisation du Barr Decision Tree pour ce résultat OOS/OOT.
      </div>

      {/* Result */}
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <div>
              <div className="font-medium text-red-900">Résultat OOS/OOT détecté</div>
              <div className="text-xs text-red-700">
                Valeur mesurée: {record.measuredValue ?? '—'} {record.measuredUnit} · Spec: {record.specLimit || '—'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center"><ArrowRight className="h-5 w-5 text-slate-400 rotate-90" /></div>

      {/* Phase I */}
      <Card className={phase1 === 'Pending' ? 'border-slate-300' : phase1 === 'Assignable Cause Found' || phase1 === 'Error Found' ? 'border-amber-300 bg-amber-50' : 'border-red-300 bg-red-50'}>
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Beaker className="h-4 w-4" /> Phase I — Investigation Laboratoire</CardTitle></CardHeader>
        <CardContent>
          <div className="text-sm">
            <div className="mb-2">Recherche de cause assignable ou d'erreur analytique.</div>
            <Badge variant="outline" className={phase1 === 'Assignable Cause Found' || phase1 === 'Error Found' ? 'bg-amber-100 text-amber-700' : phase1 === 'Pending' ? '' : 'bg-red-100 text-red-700'}>
              {phase1}
            </Badge>
          </div>
          {(phase1 === 'Assignable Cause Found' || phase1 === 'Error Found') && (
            <div className="mt-2 p-2 bg-amber-100 border border-amber-300 rounded text-xs text-amber-900">
              <CheckCircle2 className="h-3 w-3 inline mr-1" />
              Résultat OOS invalidé. Le résultat original n'est pas reporté. Investigation terminée.
            </div>
          )}
        </CardContent>
      </Card>

      {(phase1 === 'No Assignable Cause Found' || phase1 === 'No Error Found') && (
        <>
          <div className="flex justify-center"><ArrowRight className="h-5 w-5 text-slate-400 rotate-90" /></div>
          {/* Phase II */}
          <Card className={phase2 === 'Pending' ? 'border-slate-300' : phase2 === 'Invalidated' ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}>
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><FlaskConical className="h-4 w-4" /> Phase II — Investigation Production</CardTitle></CardHeader>
            <CardContent>
              <div className="text-sm">
                <div className="mb-2">Aucune cause assignable en Phase I → investigation production complète requise.</div>
                {phase2Required ? (
                  <Badge variant="outline" className={phase2 === 'Invalidated' ? 'bg-green-100 text-green-700' : phase2 === 'Confirmed OOS' ? 'bg-red-100 text-red-700' : ''}>
                    {phase2}
                  </Badge>
                ) : (
                  <Badge variant="outline">Non requise</Badge>
                )}
              </div>
              {phase2 === 'Confirmed OOS' && (
                <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded text-xs text-red-900">
                  <XCircle className="h-3 w-3 inline mr-1" />
                  OOS confirmé : le lot doit être rejeté ({record.rejectLot ? '✓' : '✗'}) et une CAPA doit être créée.
                </div>
              )}
              {phase2 === 'Invalidated' && (
                <div className="mt-2 p-2 bg-green-100 border border-green-300 rounded text-xs text-green-900">
                  <CheckCircle2 className="h-3 w-3 inline mr-1" />
                  OOS invalidé : le résultat original n'est pas reporté. Le lot peut être libéré avec justification.
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Final outcome */}
      {record.status === 'Closed' && (
        <>
          <div className="flex justify-center"><ArrowRight className="h-5 w-5 text-slate-400 rotate-90" /></div>
          <Card className={record.rejectLot ? 'border-red-300 bg-red-50' : 'border-green-300 bg-green-50'}>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                {record.rejectLot ? <XCircle className="h-5 w-5 text-red-600" /> : <CheckCircle2 className="h-5 w-5 text-green-600" />}
                <div>
                  <div className="font-medium">
                    {record.rejectLot ? 'Lot rejeté' : 'Lot libéré'}
                  </div>
                  <div className="text-xs">Disposition: {record.disposition}</div>
                  {record.closedSignedAt && <div className="text-xs">Clôturé le {fmtDate(record.closedSignedAt)} (signature: {record.closedSignatureHash?.slice(0, 20)}…)</div>}
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function fmtDate(d?: string | null) {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('fr-FR') } catch { return '—' }
}
