'use client'
import { useShallow } from 'zustand/react/shallow'

import { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/contexts/AuthContext'
import { useQmsStore, type Document } from '@/lib/demo-store'
import { useToast } from '@/hooks/use-toast'
import { Plus, Search, Pencil, Trash2, FileText, GitBranch, Download } from 'lucide-react'
import { DOCUMENT_LEVEL_LABELS, type DocumentLevel } from '@/types/qms'
import { validateDocumentCode, getCodePrefix, CODE_PREFIXES } from '@/lib/document-code-convention'
import { DEPARTMENTS } from '@/lib/department-taxonomy'
import { RecordLinkPanel } from '@/components/shared/RecordLinkPanel'
import { DocumentTriggersPanel, DocumentRelationshipsPanel } from '@/components/modules/DocumentRelations'
import { fmtDate } from '@/lib/ui-labels'

const DOC_TYPES = ['MANUEL', 'POLITIQUE', 'PROCEDURE', 'INSTRUCTION', 'FORMULAIRE', 'REGISTRE', 'ENREGISTREMENT', 'MASTER_BATCH', 'SOP', 'WI', 'Specification']
const DOC_STATUSES = ['Draft', 'Under Review', 'Approved', 'Effective', 'Obsolete', 'Withdrawn']
const DOC_CLASSIFICATIONS = ['Internal', 'External', 'Regulatory', 'Confidential']
const VALIDATION_PHASES = ['IQ', 'OQ', 'PQ', 'Full']

export function DocumentControlView() {
  const { profile, hasPermission } = useAuth()
  const orgId = profile?.organizationId || ''
  const docs = useQmsStore(useShallow(s => s.documents)).filter(d => d.organizationId === orgId)
  const createDoc = useQmsStore(s => s.createDocument)
  const updateDoc = useQmsStore(s => s.updateDocument)
  const deleteDoc = useQmsStore(s => s.deleteDocument)
  const { toast } = useToast()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [levelFilter, setLevelFilter] = useState('ALL')
  const [editing, setEditing] = useState<Document | null>(null)
  const [viewing, setViewing] = useState<Document | null>(null)
  const [showForm, setShowForm] = useState(false)

  const canCreate = hasPermission('documents.create' as any)
  const canEdit = hasPermission('documents.update' as any)
  const canDelete = hasPermission('documents.delete' as any)

  const filtered = useMemo(() => {
    let list = docs
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(d => d.title.toLowerCase().includes(q) || d.documentNumber.toLowerCase().includes(q) || (d.code || '').toLowerCase().includes(q))
    }
    if (statusFilter !== 'ALL') list = list.filter(d => d.status === statusFilter)
    if (typeFilter !== 'ALL') list = list.filter(d => d.docType === typeFilter)
    if (levelFilter !== 'ALL') list = list.filter(d => d.documentLevel === Number(levelFilter))
    return list
  }, [docs, search, statusFilter, typeFilter, levelFilter])

  const statusBadgeClass = (s: string) => {
    const m: Record<string, string> = {
      Draft: 'bg-slate-100 text-slate-700', 'Under Review': 'bg-amber-100 text-amber-700',
      Approved: 'bg-green-100 text-green-700', Effective: 'bg-emerald-100 text-emerald-700',
      Obsolete: 'bg-red-100 text-red-700', Withdrawn: 'bg-slate-200 text-slate-600',
    }
    return m[s] || 'bg-slate-100 text-slate-700'
  }

  const levelBadgeClass = (l: number) => {
    const m: Record<number, string> = { 1: 'border-purple-300 bg-purple-50 text-purple-700', 2: 'border-teal-300 bg-teal-50 text-teal-700', 3: 'border-cyan-300 bg-cyan-50 text-cyan-700', 4: 'border-slate-300 bg-slate-50 text-slate-700' }
    return m[l] || ''
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-6 w-6 text-emerald-600" /> Contrôle Documentaire</h1>
          <p className="text-sm text-muted-foreground">Maîtrise des documents (ISO 13485 §4.2.3) · Hiérarchie 4 niveaux</p>
        </div>
        {canCreate && <Button onClick={() => { setEditing(null); setShowForm(true) }}><Plus className="h-4 w-4 mr-2" /> Nouveau document</Button>}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher (titre, code, numéro)…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40"><SelectValue placeholder="Statut" /></SelectTrigger>
              <SelectContent><SelectItem value="ALL">Tous statuts</SelectItem>{DOC_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-40"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent><SelectItem value="ALL">Tous types</SelectItem>{DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-full md:w-40"><SelectValue placeholder="Niveau" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous niveaux</SelectItem>
                {[1, 2, 3, 4].map(l => <SelectItem key={l} value={String(l)}>N{l} — {DOCUMENT_LEVEL_LABELS[l as DocumentLevel].fr}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Aucun document</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map(d => (
            <Card key={d.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setViewing(d)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge variant="outline" className="font-mono text-xs">{d.documentNumber}</Badge>
                      <Badge variant="outline" className={`text-xs ${statusBadgeClass(d.status)}`}>{d.status}</Badge>
                      <Badge variant="secondary" className="text-xs">{d.docType}</Badge>
                      <Badge variant="outline" className={`text-xs ${levelBadgeClass(d.documentLevel)}`}>N{d.documentLevel}</Badge>
                      <Badge variant="outline" className="text-xs">v{d.version}</Badge>
                      {d.isTemplate && <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">Template</Badge>}
                    </div>
                    <h3 className="font-medium truncate">{d.title}</h3>
                    {d.summary && <p className="text-sm text-muted-foreground line-clamp-1">{d.summary}</p>}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2 flex-wrap">
                      {d.code && <span>Code: {d.code}</span>}
                      {d.isoClause && <span>Clause ISO: {d.isoClause}</span>}
                      <span>Effet: {fmtDate(d.effectiveDate)}</span>
                      {d.nextReview && <span>Prochaine revue: {fmtDate(d.nextReview)}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    {canEdit && <Button size="sm" variant="ghost" onClick={() => { setEditing(d); setShowForm(true) }}><Pencil className="h-4 w-4" /></Button>}
                    {canDelete && <Button size="sm" variant="ghost" onClick={() => { if (confirm('Supprimer ?')) { deleteDoc(orgId, profile?.id || '', d.id); toast({ title: 'Document supprimé' }) } }}><Trash2 className="h-4 w-4 text-red-500" /></Button>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <DocumentForm
          doc={editing}
          orgId={orgId}
          userId={profile?.id || ''}
          existingCodes={docs.map(d => d.documentNumber)}
          onClose={() => setShowForm(false)}
          onSave={(data) => {
            if (editing) { updateDoc(orgId, profile?.id || '', editing.id, data); toast({ title: 'Document mis à jour' }) }
            else { createDoc(orgId, profile?.id || '', data); toast({ title: 'Document créé' }) }
            setShowForm(false)
          }}
        />
      )}

      {viewing && !showForm && (
        <DocumentViewDialog doc={viewing} allDocs={docs} onClose={() => setViewing(null)} onEdit={() => { setEditing(viewing); setViewing(null); setShowForm(true) }} canEdit={canEdit} />
      )}
    </div>
  )
}

function DocumentForm({ doc, orgId, userId, existingCodes, onClose, onSave }: any) {
  const [form, setForm] = useState({
    documentNumber: doc?.documentNumber || '',
    title: doc?.title || '', docType: doc?.docType || 'PROCEDURE', version: doc?.version || '1.0',
    status: doc?.status || 'Draft', classification: doc?.classification || 'Internal',
    code: doc?.code || '', isoClause: doc?.isoClause || '', documentLevel: doc?.documentLevel || 4,
    departmentCode: doc?.departmentCode || '', isPrerequisite: doc?.isPrerequisite || false,
    reviewCycleMonths: doc?.reviewCycleMonths || 12, validationPhase: doc?.validationPhase || '',
    effectiveDate: doc?.effectiveDate ? String(doc.effectiveDate).split('T')[0] : '',
    nextReview: doc?.nextReview ? String(doc.nextReview).split('T')[0] : '',
    retentionPeriod: doc?.retentionPeriod || '', owner: doc?.owner || '',
    docScope: doc?.docScope || '', content: doc?.content || '', summary: doc?.summary || '',
    isTemplate: doc?.isTemplate || false,
  })
  const [error, setError] = useState('')

  // Auto-suggest code from prefix when type changes
  const handleTypeChange = (t: string) => {
    setForm((f: any) => ({ ...f, docType: t }))
    if (!form.code) {
      // Find recommended prefix
      const prefix = CODE_PREFIXES.find(p => p.docTypes.includes(t as any))
      if (prefix && !form.documentNumber) {
        // Generate code suggestion
        const next = (existingCodes.length + 1).toString().padStart(3, '0')
        setForm((f: any) => ({ ...f, code: `${prefix.prefix}-${next}`, documentNumber: `${prefix.prefix}-${next}` }))
      }
    }
  }

  const handleSave = () => {
    setError('')
    if (!form.title || !form.documentNumber) { setError('Titre et numéro requis'); return }
    if (form.code) {
      const v = validateDocumentCode(form.code)
      if (!v.valid) { setError(v.error || 'Code invalide'); return }
    }
    onSave(form)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{doc ? 'Modifier le document' : 'Nouveau document'}</DialogTitle>
          <DialogDescription>Maîtrise documentaire selon ISO 13485 §4.2.3</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Numéro *</Label>
              <Input value={form.documentNumber} onChange={e => setForm({ ...form, documentNumber: e.target.value })} placeholder="MQ-001" />
            </div>
            <div>
              <Label>Version</Label>
              <Input value={form.version} onChange={e => setForm({ ...form, version: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Titre *</Label>
            <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={form.docType} onValueChange={handleTypeChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Statut</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DOC_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Classification</Label>
              <Select value={form.classification} onValueChange={v => setForm({ ...form, classification: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DOC_CLASSIFICATIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Code (convention)</Label>
              <Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="MQ-001" className="font-mono" />
              {form.code && (() => {
                const v = validateDocumentCode(form.code)
                return <div className={`text-xs mt-1 ${v.valid ? 'text-green-600' : 'text-red-600'}`}>{v.valid ? '✓ Code valide' : v.error}</div>
              })()}
            </div>
            <div>
              <Label>Niveau hiérarchique</Label>
              <Select value={String(form.documentLevel)} onValueChange={v => setForm({ ...form, documentLevel: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{[1, 2, 3, 4].map(l => <SelectItem key={l} value={String(l)}>N{l} — {DOCUMENT_LEVEL_LABELS[l as DocumentLevel].fr}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Clause ISO</Label>
              <Input value={form.isoClause} onChange={e => setForm({ ...form, isoClause: e.target.value })} placeholder="4.2.3" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Département</Label>
              <Select value={form.departmentCode} onValueChange={v => setForm({ ...form, departmentCode: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{DEPARTMENTS.slice(0, 30).map(d => <SelectItem key={d.code} value={d.code}>{d.code} — {d.labelFr}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Phase de validation</Label>
              <Select value={form.validationPhase || '_none'} onValueChange={v => setForm({ ...form, validationPhase: v === '_none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Aucune</SelectItem>
                  {VALIDATION_PHASES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cycle de revue (mois)</Label>
              <Input type="number" value={form.reviewCycleMonths} onChange={e => setForm({ ...form, reviewCycleMonths: Number(e.target.value) })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Date d'effet</Label>
              <Input type="date" value={form.effectiveDate} onChange={e => setForm({ ...form, effectiveDate: e.target.value })} />
            </div>
            <div>
              <Label>Prochaine revue</Label>
              <Input type="date" value={form.nextReview} onChange={e => setForm({ ...form, nextReview: e.target.value })} />
            </div>
            <div>
              <Label>Période de rétention</Label>
              <Input value={form.retentionPeriod} onChange={e => setForm({ ...form, retentionPeriod: e.target.value })} placeholder="5 ans" />
            </div>
          </div>
          <div>
            <Label>Propriétaire</Label>
            <Input value={form.owner} onChange={e => setForm({ ...form, owner: e.target.value })} />
          </div>
          <div>
            <Label>Résumé</Label>
            <Textarea value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })} rows={2} />
          </div>
          <div>
            <Label>Contenu</Label>
            <Textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} rows={6} className="font-mono text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isTemplate" checked={form.isTemplate} onChange={e => setForm({ ...form, isTemplate: e.target.checked })} />
            <Label htmlFor="isTemplate" className="cursor-pointer">Document template (référence pour créer des instances)</Label>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isPrereq" checked={form.isPrerequisite} onChange={e => setForm({ ...form, isPrerequisite: e.target.checked })} />
            <Label htmlFor="isPrereq" className="cursor-pointer">Prérequis (document obligatoire avant création d'enregistrements)</Label>
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSave}>{doc ? 'Mettre à jour' : 'Créer'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DocumentViewDialog({ doc, allDocs, onClose, onEdit, canEdit }: any) {
  const handleDownload = () => {
    const content = `# ${doc.title}\n\nN°: ${doc.documentNumber}\nVersion: ${doc.version}\nStatut: ${doc.status}\nType: ${doc.docType}\nNiveau: N${doc.documentLevel}\nCode: ${doc.code || '—'}\nClause ISO: ${doc.isoClause || '—'}\n\n## Résumé\n${doc.summary || ''}\n\n## Contenu\n${doc.content || ''}\n`
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${doc.documentNumber}-v${doc.version}.md`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2 flex-wrap">
            <FileText className="h-5 w-5" />
            {doc.title}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2 flex-wrap mt-2">
            <Badge variant="outline" className="font-mono">{doc.documentNumber}</Badge>
            <Badge variant="outline">v{doc.version}</Badge>
            <Badge variant="outline">{doc.status}</Badge>
            <Badge variant="secondary">{doc.docType}</Badge>
            <Badge variant="outline">N{doc.documentLevel}</Badge>
            {doc.code && <Badge variant="outline" className="font-mono">{doc.code}</Badge>}
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="content">Contenu</TabsTrigger>
            <TabsTrigger value="triggers">Triggers</TabsTrigger>
            <TabsTrigger value="relations">Relations</TabsTrigger>
            <TabsTrigger value="links">Liens</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="mt-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Classification:</span> {doc.classification}</div>
              <div><span className="text-muted-foreground">Clause ISO:</span> {doc.isoClause || '—'}</div>
              <div><span className="text-muted-foreground">Niveau:</span> N{doc.documentLevel} — {DOCUMENT_LEVEL_LABELS[doc.documentLevel as DocumentLevel]?.fr}</div>
              <div><span className="text-muted-foreground">Département:</span> {doc.departmentCode || '—'}</div>
              <div><span className="text-muted-foreground">Propriétaire:</span> {doc.owner || '—'}</div>
              <div><span className="text-muted-foreground">Période de rétention:</span> {doc.retentionPeriod || '—'}</div>
              <div><span className="text-muted-foreground">Date d'effet:</span> {fmtDate(doc.effectiveDate)}</div>
              <div><span className="text-muted-foreground">Prochaine revue:</span> {fmtDate(doc.nextReview)}</div>
              <div><span className="text-muted-foreground">Cycle de revue:</span> {doc.reviewCycleMonths} mois</div>
              <div><span className="text-muted-foreground">Phase de validation:</span> {doc.validationPhase || '—'}</div>
              <div><span className="text-muted-foreground">Template:</span> {doc.isTemplate ? 'Oui' : 'Non'}</div>
              <div><span className="text-muted-foreground">Prérequis:</span> {doc.isPrerequisite ? 'Oui' : 'Non'}</div>
            </div>
            {doc.summary && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-1">Résumé</h4>
                <p className="text-sm text-muted-foreground p-3 bg-slate-50 dark:bg-slate-900 rounded border">{doc.summary}</p>
              </div>
            )}
          </TabsContent>
          <TabsContent value="content" className="mt-4">
            {doc.content ? (
              <pre className="text-sm whitespace-pre-wrap bg-slate-50 dark:bg-slate-900 p-4 rounded border">{doc.content}</pre>
            ) : <p className="text-sm text-muted-foreground">Aucun contenu</p>}
          </TabsContent>
          <TabsContent value="triggers" className="mt-4">
            <DocumentTriggersPanel document={doc} allDocuments={allDocs} />
          </TabsContent>
          <TabsContent value="relations" className="mt-4">
            <DocumentRelationshipsPanel document={doc} allDocuments={allDocs} />
          </TabsContent>
          <TabsContent value="links" className="mt-4">
            <RecordLinkPanel recordId={doc.id} recordType="document" recordLabel={`${doc.documentNumber} — ${doc.title}`} />
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button variant="ghost" onClick={handleDownload}><Download className="h-4 w-4 mr-2" /> Télécharger</Button>
          {canEdit && <Button onClick={onEdit}><Pencil className="h-4 w-4 mr-2" /> Modifier</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// Document Hierarchy View (tree)
// ============================================================================
export function DocumentHierarchyView() {
  const { profile } = useAuth()
  const orgId = profile?.organizationId || ''
  const docs = useQmsStore(useShallow(s => s.documents)).filter(d => d.organizationId === orgId)
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState('ALL')

  const filtered = docs.filter(d => {
    if (search) {
      const q = search.toLowerCase()
      if (!d.title.toLowerCase().includes(q) && !d.documentNumber.toLowerCase().includes(q)) return false
    }
    if (levelFilter !== 'ALL' && d.documentLevel !== Number(levelFilter)) return false
    return true
  })

  const byLevel: Record<number, typeof docs> = { 1: [], 2: [], 3: [], 4: [] }
  for (const d of filtered) byLevel[d.documentLevel]?.push(d)

  const levelColors: Record<number, string> = {
    1: 'border-l-purple-500', 2: 'border-l-teal-500', 3: 'border-l-cyan-500', 4: 'border-l-slate-500',
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><GitBranch className="h-6 w-6 text-emerald-600" /> Hiérarchie Documentaire</h1>
        <p className="text-sm text-muted-foreground">Vue arborescente des documents par niveau (ISO 13485 §4.2.3)</p>
      </div>
      <Card>
        <CardContent className="p-4 flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
          </div>
          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous niveaux</SelectItem>
              {[1, 2, 3, 4].map(l => <SelectItem key={l} value={String(l)}>N{l} — {DOCUMENT_LEVEL_LABELS[l as DocumentLevel].fr}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
      <div className="space-y-4">
        {[1, 2, 3, 4].map(level => (
          byLevel[level]?.length > 0 && (
            <div key={level}>
              <div className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Badge variant="outline">Niveau {level}</Badge>
                {DOCUMENT_LEVEL_LABELS[level as DocumentLevel].fr}
                <Badge variant="secondary">{byLevel[level].length}</Badge>
              </div>
              <div className="grid gap-2 ml-2">
                {byLevel[level].map(d => (
                  <Card key={d.id} className={`border-l-4 ${levelColors[level]}`}>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="font-mono text-xs">{d.documentNumber}</Badge>
                        <Badge variant="outline" className="text-xs">v{d.version}</Badge>
                        <Badge variant="outline" className="text-xs">{d.status}</Badge>
                        <span className="font-medium">{d.title}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )
        ))}
      </div>
    </div>
  )
}
