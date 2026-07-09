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
import { Plus, Pencil, Trash2, Link2 } from 'lucide-react'
import type { NonconformityItem, OrgUser } from '@/lib/types'
import { LABELS, fmtDate, statusBadge } from '@/lib/ui-labels'

const SOURCES = ['internal_audit', 'external_audit', 'customer_complaint', 'supplier', 'process']
const SEVERITIES = ['minor', 'major', 'critical']
const STATUSES = ['OPEN', 'INVESTIGATION', 'ACTION', 'CLOSED']

export function Nonconformities() {
  const { user } = useAuth()
  const { toast } = useToast()
  const canEdit = ['ADMIN', 'QUALITY_MANAGER', 'ENGINEER', 'AUDITOR'].includes(user?.role || '')
  const canDelete = ['ADMIN', 'QUALITY_MANAGER'].includes(user?.role || '')

  const [items, setItems] = useState<NonconformityItem[]>([])
  const [users, setUsers] = useState<OrgUser[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<NonconformityItem | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [statusFilter, setStatusFilter] = useState('ALL')

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter !== 'ALL') params.set('status', statusFilter)
    const r = await fetch(`/api/nonconformities?${params}`)
    const d = await r.json()
    setItems(d.nonconformities || [])
    setLoading(false)
  }, [statusFilter])

  useEffect(() => { load() }, [load])
  useEffect(() => { fetch('/api/users').then(r => r.json()).then(d => setUsers(d.users || [])).catch(() => {}) }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette non-conformité ?')) return
    const r = await fetch(`/api/nonconformities/${id}`, { method: 'DELETE' })
    if (r.ok) { toast({ title: 'NC supprimée' }); load() }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Non-conformités</h1>
          <p className="text-sm text-muted-foreground">Enregistrement et traitement des non-conformités (ISO 13485 §8.3)</p>
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous statuts</SelectItem>
              {STATUSES.map(s => <SelectItem key={s} value={s}>{LABELS.ncStatus(s)}</SelectItem>)}
            </SelectContent>
          </Select>
          {canEdit && <Button onClick={() => { setEditing(null); setShowForm(true) }}><Plus className="h-4 w-4 mr-2" /> Nouvelle NC</Button>}
        </div>
      </div>

      {loading ? <div className="text-center py-8 text-muted-foreground">Chargement…</div> : items.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Aucune non-conformité</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {items.map(nc => (
            <Card key={nc.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge variant="outline" className="font-mono text-xs">{nc.reference}</Badge>
                      <Badge variant="secondary" className="text-xs">{LABELS.ncSeverity(nc.severity)}</Badge>
                      <Badge variant="outline" className={`text-xs ${statusBadge(nc.status)}`}>{LABELS.ncStatus(nc.status)}</Badge>
                      <Badge variant="outline" className="text-xs">{LABELS.ncSource(nc.source)}</Badge>
                    </div>
                    <h3 className="font-medium">{nc.title}</h3>
                    {nc.description && <p className="text-sm text-muted-foreground mt-1">{nc.description}</p>}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2 flex-wrap">
                      <span>Détectée: {fmtDate(nc.detectedDate)}</span>
                      {nc.closedDate && <span>Clôturée: {fmtDate(nc.closedDate)}</span>}
                      {nc.owner && <span>Resp: {nc.owner.name}</span>}
                    </div>
                    {nc.capas && nc.capas.length > 0 && (
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><Link2 className="h-3 w-3" /> CAPAs liées:</span>
                        {nc.capas.map(c => (
                          <Badge key={c.id} variant="outline" className="text-xs">{c.reference} · {LABELS.capaStatus(c.status)}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {canEdit && <Button size="sm" variant="ghost" onClick={() => { setEditing(nc); setShowForm(true) }}><Pencil className="h-4 w-4" /></Button>}
                    {canDelete && <Button size="sm" variant="ghost" onClick={() => handleDelete(nc.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showForm && <NcForm nc={editing} users={users} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load() }} />}
    </div>
  )
}

function NcForm({ nc, users, onClose, onSaved }: { nc: NonconformityItem | null; users: OrgUser[]; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast()
  const [form, setForm] = useState({
    reference: nc?.reference || '',
    title: nc?.title || '',
    description: nc?.description || '',
    source: nc?.source || 'process',
    severity: nc?.severity || 'minor',
    status: nc?.status || 'OPEN',
    ownerId: nc?.ownerId || '',
    detectedDate: nc?.detectedDate ? nc.detectedDate.split('T')[0] : '',
    closedDate: nc?.closedDate ? nc.closedDate.split('T')[0] : ''
  })
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!form.title) { toast({ title: 'Titre requis', variant: 'destructive' }); return }
    setSaving(true)
    const url = nc ? `/api/nonconformities/${nc.id}` : '/api/nonconformities'
    const method = nc ? 'PUT' : 'POST'
    const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setSaving(false)
    if (r.ok) { toast({ title: nc ? 'NC mise à jour' : 'NC créée' }); onSaved() }
    else { const d = await r.json(); toast({ title: d.error || 'Erreur', variant: 'destructive' }) }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{nc ? 'Modifier la non-conformité' : 'Nouvelle non-conformité'}</DialogTitle>
          <DialogDescription>Enregistrement d'une non-conformité produit ou processus</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Référence</Label>
              <Input value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} placeholder="Auto-généré si vide" />
            </div>
            <div>
              <Label>Source</Label>
              <Select value={form.source} onValueChange={v => setForm({ ...form, source: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SOURCES.map(s => <SelectItem key={s} value={s}>{LABELS.ncSource(s)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Titre *</Label>
            <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Sévérité</Label>
              <Select value={form.severity} onValueChange={v => setForm({ ...form, severity: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SEVERITIES.map(s => <SelectItem key={s} value={s}>{LABELS.ncSeverity(s)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Statut</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{LABELS.ncStatus(s)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Responsable</Label>
            <Select value={form.ownerId} onValueChange={v => setForm({ ...form, ownerId: v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date de détection</Label>
              <Input type="date" value={form.detectedDate} onChange={e => setForm({ ...form, detectedDate: e.target.value })} />
            </div>
            <div>
              <Label>Date de clôture</Label>
              <Input type="date" value={form.closedDate} onChange={e => setForm({ ...form, closedDate: e.target.value })} />
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
