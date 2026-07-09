'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/lib/store/auth'
import { Plus, Pencil, Trash2, Clock, AlertCircle } from 'lucide-react'
import type { CapaItem, OrgUser, NonconformityItem } from '@/lib/types'
import { LABELS, fmtDate, statusBadge } from '@/lib/ui-labels'

const TYPES = ['CORRECTIVE', 'PREVENTIVE']
const STATUSES = ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'VERIFIED']

export function Capas() {
  const { user } = useAuth()
  const { toast } = useToast()
  const canEdit = ['ADMIN', 'QUALITY_MANAGER', 'ENGINEER'].includes(user?.role || '')
  const canDelete = ['ADMIN', 'QUALITY_MANAGER'].includes(user?.role || '')

  const [items, setItems] = useState<CapaItem[]>([])
  const [users, setUsers] = useState<OrgUser[]>([])
  const [ncs, setNcs] = useState<NonconformityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<CapaItem | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter !== 'ALL') params.set('status', statusFilter)
    const r = await fetch(`/api/capas?${params}`)
    const d = await r.json()
    setItems(d.capas || [])
    setLoading(false)
  }, [statusFilter])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(d => setUsers(d.users || [])).catch(() => {})
    fetch('/api/nonconformities').then(r => r.json()).then(d => setNcs(d.nonconformities || [])).catch(() => {})
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette CAPA ?')) return
    const r = await fetch(`/api/capas/${id}`, { method: 'DELETE' })
    if (r.ok) { toast({ title: 'CAPA supprimée' }); load() }
  }

  const filtered = items.filter(c => typeFilter === 'ALL' || c.type === typeFilter)

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">CAPA</h1>
          <p className="text-sm text-muted-foreground">Actions correctives et préventives (ISO 13485 §8.5.2 & §8.5.3)</p>
        </div>
        <div className="flex gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous types</SelectItem>
              {TYPES.map(t => <SelectItem key={t} value={t}>{LABELS.capaType(t)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous statuts</SelectItem>
              {STATUSES.map(s => <SelectItem key={s} value={s}>{LABELS.capaStatus(s)}</SelectItem>)}
            </SelectContent>
          </Select>
          {canEdit && <Button onClick={() => { setEditing(null); setShowForm(true) }}><Plus className="h-4 w-4 mr-2" /> Nouvelle CAPA</Button>}
        </div>
      </div>

      {loading ? <div className="text-center py-8 text-muted-foreground">Chargement…</div> : filtered.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Aucune CAPA</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map(c => {
            const overdue = c.dueDate && c.dueDate < new Date().toISOString() && c.status !== 'COMPLETED' && c.status !== 'VERIFIED'
            return (
              <Card key={c.id} className={overdue ? 'border-red-300' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge variant="outline" className="font-mono text-xs">{c.reference}</Badge>
                        <Badge variant="secondary" className="text-xs">{LABELS.capaType(c.type)}</Badge>
                        <Badge variant="outline" className={`text-xs ${statusBadge(c.status)}`}>{LABELS.capaStatus(c.status)}</Badge>
                        {overdue && <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200"><AlertCircle className="h-3 w-3 mr-1" />En retard</Badge>}
                      </div>
                      <h3 className="font-medium">{c.title}</h3>
                      {c.description && <p className="text-sm text-muted-foreground mt-1">{c.description}</p>}
                      {c.nonconformity && <p className="text-xs text-muted-foreground mt-1">NC liée: {c.nonconformity.reference} — {c.nonconformity.title}</p>}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                        {c.rootCause && <div className="text-sm p-2 bg-slate-50 dark:bg-slate-900 rounded border"><span className="font-medium">Cause racine:</span> {c.rootCause}</div>}
                        {c.action && <div className="text-sm p-2 bg-slate-50 dark:bg-slate-900 rounded border"><span className="font-medium">Action:</span> {c.action}</div>}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2 flex-wrap">
                        <Clock className="h-3 w-3" />
                        <span>Échéance: {fmtDate(c.dueDate)}</span>
                        {c.completedDate && <span>Terminée: {fmtDate(c.completedDate)}</span>}
                        {c.owner && <span>Resp: {c.owner.name}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {canEdit && <Button size="sm" variant="ghost" onClick={() => { setEditing(c); setShowForm(true) }}><Pencil className="h-4 w-4" /></Button>}
                      {canDelete && <Button size="sm" variant="ghost" onClick={() => handleDelete(c.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {showForm && <CapaForm capa={editing} users={users} ncs={ncs} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load() }} />}
    </div>
  )
}

function CapaForm({ capa, users, ncs, onClose, onSaved }: {
  capa: CapaItem | null
  users: OrgUser[]
  ncs: NonconformityItem[]
  onClose: () => void
  onSaved: () => void
}) {
  const { toast } = useToast()
  const [form, setForm] = useState({
    reference: capa?.reference || '',
    type: capa?.type || 'CORRECTIVE',
    title: capa?.title || '',
    description: capa?.description || '',
    rootCause: capa?.rootCause || '',
    action: capa?.action || '',
    dueDate: capa?.dueDate ? capa.dueDate.split('T')[0] : '',
    completedDate: capa?.completedDate ? capa.completedDate.split('T')[0] : '',
    status: capa?.status || 'OPEN',
    ownerId: capa?.ownerId || '',
    nonconformityId: capa?.nonconformityId || ''
  })
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!form.title) { toast({ title: 'Titre requis', variant: 'destructive' }); return }
    setSaving(true)
    const url = capa ? `/api/capas/${capa.id}` : '/api/capas'
    const method = capa ? 'PUT' : 'POST'
    const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setSaving(false)
    if (r.ok) { toast({ title: capa ? 'CAPA mise à jour' : 'CAPA créée' }); onSaved() }
    else { const d = await r.json(); toast({ title: d.error || 'Erreur', variant: 'destructive' }) }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{capa ? 'Modifier la CAPA' : 'Nouvelle CAPA'}</DialogTitle>
          <DialogDescription>Action corrective ou préventive</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Référence</Label>
              <Input value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} placeholder="Auto" />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{LABELS.capaType(t)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Statut</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{LABELS.capaStatus(s)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Titre *</Label>
            <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} />
          </div>
          <div>
            <Label>Cause racine</Label>
            <Textarea value={form.rootCause} onChange={e => setForm({ ...form, rootCause: e.target.value })} rows={2} />
          </div>
          <div>
            <Label>Action</Label>
            <Textarea value={form.action} onChange={e => setForm({ ...form, action: e.target.value })} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>NC liée</Label>
              <Select value={form.nonconformityId} onValueChange={v => setForm({ ...form, nonconformityId: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Aucune</SelectItem>
                  {ncs.map(n => <SelectItem key={n.id} value={n.id}>{n.reference} — {n.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Responsable</Label>
              <Select value={form.ownerId} onValueChange={v => setForm({ ...form, ownerId: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Échéance</Label>
              <Input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
            </div>
            <div>
              <Label>Date de réalisation</Label>
              <Input type="date" value={form.completedDate} onChange={e => setForm({ ...form, completedDate: e.target.value })} />
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
