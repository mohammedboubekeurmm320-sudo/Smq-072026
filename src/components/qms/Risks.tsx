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
import { Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react'
import type { RiskItem, OrgUser } from '@/lib/types'
import { LABELS, rpnLevel, statusBadge } from '@/lib/ui-labels'

const STATUSES = ['IDENTIFIED', 'ANALYZED', 'MITIGATED', 'CLOSED']

export function Risks() {
  const { user } = useAuth()
  const { toast } = useToast()
  const canEdit = ['ADMIN', 'QUALITY_MANAGER', 'ENGINEER'].includes(user?.role || '')
  const canDelete = ['ADMIN', 'QUALITY_MANAGER'].includes(user?.role || '')

  const [items, setItems] = useState<RiskItem[]>([])
  const [users, setUsers] = useState<OrgUser[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<RiskItem | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [statusFilter, setStatusFilter] = useState('ALL')

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter !== 'ALL') params.set('status', statusFilter)
    const r = await fetch(`/api/risks?${params}`)
    const d = await r.json()
    setItems(d.risks || [])
    setLoading(false)
  }, [statusFilter])

  useEffect(() => { load() }, [load])
  useEffect(() => { fetch('/api/users').then(r => r.json()).then(d => setUsers(d.users || [])).catch(() => {}) }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce risque ?')) return
    const r = await fetch(`/api/risks/${id}`, { method: 'DELETE' })
    if (r.ok) { toast({ title: 'Risque supprimé' }); load() }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestion des risques</h1>
          <p className="text-sm text-muted-foreground">Analyse des risques dispositifs médicaux (ISO 14971)</p>
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous statuts</SelectItem>
              {STATUSES.map(s => <SelectItem key={s} value={s}>{LABELS.riskStatus(s)}</SelectItem>)}
            </SelectContent>
          </Select>
          {canEdit && (
            <Button onClick={() => { setEditing(null); setShowForm(true) }}>
              <Plus className="h-4 w-4 mr-2" /> Nouveau risque
            </Button>
          )}
        </div>
      </div>

      {loading ? <div className="text-center py-8 text-muted-foreground">Chargement…</div> : items.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Aucun risque enregistré</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {items.map(risk => {
            const lvl = rpnLevel(risk.rpn)
            return (
              <Card key={risk.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-medium">{risk.title}</h3>
                        <Badge variant="outline" className={statusBadge(risk.status)}>{LABELS.riskStatus(risk.status)}</Badge>
                        {risk.process && <Badge variant="secondary" className="text-xs">{risk.process}</Badge>}
                      </div>
                      {risk.description && <p className="text-sm text-muted-foreground mb-2">{risk.description}</p>}
                      <div className="flex items-center gap-4 flex-wrap text-sm">
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">S:</span><span className="font-medium">{risk.severity}</span>
                          <span className="text-muted-foreground">P:</span><span className="font-medium">{risk.probability}</span>
                          <span className="text-muted-foreground">D:</span><span className="font-medium">{risk.detectability}</span>
                        </div>
                        <Badge variant="outline" className={`${lvl.bg} ${lvl.color} border`}>
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          RPN: {risk.rpn} · {lvl.label}
                        </Badge>
                        {risk.owner && <span className="text-xs text-muted-foreground">Resp: {risk.owner.name}</span>}
                      </div>
                      {risk.mitigation && <p className="text-sm mt-2 p-2 bg-slate-50 dark:bg-slate-900 rounded border"><span className="font-medium">Atténuation:</span> {risk.mitigation}</p>}
                    </div>
                    <div className="flex gap-1">
                      {canEdit && <Button size="sm" variant="ghost" onClick={() => { setEditing(risk); setShowForm(true) }}><Pencil className="h-4 w-4" /></Button>}
                      {canDelete && <Button size="sm" variant="ghost" onClick={() => handleDelete(risk.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {showForm && <RiskForm risk={editing} users={users} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load() }} />}
    </div>
  )
}

function RiskForm({ risk, users, onClose, onSaved }: {
  risk: RiskItem | null
  users: OrgUser[]
  onClose: () => void
  onSaved: () => void
}) {
  const { toast } = useToast()
  const [form, setForm] = useState({
    title: risk?.title || '',
    description: risk?.description || '',
    process: risk?.process || '',
    hazard: risk?.hazard || '',
    severity: risk?.severity || 5,
    probability: risk?.probability || 5,
    detectability: risk?.detectability || 5,
    mitigation: risk?.mitigation || '',
    status: risk?.status || 'IDENTIFIED',
    ownerId: risk?.ownerId || ''
  })
  const [saving, setSaving] = useState(false)
  const rpn = form.severity * form.probability * form.detectability
  const lvl = rpnLevel(rpn)

  const save = async () => {
    if (!form.title) { toast({ title: 'Titre requis', variant: 'destructive' }); return }
    setSaving(true)
    const url = risk ? `/api/risks/${risk.id}` : '/api/risks'
    const method = risk ? 'PUT' : 'POST'
    const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setSaving(false)
    if (r.ok) { toast({ title: risk ? 'Risque mis à jour' : 'Risque créé' }); onSaved() }
    else { const d = await r.json(); toast({ title: d.error || 'Erreur', variant: 'destructive' }) }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{risk ? 'Modifier le risque' : 'Nouveau risque'}</DialogTitle>
          <DialogDescription>Analyse de risque selon ISO 14971</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div>
            <Label>Titre *</Label>
            <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Processus</Label>
              <Input value={form.process} onChange={e => setForm({ ...form, process: e.target.value })} placeholder="Production" />
            </div>
            <div>
              <Label>Danger</Label>
              <Input value={form.hazard} onChange={e => setForm({ ...form, hazard: e.target.value })} placeholder="Contamination" />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[['Sévérité (S)', 'severity'], ['Probabilité (P)', 'probability'], ['DéTECTABILITÉ (D)', 'detectability']].map(([label, key]) => (
              <div key={key}>
                <Label>{label}</Label>
                <Select value={String(form[key as keyof typeof form])} onValueChange={v => setForm({ ...form, [key]: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{[1, 2, 3, 4, 5].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <div className="p-3 rounded border bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
            <span className="text-sm font-medium">RPN = S × P × D</span>
            <Badge className={`${lvl.bg} ${lvl.color} border`}>{rpn} · {lvl.label}</Badge>
          </div>
          <div>
            <Label>Mesures d'atténuation</Label>
            <Textarea value={form.mitigation} onChange={e => setForm({ ...form, mitigation: e.target.value })} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Statut</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{LABELS.riskStatus(s)}</SelectItem>)}</SelectContent>
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
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
