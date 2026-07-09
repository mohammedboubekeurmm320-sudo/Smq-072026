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
import { Plus, Pencil, Trash2, Mail, Phone } from 'lucide-react'
import type { SupplierItem } from '@/lib/types'
import { LABELS, fmtDate, statusBadge } from '@/lib/ui-labels'

const EVALUATIONS = ['PENDING', 'APPROVED', 'CONDITIONAL', 'REJECTED']
const RISKS = ['low', 'medium', 'high']

export function Suppliers() {
  const { user } = useAuth()
  const { toast } = useToast()
  const canEdit = ['ADMIN', 'QUALITY_MANAGER'].includes(user?.role || '')

  const [items, setItems] = useState<SupplierItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<SupplierItem | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [evalFilter, setEvalFilter] = useState('ALL')

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (evalFilter !== 'ALL') params.set('evaluation', evalFilter)
    const r = await fetch(`/api/suppliers?${params}`)
    const d = await r.json()
    setItems(d.suppliers || [])
    setLoading(false)
  }, [evalFilter])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce fournisseur ?')) return
    const r = await fetch(`/api/suppliers/${id}`, { method: 'DELETE' })
    if (r.ok) { toast({ title: 'Fournisseur supprimé' }); load() }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fournisseurs</h1>
          <p className="text-sm text-muted-foreground">Achats et évaluation des fournisseurs (ISO 13485 §7.4)</p>
        </div>
        <div className="flex gap-2">
          <Select value={evalFilter} onValueChange={setEvalFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Toutes évaluations</SelectItem>
              {EVALUATIONS.map(e => <SelectItem key={e} value={e}>{LABELS.supplierEvaluation(e)}</SelectItem>)}
            </SelectContent>
          </Select>
          {canEdit && <Button onClick={() => { setEditing(null); setShowForm(true) }}><Plus className="h-4 w-4 mr-2" /> Nouveau fournisseur</Button>}
        </div>
      </div>

      {loading ? <div className="text-center py-8 text-muted-foreground">Chargement…</div> : items.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Aucun fournisseur</CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map(s => (
            <Card key={s.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-medium">{s.name}</h3>
                      <Badge variant="outline" className={`text-xs ${statusBadge(s.evaluation)}`}>{LABELS.supplierEvaluation(s.evaluation)}</Badge>
                      <Badge variant="secondary" className="text-xs">Risque: {LABELS.supplierRisk(s.riskLevel)}</Badge>
                    </div>
                    {s.category && <p className="text-sm text-muted-foreground">{s.category}</p>}
                    {s.contactName && <p className="text-sm mt-1">Contact: {s.contactName}</p>}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2 flex-wrap">
                      {s.email && <a href={`mailto:${s.email}`} className="flex items-center gap-1 hover:underline"><Mail className="h-3 w-3" />{s.email}</a>}
                      {s.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{s.phone}</span>}
                    </div>
                    {s.notes && <p className="text-xs mt-2 p-2 bg-slate-50 dark:bg-slate-900 rounded border italic">{s.notes}</p>}
                    {s.evaluationDate && <p className="text-xs text-muted-foreground mt-1">Évalué le: {fmtDate(s.evaluationDate)}</p>}
                  </div>
                  {canEdit && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => { setEditing(s); setShowForm(true) }}><Pencil className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(s.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showForm && <SupplierForm supplier={editing} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load() }} />}
    </div>
  )
}

function SupplierForm({ supplier, onClose, onSaved }: { supplier: SupplierItem | null; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast()
  const [form, setForm] = useState({
    name: supplier?.name || '',
    contactName: supplier?.contactName || '',
    email: supplier?.email || '',
    phone: supplier?.phone || '',
    category: supplier?.category || '',
    evaluation: supplier?.evaluation || 'PENDING',
    evaluationDate: supplier?.evaluationDate ? supplier.evaluationDate.split('T')[0] : '',
    riskLevel: supplier?.riskLevel || 'medium',
    notes: supplier?.notes || ''
  })
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!form.name) { toast({ title: 'Nom requis', variant: 'destructive' }); return }
    setSaving(true)
    const url = supplier ? `/api/suppliers/${supplier.id}` : '/api/suppliers'
    const method = supplier ? 'PUT' : 'POST'
    const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setSaving(false)
    if (r.ok) { toast({ title: supplier ? 'Fournisseur mis à jour' : 'Fournisseur créé' }); onSaved() }
    else { const d = await r.json(); toast({ title: d.error || 'Erreur', variant: 'destructive' }) }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{supplier ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}</DialogTitle>
          <DialogDescription>Fiche fournisseur et évaluation</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Nom *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Catégorie</Label>
              <Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Matière première, Service…" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Contact</Label>
              <Input value={form.contactName} onChange={e => setForm({ ...form, contactName: e.target.value })} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Téléphone</Label>
            <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Évaluation</Label>
              <Select value={form.evaluation} onValueChange={v => setForm({ ...form, evaluation: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{EVALUATIONS.map(e => <SelectItem key={e} value={e}>{LABELS.supplierEvaluation(e)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Niveau de risque</Label>
              <Select value={form.riskLevel} onValueChange={v => setForm({ ...form, riskLevel: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{RISKS.map(r => <SelectItem key={r} value={r}>{LABELS.supplierRisk(r)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date d'évaluation</Label>
              <Input type="date" value={form.evaluationDate} onChange={e => setForm({ ...form, evaluationDate: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />
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
