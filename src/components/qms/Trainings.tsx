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
import type { TrainingItem, OrgUser } from '@/lib/types'
import { LABELS, fmtDate, statusBadge } from '@/lib/ui-labels'

const CATEGORIES = ['quality', 'technical', 'regulatory', 'safety']
const STATUSES = ['PLANNED', 'IN_PROGRESS', 'COMPLETED']

export function Trainings() {
  const { user } = useAuth()
  const { toast } = useToast()
  const canEdit = ['ADMIN', 'QUALITY_MANAGER'].includes(user?.role || '')

  const [items, setItems] = useState<TrainingItem[]>([])
  const [users, setUsers] = useState<OrgUser[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<TrainingItem | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [statusFilter, setStatusFilter] = useState('ALL')

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter !== 'ALL') params.set('status', statusFilter)
    const r = await fetch(`/api/trainings?${params}`)
    const d = await r.json()
    setItems(d.trainings || [])
    setLoading(false)
  }, [statusFilter])

  useEffect(() => { load() }, [load])
  useEffect(() => { fetch('/api/users').then(r => r.json()).then(d => setUsers(d.users || [])).catch(() => {}) }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette formation ?')) return
    const r = await fetch(`/api/trainings/${id}`, { method: 'DELETE' })
    if (r.ok) { toast({ title: 'Formation supprimée' }); load() }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Formations</h1>
          <p className="text-sm text-muted-foreground">Compétences, sensibilisation et formation (ISO 13485 §6.2)</p>
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous statuts</SelectItem>
              {STATUSES.map(s => <SelectItem key={s} value={s}>{LABELS.trainingStatus(s)}</SelectItem>)}
            </SelectContent>
          </Select>
          {canEdit && <Button onClick={() => { setEditing(null); setShowForm(true) }}><Plus className="h-4 w-4 mr-2" /> Nouvelle formation</Button>}
        </div>
      </div>

      {loading ? <div className="text-center py-8 text-muted-foreground">Chargement…</div> : items.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Aucune formation</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {items.map(t => (
            <Card key={t.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-medium">{t.name}</h3>
                      <Badge variant="secondary" className="text-xs">{LABELS.trainingCategory(t.category)}</Badge>
                      <Badge variant="outline" className={`text-xs ${statusBadge(t.status)}`}>{LABELS.trainingStatus(t.status)}</Badge>
                      {t.score != null && <Badge variant="outline" className="text-xs">Score: {t.score}/100</Badge>}
                    </div>
                    {t.description && <p className="text-sm text-muted-foreground">{t.description}</p>}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2 flex-wrap">
                      <span>Stagiaire: {t.user?.name || '—'}</span>
                      {t.user?.department && <span>Dépt: {t.user.department}</span>}
                      <span>Planifiée: {fmtDate(t.conductedDate)}</span>
                      {t.completedDate && <span>Terminée: {fmtDate(t.completedDate)}</span>}
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => { setEditing(t); setShowForm(true) }}><Pencil className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(t.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showForm && <TrainingForm training={editing} users={users} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load() }} />}
    </div>
  )
}

function TrainingForm({ training, users, onClose, onSaved }: { training: TrainingItem | null; users: OrgUser[]; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast()
  const [form, setForm] = useState({
    userId: training?.userId || '',
    name: training?.name || '',
    description: training?.description || '',
    category: training?.category || 'quality',
    conductedDate: training?.conductedDate ? training.conductedDate.split('T')[0] : '',
    completedDate: training?.completedDate ? training.completedDate.split('T')[0] : '',
    status: training?.status || 'PLANNED',
    score: training?.score ?? ''
  })
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!form.userId || !form.name) { toast({ title: 'Utilisateur et nom requis', variant: 'destructive' }); return }
    setSaving(true)
    const url = training ? `/api/trainings/${training.id}` : '/api/trainings'
    const method = training ? 'PUT' : 'POST'
    const payload = { ...form, score: form.score === '' ? null : Number(form.score) }
    const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    setSaving(false)
    if (r.ok) { toast({ title: training ? 'Formation mise à jour' : 'Formation créée' }); onSaved() }
    else { const d = await r.json(); toast({ title: d.error || 'Erreur', variant: 'destructive' }) }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{training ? 'Modifier la formation' : 'Nouvelle formation'}</DialogTitle>
          <DialogDescription>Planifier une formation pour un collaborateur</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Stagiaire *</Label>
              <Select value={form.userId} onValueChange={v => setForm({ ...form, userId: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Catégorie</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{LABELS.trainingCategory(c)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Nom de la formation *</Label>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Statut</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{LABELS.trainingStatus(s)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date prévue</Label>
              <Input type="date" value={form.conductedDate} onChange={e => setForm({ ...form, conductedDate: e.target.value })} />
            </div>
            <div>
              <Label>Date de fin</Label>
              <Input type="date" value={form.completedDate} onChange={e => setForm({ ...form, completedDate: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Score (/100)</Label>
            <Input type="number" min="0" max="100" value={form.score} onChange={e => setForm({ ...form, score: e.target.value === '' ? '' : Number(e.target.value) })} />
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
