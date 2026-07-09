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
import type { AuditItem, OrgUser } from '@/lib/types'
import { LABELS, fmtDate, statusBadge } from '@/lib/ui-labels'

const TYPES = ['internal', 'external', 'supplier']
const STATUSES = ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']

export function Audits() {
  const { user } = useAuth()
  const { toast } = useToast()
  const canEdit = ['ADMIN', 'QUALITY_MANAGER', 'AUDITOR'].includes(user?.role || '')
  const canDelete = ['ADMIN', 'QUALITY_MANAGER'].includes(user?.role || '')

  const [items, setItems] = useState<AuditItem[]>([])
  const [users, setUsers] = useState<OrgUser[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<AuditItem | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [statusFilter, setStatusFilter] = useState('ALL')

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter !== 'ALL') params.set('status', statusFilter)
    const r = await fetch(`/api/audits?${params}`)
    const d = await r.json()
    setItems(d.audits || [])
    setLoading(false)
  }, [statusFilter])

  useEffect(() => { load() }, [load])
  useEffect(() => { fetch('/api/users').then(r => r.json()).then(d => setUsers(d.users || [])).catch(() => {}) }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cet audit ?')) return
    const r = await fetch(`/api/audits/${id}`, { method: 'DELETE' })
    if (r.ok) { toast({ title: 'Audit supprimé' }); load() }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Audits</h1>
          <p className="text-sm text-muted-foreground">Audit interne et audits externes (ISO 13485 §8.2.4)</p>
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous statuts</SelectItem>
              {STATUSES.map(s => <SelectItem key={s} value={s}>{LABELS.auditStatus(s)}</SelectItem>)}
            </SelectContent>
          </Select>
          {canEdit && <Button onClick={() => { setEditing(null); setShowForm(true) }}><Plus className="h-4 w-4 mr-2" /> Nouvel audit</Button>}
        </div>
      </div>

      {loading ? <div className="text-center py-8 text-muted-foreground">Chargement…</div> : items.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Aucun audit</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {items.map(a => (
            <Card key={a.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-medium">{a.title}</h3>
                      <Badge variant="secondary">{LABELS.auditType(a.type)}</Badge>
                      <Badge variant="outline" className={statusBadge(a.status)}>{LABELS.auditStatus(a.status)}</Badge>
                    </div>
                    {a.scope && <p className="text-sm text-muted-foreground">Périmètre: {a.scope}</p>}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2 flex-wrap">
                      <span>Planifié: {fmtDate(a.plannedDate)}</span>
                      {a.conductedDate && <span>Réalisé: {fmtDate(a.conductedDate)}</span>}
                      {a.leadAuditor && <span>Auditeur: {a.leadAuditor.name}</span>}
                    </div>
                    {a.findings && <p className="text-sm mt-2 p-2 bg-slate-50 dark:bg-slate-900 rounded border"><span className="font-medium">Constats:</span> {a.findings}</p>}
                    {a.conclusion && <p className="text-sm mt-1 p-2 bg-slate-50 dark:bg-slate-900 rounded border"><span className="font-medium">Conclusion:</span> {a.conclusion}</p>}
                  </div>
                  <div className="flex gap-1">
                    {canEdit && <Button size="sm" variant="ghost" onClick={() => { setEditing(a); setShowForm(true) }}><Pencil className="h-4 w-4" /></Button>}
                    {canDelete && <Button size="sm" variant="ghost" onClick={() => handleDelete(a.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showForm && <AuditForm audit={editing} users={users} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load() }} />}
    </div>
  )
}

function AuditForm({ audit, users, onClose, onSaved }: { audit: AuditItem | null; users: OrgUser[]; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast()
  const [form, setForm] = useState({
    title: audit?.title || '',
    type: audit?.type || 'internal',
    scope: audit?.scope || '',
    plannedDate: audit?.plannedDate ? audit.plannedDate.split('T')[0] : '',
    conductedDate: audit?.conductedDate ? audit.conductedDate.split('T')[0] : '',
    status: audit?.status || 'PLANNED',
    findings: audit?.findings || '',
    conclusion: audit?.conclusion || '',
    leadAuditorId: audit?.leadAuditorId || ''
  })
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!form.title) { toast({ title: 'Titre requis', variant: 'destructive' }); return }
    setSaving(true)
    const url = audit ? `/api/audits/${audit.id}` : '/api/audits'
    const method = audit ? 'PUT' : 'POST'
    const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setSaving(false)
    if (r.ok) { toast({ title: audit ? 'Audit mis à jour' : 'Audit créé' }); onSaved() }
    else { const d = await r.json(); toast({ title: d.error || 'Erreur', variant: 'destructive' }) }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{audit ? 'Modifier l\'audit' : 'Nouvel audit'}</DialogTitle>
          <DialogDescription>Planification et compte rendu d'audit</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div>
            <Label>Titre *</Label>
            <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{LABELS.auditType(t)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Statut</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{LABELS.auditStatus(s)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Périmètre</Label>
            <Input value={form.scope} onChange={e => setForm({ ...form, scope: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date planifiée</Label>
              <Input type="date" value={form.plannedDate} onChange={e => setForm({ ...form, plannedDate: e.target.value })} />
            </div>
            <div>
              <Label>Date de réalisation</Label>
              <Input type="date" value={form.conductedDate} onChange={e => setForm({ ...form, conductedDate: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Auditeur principal</Label>
            <Select value={form.leadAuditorId} onValueChange={v => setForm({ ...form, leadAuditorId: v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Constats</Label>
            <Textarea value={form.findings} onChange={e => setForm({ ...form, findings: e.target.value })} rows={3} />
          </div>
          <div>
            <Label>Conclusion</Label>
            <Textarea value={form.conclusion} onChange={e => setForm({ ...form, conclusion: e.target.value })} rows={2} />
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
