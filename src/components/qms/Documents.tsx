'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/lib/store/auth'
import { Plus, Search, Pencil, Trash2, FileText, Download } from 'lucide-react'
import type { DocumentItem, OrgUser } from '@/lib/types'
import { LABELS, fmtDate, statusBadge } from '@/lib/ui-labels'

const CATEGORIES = ['manual', 'procedure', 'instruction', 'record', 'form', 'policy']
const STATUSES = ['DRAFT', 'IN_REVIEW', 'APPROVED', 'OBSOLETE']

export function Documents() {
  const { user } = useAuth()
  const { toast } = useToast()
  const canEdit = ['ADMIN', 'QUALITY_MANAGER', 'ENGINEER'].includes(user?.role || '')
  const canDelete = ['ADMIN', 'QUALITY_MANAGER'].includes(user?.role || '')

  const [items, setItems] = useState<DocumentItem[]>([])
  const [users, setUsers] = useState<OrgUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [editing, setEditing] = useState<DocumentItem | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [viewing, setViewing] = useState<DocumentItem | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter !== 'ALL') params.set('status', statusFilter)
    if (categoryFilter !== 'ALL') params.set('category', categoryFilter)
    if (search) params.set('q', search)
    const r = await fetch(`/api/documents?${params}`)
    const d = await r.json()
    setItems(d.documents || [])
    setLoading(false)
  }, [statusFilter, categoryFilter, search])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(d => setUsers(d.users || [])).catch(() => {})
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce document ?')) return
    const r = await fetch(`/api/documents/${id}`, { method: 'DELETE' })
    if (r.ok) { toast({ title: 'Document supprimé' }); load() }
    else toast({ title: 'Erreur', variant: 'destructive' })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Documents</h1>
          <p className="text-sm text-muted-foreground">Maîtrise des documents et enregistrements (ISO 13485 §4.2)</p>
        </div>
        {canEdit && (
          <Button onClick={() => { setEditing(null); setShowForm(true) }}>
            <Plus className="h-4 w-4 mr-2" /> Nouveau document
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par code, titre…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-44"><SelectValue placeholder="Statut" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les statuts</SelectItem>
                {STATUSES.map(s => <SelectItem key={s} value={s}>{LABELS.docStatus(s)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-44"><SelectValue placeholder="Catégorie" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Toutes catégories</SelectItem>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{LABELS.docCategory(c)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Chargement…</div>
      ) : items.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Aucun document</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {items.map(doc => (
            <Card key={doc.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setViewing(doc)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge variant="outline" className="font-mono text-xs">{doc.code}</Badge>
                      <Badge variant="outline" className={`text-xs ${statusBadge(doc.status)}`}>{LABELS.docStatus(doc.status)}</Badge>
                      <Badge variant="secondary" className="text-xs">{LABELS.docCategory(doc.category)}</Badge>
                      <Badge variant="outline" className="text-xs">v{doc.version}</Badge>
                    </div>
                    <h3 className="font-medium truncate">{doc.title}</h3>
                    {doc.summary && <p className="text-sm text-muted-foreground line-clamp-1">{doc.summary}</p>}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                      <span>Propriétaire: {doc.owner?.name || '—'}</span>
                      <span>•</span>
                      <span>Approuvé le: {fmtDate(doc.effectiveDate)}</span>
                      {doc.nextReviewDate && (
                        <>
                          <span>•</span>
                          <span>Revue: {fmtDate(doc.nextReviewDate)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    {canEdit && (
                      <Button size="sm" variant="ghost" onClick={() => { setEditing(doc); setShowForm(true) }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(doc.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <DocumentForm
          document={editing}
          users={users}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load() }}
        />
      )}

      {viewing && !showForm && (
        <DocumentView
          document={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => { setEditing(viewing); setViewing(null); setShowForm(true) }}
          canEdit={canEdit}
        />
      )}
    </div>
  )
}

function DocumentForm({ document, users, onClose, onSaved }: {
  document: DocumentItem | null
  users: OrgUser[]
  onClose: () => void
  onSaved: () => void
}) {
  const { toast } = useToast()
  const [form, setForm] = useState({
    code: document?.code || '',
    title: document?.title || '',
    version: document?.version || '1.0',
    status: document?.status || 'DRAFT',
    category: document?.category || 'procedure',
    summary: document?.summary || '',
    content: document?.content || '',
    ownerId: document?.ownerId || '',
    reviewerId: document?.reviewerId || '',
    approverId: document?.approverId || '',
    effectiveDate: document?.effectiveDate ? document.effectiveDate.split('T')[0] : '',
    nextReviewDate: document?.nextReviewDate ? document.nextReviewDate.split('T')[0] : ''
  })
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!form.code || !form.title) { toast({ title: 'Code et titre requis', variant: 'destructive' }); return }
    setSaving(true)
    const url = document ? `/api/documents/${document.id}` : '/api/documents'
    const method = document ? 'PUT' : 'POST'
    const r = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    setSaving(false)
    if (r.ok) {
      toast({ title: document ? 'Document mis à jour' : 'Document créé' })
      onSaved()
    } else {
      const d = await r.json()
      toast({ title: d.error || 'Erreur', variant: 'destructive' })
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{document ? 'Modifier le document' : 'Nouveau document'}</DialogTitle>
          <DialogDescription>Renseignez les informations du document</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Code *</Label>
              <Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="MAN-001" />
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Catégorie</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{LABELS.docCategory(c)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Statut</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{LABELS.docStatus(s)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Résumé</Label>
            <Textarea value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })} rows={2} />
          </div>
          <div>
            <Label>Contenu</Label>
            <Textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} rows={6} className="font-mono text-sm" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Propriétaire</Label>
              <Select value={form.ownerId} onValueChange={v => setForm({ ...form, ownerId: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Vérificateur</Label>
              <Select value={form.reviewerId} onValueChange={v => setForm({ ...form, reviewerId: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Approbateur</Label>
              <Select value={form.approverId} onValueChange={v => setForm({ ...form, approverId: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date d'effet</Label>
              <Input type="date" value={form.effectiveDate} onChange={e => setForm({ ...form, effectiveDate: e.target.value })} />
            </div>
            <div>
              <Label>Prochaine revue</Label>
              <Input type="date" value={form.nextReviewDate} onChange={e => setForm({ ...form, nextReviewDate: e.target.value })} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DocumentView({ document: doc, onClose, onEdit, canEdit }: {
  document: DocumentItem
  onClose: () => void
  onEdit: () => void
  canEdit: boolean
}) {
  const handleDownload = () => {
    const content = `# ${doc.title}\n\nCode: ${doc.code}\nVersion: ${doc.version}\nStatut: ${LABELS.docStatus(doc.status)}\nCatégorie: ${LABELS.docCategory(doc.category)}\n\n## Résumé\n${doc.summary || ''}\n\n## Contenu\n${doc.content || ''}\n`
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${doc.code}-v${doc.version}.md`; a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <DialogTitle className="text-xl">{doc.title}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 flex-wrap mt-2">
                <Badge variant="outline" className="font-mono">{doc.code}</Badge>
                <Badge variant="outline">v{doc.version}</Badge>
                <Badge variant="outline" className={statusBadge(doc.status)}>{LABELS.docStatus(doc.status)}</Badge>
                <Badge variant="secondary">{LABELS.docCategory(doc.category)}</Badge>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="space-y-4">
          {doc.summary && (
            <div>
              <h4 className="text-sm font-medium mb-1">Résumé</h4>
              <p className="text-sm text-muted-foreground">{doc.summary}</p>
            </div>
          )}
          {doc.content && (
            <div>
              <h4 className="text-sm font-medium mb-1">Contenu</h4>
              <pre className="text-sm whitespace-pre-wrap bg-slate-50 dark:bg-slate-900 p-3 rounded border">{doc.content}</pre>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 text-sm border-t pt-4">
            <div><span className="text-muted-foreground">Propriétaire:</span> {doc.owner?.name || '—'}</div>
            <div><span className="text-muted-foreground">Vérificateur:</span> {doc.reviewer?.name || '—'}</div>
            <div><span className="text-muted-foreground">Approbateur:</span> {doc.approver?.name || '—'}</div>
            <div><span className="text-muted-foreground">Date d'effet:</span> {fmtDate(doc.effectiveDate)}</div>
            <div><span className="text-muted-foreground">Prochaine revue:</span> {fmtDate(doc.nextReviewDate)}</div>
            <div><span className="text-muted-foreground">Créé le:</span> {fmtDate(doc.createdAt)}</div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={handleDownload}><Download className="h-4 w-4 mr-2" /> Télécharger</Button>
          {canEdit && <Button onClick={onEdit}><Pencil className="h-4 w-4 mr-2" /> Modifier</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
