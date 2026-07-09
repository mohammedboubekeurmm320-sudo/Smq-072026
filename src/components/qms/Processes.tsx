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
import { Plus, Pencil, Trash2 } from 'lucide-react'
import type { ProcessItem, OrgUser } from '@/lib/types'
import { LABELS, statusBadge } from '@/lib/ui-labels'

const TYPES = ['core', 'support', 'management']
const STATUSES = ['active', 'inactive']

export function Processes() {
  const { user } = useAuth()
  const { toast } = useToast()
  const canEdit = ['ADMIN', 'QUALITY_MANAGER'].includes(user?.role || '')

  const [items, setItems] = useState<ProcessItem[]>([])
  const [users, setUsers] = useState<OrgUser[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<ProcessItem | null>(null)
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/processes')
    const d = await r.json()
    setItems(d.processes || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { fetch('/api/users').then(r => r.json()).then(d => setUsers(d.users || [])).catch(() => {}) }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce processus ?')) return
    const r = await fetch(`/api/processes/${id}`, { method: 'DELETE' })
    if (r.ok) { toast({ title: 'Processus supprimé' }); load() }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Processus</h1>
          <p className="text-sm text-muted-foreground">Cartographie des processus QMS (ISO 13485 §4.1)</p>
        </div>
        {canEdit && <Button onClick={() => { setEditing(null); setShowForm(true) }}><Plus className="h-4 w-4 mr-2" /> Nouveau processus</Button>}
      </div>

      {loading ? <div className="text-center py-8 text-muted-foreground">Chargement…</div> : items.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Aucun processus</CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map(p => (
            <Card key={p.id} className={p.status === 'inactive' ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-medium">{p.name}</h3>
                      <Badge variant="secondary" className="text-xs">{LABELS.processType(p.type)}</Badge>
                      <Badge variant="outline" className={`text-xs ${statusBadge(p.status === 'active' ? 'APPROVED' : 'OBSOLETE')}`}>{p.status === 'active' ? 'Actif' : 'Inactif'}</Badge>
                    </div>
                    {p.description && <p className="text-sm text-muted-foreground">{p.description}</p>}
                    <div className="grid grid-cols-1 gap-1 mt-2 text-xs">
                      {p.inputs && <div><span className="font-medium">Entrées:</span> {p.inputs}</div>}
                      {p.outputs && <div><span className="font-medium">Sorties:</span> {p.outputs}</div>}
                      {p.kpi && <div><span className="font-medium">KPI:</span> {p.kpi}</div>}
                    </div>
                    {p.owner && <p className="text-xs text-muted-foreground mt-2">Pilote: {p.owner.name}</p>}
                  </div>
                  {canEdit && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => { setEditing(p); setShowForm(true) }}><Pencil className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showForm && <ProcessForm process={editing} users={users} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load() }} />}
    </div>
  )
}

function ProcessForm({ process, users, onClose, onSaved }: { process: ProcessItem | null; users: OrgUser[]; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast()
  const [form, setForm] = useState({
    name: process?.name || '',
    description: process?.description || '',
    type: process?.type || 'core',
    ownerId: process?.ownerId || '',
    inputs: process?.inputs || '',
    outputs: process?.outputs || '',
    kpi: process?.kpi || '',
    status: process?.status || 'active'
  })
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!form.name) { toast({ title: 'Nom requis', variant: 'destructive' }); return }
    setSaving(true)
    const url = process ? `/api/processes/${process.id}` : '/api/processes'
    const method = process ? 'PUT' : 'POST'
    const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setSaving(false)
    if (r.ok) { toast({ title: process ? 'Processus mis à jour' : 'Processus créé' }); onSaved() }
    else { const d = await r.json(); toast({ title: d.error || 'Erreur', variant: 'destructive' }) }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{process ? 'Modifier le processus' : 'Nouveau processus'}</DialogTitle>
          <DialogDescription>Description d'un processus du SMQ</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div>
            <Label>Nom *</Label>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{LABELS.processType(t)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Statut</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s === 'active' ? 'Actif' : 'Inactif'}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Pilote du processus</Label>
            <Select value={form.ownerId} onValueChange={v => setForm({ ...form, ownerId: v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Entrées</Label>
              <Textarea value={form.inputs} onChange={e => setForm({ ...form, inputs: e.target.value })} rows={2} />
            </div>
            <div>
              <Label>Sorties</Label>
              <Textarea value={form.outputs} onChange={e => setForm({ ...form, outputs: e.target.value })} rows={2} />
            </div>
          </div>
          <div>
            <Label>Indicateur (KPI)</Label>
            <Input value={form.kpi} onChange={e => setForm({ ...form, kpi: e.target.value })} />
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
