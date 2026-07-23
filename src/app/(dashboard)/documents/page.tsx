'use client'

import { useState, useMemo, useCallback } from 'react'
import { useModule } from '@/hooks/useModule'
import { getFlowSteps, isESigRequired, canTransition } from '@/lib/status-flows'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DocumentTriggersPanel } from '@/components/shared/DocumentTriggersPanel'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import {
  Plus, FileText, CheckCircle, Archive, Copy, Search,
  FileStack, ArrowRight, ChevronRight, Clock, AlertTriangle, ShieldCheck,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import type { DocumentType, DocumentStatus, DocumentLevel } from '@/types/qms'

const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  MANUEL: 'Manuel', POLITIQUE: 'Politique', INDICATEUR: 'Indicateur',
  PROCESS_MAP: 'Carte Processus', ORGANIGRAMME: 'Organigramme',
  REGLEMENTAIRE: 'Réglementaire', MAPPING: 'Mapping', PROCEDURE: 'Procédure',
  INSTRUCTION: 'Instruction', FORMULAIRE: 'Formulaire', REGISTRE: 'Registre',
  ENREGISTREMENT: 'Enregistrement', MASTER_BATCH: 'Master Batch',
  SOP: 'SOP', WI: 'WI', Form: 'Form', Policy: 'Policy', Specification: 'Spécification',
}

const DOC_LEVEL_LABELS: Record<number, string> = { 1: 'Stratégique', 2: 'Transversal', 3: 'Métier / Technique', 4: 'Enregistrement' }

const DOCUMENT_FLOW_SLUG = 'documents'

export default function DocumentControlView() {
  const { user } = useAuth()
  const { items, loading, create, update, refetch } = useModule('/documents')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [levelFilter, setLevelFilter] = useState('ALL')
  const [tab, setTab] = useState('all')
  const [selectedDoc, setSelectedDoc] = useState<any>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [newDialogOpen, setNewDialogOpen] = useState(false)
  const [esigOpen, setEsigOpen] = useState(false)
  const [esigTarget, setEsigTarget] = useState<{ id: string; status: string } | null>(null)

  // New document form
  const [newDoc, setNewDoc] = useState({ title: '', type: 'PROCEDURE' as DocumentType, level: '3' as string, description: '', parent_id: '' })
  const [creating, setCreating] = useState(false)

  const filtered = useMemo(() => {
    let list = items
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((d: any) => (d.title || '').toLowerCase().includes(q) || (d.document_number || '').toLowerCase().includes(q))
    }
    if (statusFilter !== 'ALL') list = list.filter((d: any) => d.status === statusFilter)
    if (typeFilter !== 'ALL') list = list.filter((d: any) => d.doc_type === typeFilter)
    if (levelFilter !== 'ALL') list = list.filter((d: any) => {
      const m = typeof d.document_level === 'string' ? d.document_level.match(/Level_(\d)/) : null
      const lvl = m ? m[1] : String(d.document_level || '')
      return lvl === levelFilter
    })
    if (tab === 'in_progress') list = list.filter((d: any) => !['Effective', 'Obsolete', 'Withdrawn'].includes(d.status))
    if (tab === 'pending_approval') list = list.filter((d: any) => d.status === 'Under Review')
    if (tab === 'effective') list = list.filter((d: any) => d.status === 'Effective')
    if (tab === 'obsolete') list = list.filter((d: any) => d.status === 'Obsolete')
    return list
  }, [items, search, statusFilter, typeFilter, levelFilter, tab])

  const stats = useMemo(() => {
    const all = items
    return {
      total: all.length,
      draft: all.filter((d: any) => d.status === 'Draft').length,
      review: all.filter((d: any) => d.status === 'Under Review').length,
      effective: all.filter((d: any) => d.status === 'Effective').length,
      obsolete: all.filter((d: any) => d.status === 'Obsolete').length,
    }
  }, [items])

  const handleRowClick = useCallback((row: any) => { setSelectedDoc(row); setSheetOpen(true) }, [])

  const requestTransition = (id: string, targetStatus: string) => {
    if (!user) return
    const check = canTransition(DOCUMENT_FLOW_SLUG, (items as any).find((d: any) => d.id === id)?.status || '', targetStatus, user.role)
    if (!check.allowed) { alert(check.reason); return }
    if (check.requiresESignature) {
      setEsigTarget({ id, status: targetStatus })
      setEsigOpen(true)
    } else {
      doTransition(id, targetStatus)
    }
  }

  const [workflowError, setWorkflowError] = useState<string | null>(null)

  const doTransition = async (id: string, newStatus: string) => {
    try {
      setWorkflowError(null)
      const m = (await import('@/lib/api-client')).api
      await m.module('/documents').transition(id, newStatus)
      refetch()
      setSheetOpen(false)
    } catch (e: any) {
      const msg = e?.message || e?.toString?.() || 'Erreur lors de la transition'
      setWorkflowError(msg)
    }
  }

  const handleEsigConfirm = (password: string, hash: string) => {
    if (!esigTarget) return
    doTransition(esigTarget.id, esigTarget.status)
    setEsigOpen(false)
    setEsigTarget(null)
  }

  const handleCreate = async () => {
    if (!newDoc.title.trim()) return
    setCreating(true)
    try {
      // IMPORTANT: les colonnes DB sont `doc_type` (enum) et `document_level` (text).
      // Le front-end utilisait `document_type` et `level` (inexistants en base).
      // Le `document_number` est auto-généré par l'API (crud-service).
      await create({
        title: newDoc.title,
        doc_type: newDoc.type,
        document_level: `Level_${newDoc.level}`,
        description: newDoc.description,
        parent_document_id: newDoc.parent_id || undefined,
      })
      setNewDialogOpen(false)
      setNewDoc({ title: '', type: 'PROCEDURE', level: '3', description: '', parent_id: '' })
    } catch (e: any) {
      // BUG-10: afficher un message d'erreur explicite à l'utilisateur
      alert('Impossible de créer le document : ' + (e?.message || 'erreur inconnue'))
    }
    finally { setCreating(false) }
  }

  const fmtDate = (d: string) => { try { return new Date(d).toLocaleDateString('fr-FR') } catch { return '—' } }

  const columns = [
    { key: 'document_number', label: 'Réf.', render: (v: any, r: any) => v ? <Badge variant="outline" className="font-mono text-xs">{v}</Badge> : '—' },
    { key: 'title', label: 'Titre', sortable: true, render: (v: any) => <span className="font-medium truncate max-w-xs block">{v || '—'}</span> },
    { key: 'doc_type', label: 'Type', render: (v: any) => <Badge variant="secondary" className="text-xs">{DOC_TYPE_LABELS[v as DocumentType] || v}</Badge> },
    { key: 'document_level', label: 'Niv.', render: (v: any) => {
      // Map "Level_3" → "L3"
      const m = typeof v === 'string' ? v.match(/Level_(\d)/) : null
      return m ? <Badge variant="outline" className="text-xs">L{m[1]}</Badge> : (v ? <Badge variant="outline" className="text-xs">{v}</Badge> : '—')
    } },
    { key: 'status', label: 'Statut', render: (v: any) => <Badge variant="outline" className={`text-xs ${getStatusColor(v)}`}>{v}</Badge> },
    { key: 'version', label: 'V.', render: (v: any) => v || '1' },
    { key: 'created_at', label: 'Créé le', sortable: true, render: (v: any) => fmtDate(v) },
    { key: 'actions', label: '', className: 'w-32',
      render: (_v: any, r: any) => (
        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
          {r.status === 'Under Review' && (
            <Button size="sm" variant="ghost" className="h-7 text-xs text-green-600 hover:text-green-700"
              onClick={() => requestTransition(r.id, 'Approved')}
              disabled={!!(user?.id && (r.author_id === user.id || r.created_by === user.id))}
              title={user?.id && (r.author_id === user.id || r.created_by === user.id) ? 'Séparation des tâches : l\'auteur ne peut pas approuver son propre document' : undefined}
            >
              <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Approuver
            </Button>
          )}
          {r.status === 'Effective' && (
            <Button size="sm" variant="ghost" className="h-7 text-xs text-amber-600 hover:text-amber-700"
              onClick={() => requestTransition(r.id, 'Obsolete')}>
              <Archive className="h-3.5 w-3.5 mr-1" /> Archiver
            </Button>
          )}
          {(r.status === 'Effective' || r.status === 'Approved') && (
            <Button size="sm" variant="ghost" className="h-7 text-xs"
              onClick={() => requestTransition(r.id, 'Draft')}>
              <Copy className="h-3.5 w-3.5 mr-1" /> Version
            </Button>
          )}
        </div>
      ),
    },
  ]

  const statCards = [
    { label: 'Total', value: stats.total, icon: FileStack, color: 'text-slate-600' },
    { label: 'Brouillons', value: stats.draft, icon: FileText, color: 'text-slate-500' },
    { label: 'En revue', value: stats.review, icon: Clock, color: 'text-amber-600' },
    { label: 'Effectifs', value: stats.effective, icon: CheckCircle, color: 'text-green-600' },
    { label: 'Obsolètes', value: stats.obsolete, icon: Archive, color: 'text-slate-400' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-6 w-6" /> Maîtrise des Documents</h1>
          <p className="text-sm text-muted-foreground">Gestion du système documentaire QMS — création, approbation, diffusion et archivage</p>
        </div>
        <Button onClick={() => setNewDialogOpen(true)}><Plus className="h-4 w-4 mr-2" /> Nouveau document</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {statCards.map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`h-5 w-5 ${s.color}`} />
              <div>
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">Tous</TabsTrigger>
          <TabsTrigger value="in_progress">En cours</TabsTrigger>
          <TabsTrigger value="pending_approval">À approuver</TabsTrigger>
          <TabsTrigger value="effective">Effectifs</TabsTrigger>
          <TabsTrigger value="obsolete">Obsolètes</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher par titre ou référence..." value={search}
                onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Tous les statuts" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les statuts</SelectItem>
                {['Draft', 'Under Review', 'Approved', 'Effective', 'Obsolete', 'Withdrawn'].map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Tous les types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les types</SelectItem>
                {Object.entries(DOC_TYPE_LABELS).slice(0, 12).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Tous niveaux" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous niveaux</SelectItem>
                {[1, 2, 3, 4].map(l => (
                  <SelectItem key={l} value={String(l)}>Niveau {l} — {DOC_LEVEL_LABELS[l]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <ResponsiveTable
        columns={columns}
        data={filtered as any[]}
        loading={loading}
        onRowClick={handleRowClick}
        emptyMessage="Aucun document trouvé."
      />

      {/* Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          {selectedDoc && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">{selectedDoc.document_number || '—'}</Badge>
                  {selectedDoc.title}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-muted-foreground">Type</Label><p className="font-medium text-sm mt-1">{DOC_TYPE_LABELS[selectedDoc.doc_type] || selectedDoc.doc_type}</p></div>
                  <div><Label className="text-muted-foreground">Niveau</Label><p className="font-medium text-sm mt-1">{(() => {
                    const m = typeof selectedDoc.document_level === 'string' ? selectedDoc.document_level.match(/Level_(\d)/) : null
                    if (m) return `L${m[1]} — ${DOC_LEVEL_LABELS[Number(m[1])] || ''}`
                    return selectedDoc.document_level || '—'
                  })()}</p></div>
                  <div><Label className="text-muted-foreground">Statut</Label><div className="mt-1"><Badge variant="outline" className={getStatusColor(selectedDoc.status)}>{selectedDoc.status}</Badge></div></div>
                  <div><Label className="text-muted-foreground">Version</Label><p className="font-medium text-sm mt-1">{selectedDoc.version || '1'}</p></div>
                </div>
                {selectedDoc.description && (
                  <div><Label className="text-muted-foreground">Description</Label><p className="text-sm mt-1">{selectedDoc.description}</p></div>
                )}
                {selectedDoc.parent_id && (
                  <div className="p-3 bg-muted rounded-lg flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Document parent : {selectedDoc.parent_id}</span>
                  </div>
                )}
                <Separator />
                {/* Status Workflow Stepper */}
                <div>
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider">Workflow</Label>
                  <div className="mt-3 flex items-center gap-1 flex-wrap">
                    {getFlowSteps(DOCUMENT_FLOW_SLUG, selectedDoc.status).map((step, i, arr) => (
                      <div key={step.status} className="flex items-center gap-1">
                        <div className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                          step.isCurrent
                            ? 'bg-primary text-primary-foreground border-primary'
                            : step.isCompleted
                            ? 'bg-green-100 text-green-700 border-green-300'
                            : 'bg-muted text-muted-foreground border-muted-foreground/20'
                        }`}>
                          {step.status}
                          {step.requiresESig && <span className="ml-1">🔒</span>}
                        </div>
                        {i < arr.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                      </div>
                    ))}
                  </div>
                </div>
                <Separator />
                <div className="flex gap-2 flex-wrap">
                  {workflowError && (
                  <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                    <p className="text-sm text-destructive">{workflowError}</p>
                  </div>
                )}
                {selectedDoc.status === 'Under Review' && (
                    <Button size="sm" onClick={() => requestTransition(selectedDoc.id, 'Approved')}
                      disabled={!!(user?.id && (selectedDoc.author_id === user.id || selectedDoc.created_by === user.id))}
                      title={user?.id && (selectedDoc.author_id === user.id || selectedDoc.created_by === user.id) ? 'Séparation des tâches : l\'auteur ne peut pas approuver son propre document' : undefined}
                    >
                      <ShieldCheck className="h-4 w-4 mr-2" /> Approuver
                    </Button>
                  )}
                  {selectedDoc.status === 'Effective' && (
                    <Button size="sm" variant="outline" onClick={() => requestTransition(selectedDoc.id, 'Obsolete')}><Archive className="h-4 w-4 mr-2" /> Archiver</Button>
                  )}
                </div>
                <Separator />
                <DocumentTriggersPanel documentId={selectedDoc.id} documentTitle={selectedDoc.title} />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* New Document Dialog */}
      <Dialog open={newDialogOpen} onOpenChange={setNewDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouveau document</DialogTitle>
            <DialogDescription>Créer un nouveau document dans le système de maîtrise documentaire</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label>Titre *</Label><Input value={newDoc.title} onChange={e => setNewDoc(p => ({ ...p, title: e.target.value }))} placeholder="Titre du document" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select value={newDoc.type} onValueChange={v => setNewDoc(p => ({ ...p, type: v as DocumentType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(DOC_TYPE_LABELS).slice(0, 12).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Niveau</Label>
                <Select value={newDoc.level} onValueChange={v => setNewDoc(p => ({ ...p, level: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4].map(l => (
                      <SelectItem key={l} value={String(l)}>L{l} — {DOC_LEVEL_LABELS[l]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Description</Label><Textarea value={newDoc.description} onChange={e => setNewDoc(p => ({ ...p, description: e.target.value }))} placeholder="Description optionnelle..." rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNewDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleCreate} disabled={!newDoc.title.trim() || creating}>
              {creating ? 'Création...' : 'Créer le document'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Electronic Signature Modal */}
      <ElectronicSignatureModal
        open={esigOpen}
        title="Signature électronique requise"
        description="Cette transition de statut nécessite une signature électronique conforme 21 CFR Part 11"
        recordId={esigTarget?.id}
        recordType="document"
        onConfirm={handleEsigConfirm}
        onCancel={() => { setEsigOpen(false); setEsigTarget(null) }}
      />
    </div>
  )
}