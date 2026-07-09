'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/lib/store/auth'
import { Plus, Trash2, Award, CheckCircle2, Building2, AlertCircle } from 'lucide-react'
import type { StandardItem, OrgStandardItem } from '@/lib/types'
import { fmtDate } from '@/lib/ui-labels'

const ORG_TYPES = [
  { value: 'manufacturer', label: 'Fabricant' },
  { value: 'distributor', label: 'Distributeur' },
  { value: 'service_provider', label: 'Prestataire de services' },
  { value: 'importer', label: 'Importateur' },
  { value: 'other', label: 'Autre' }
]

export function Settings() {
  const { user } = useAuth()
  const { toast } = useToast()
  const canEdit = user?.role === 'ADMIN'

  const [org, setOrg] = useState<any>(null)
  const [orgStandards, setOrgStandards] = useState<OrgStandardItem[]>([])
  const [available, setAvailable] = useState<StandardItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAddStandard, setShowAddStandard] = useState(false)

  const load = async () => {
    setLoading(true)
    const [o, s] = await Promise.all([
      fetch('/api/organizations').then(r => r.json()),
      fetch('/api/standards').then(r => r.json())
    ])
    setOrg(o.organization)
    setOrgStandards(s.organizationStandards || [])
    setAvailable(s.available || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const updateOrg = async () => {
    setSaving(true)
    const r = await fetch('/api/organizations', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(org)
    })
    setSaving(false)
    if (r.ok) toast({ title: 'Organisation mise à jour' })
    else { const d = await r.json(); toast({ title: d.error || 'Erreur', variant: 'destructive' }) }
  }

  const toggleCertified = async (s: OrgStandardItem) => {
    const r = await fetch('/api/standards', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ standardId: s.id, certified: !s.certified, certifiedAt: !s.certified ? new Date().toISOString().split('T')[0] : null })
    })
    if (r.ok) { toast({ title: s.certified ? 'Certification retirée' : 'Certification enregistrée' }); load() }
  }

  const removeStandard = async (s: OrgStandardItem) => {
    if (!confirm(`Retirer la norme ${s.code} de votre organisation ?`)) return
    const r = await fetch(`/api/standards?standardId=${s.id}`, { method: 'DELETE' })
    if (r.ok) { toast({ title: 'Norme retirée' }); load() }
  }

  const addStandard = async (stdId: string, certified: boolean) => {
    const r = await fetch('/api/standards', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ standardId: stdId, certified })
    })
    if (r.ok) { toast({ title: 'Norme ajoutée' }); setShowAddStandard(false); load() }
    else { const d = await r.json(); toast({ title: d.error || 'Erreur', variant: 'destructive' }) }
  }

  if (loading) return <div className="text-center py-8 text-muted-foreground">Chargement…</div>

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Paramètres</h1>
        <p className="text-sm text-muted-foreground">Configuration de l'organisation et des normes appliquées</p>
      </div>

      {/* Organization info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" /> Organisation</CardTitle>
          <CardDescription>Informations générales de l'organisation</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Nom</Label>
              <Input value={org?.name || ''} onChange={e => setOrg({ ...org, name: e.target.value })} disabled={!canEdit} />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={org?.type || 'manufacturer'} onValueChange={v => setOrg({ ...org, type: v })} disabled={!canEdit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ORG_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Adresse</Label>
            <Input value={org?.address || ''} onChange={e => setOrg({ ...org, address: e.target.value })} disabled={!canEdit} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Ville</Label>
              <Input value={org?.city || ''} onChange={e => setOrg({ ...org, city: e.target.value })} disabled={!canEdit} />
            </div>
            <div>
              <Label>Pays</Label>
              <Input value={org?.country || ''} onChange={e => setOrg({ ...org, country: e.target.value })} disabled={!canEdit} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Email de contact</Label>
              <Input type="email" value={org?.contactEmail || ''} onChange={e => setOrg({ ...org, contactEmail: e.target.value })} disabled={!canEdit} />
            </div>
            <div>
              <Label>Téléphone</Label>
              <Input value={org?.contactPhone || ''} onChange={e => setOrg({ ...org, contactPhone: e.target.value })} disabled={!canEdit} />
            </div>
          </div>
          {canEdit && (
            <div className="flex justify-end">
              <Button onClick={updateOrg} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Standards */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><Award className="h-5 w-5" /> Normes appliquées</CardTitle>
              <CardDescription>Normes de référence de votre système de management</CardDescription>
            </div>
            {canEdit && (
              <Button size="sm" onClick={() => setShowAddStandard(true)}>
                <Plus className="h-4 w-4 mr-1" /> Ajouter une norme
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {orgStandards.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune norme associée</p>
          ) : (
            <div className="grid gap-3">
              {orgStandards.map(s => (
                <div key={s.id} className="flex items-start justify-between gap-3 p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge variant="outline" className="font-mono">{s.code}</Badge>
                      <Badge variant="secondary">v{s.version}</Badge>
                      {s.certified ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <CheckCircle2 className="h-3 w-3 mr-1" />Certifié
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                          <AlertCircle className="h-3 w-3 mr-1" />Non certifié
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium">{s.name}</p>
                    {s.description && <p className="text-xs text-muted-foreground mt-1">{s.description}</p>}
                    {s.certifiedAt && <p className="text-xs text-muted-foreground mt-1">Certifié le: {fmtDate(s.certifiedAt)}</p>}
                  </div>
                  {canEdit && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => toggleCertified(s)}>
                        {s.certified ? 'Marquer non certifié' : 'Marquer certifié'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => removeStandard(s)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showAddStandard && (
        <AddStandardDialog
          available={available}
          attached={orgStandards}
          onClose={() => setShowAddStandard(false)}
          onAdd={addStandard}
        />
      )}
    </div>
  )
}

function AddStandardDialog({ available, attached, onClose, onAdd }: {
  available: StandardItem[]
  attached: OrgStandardItem[]
  onClose: () => void
  onAdd: (id: string, certified: boolean) => void
}) {
  const attachedIds = new Set(attached.map(s => s.id))
  const notAttached = available.filter(s => !attachedIds.has(s.id))
  const [selected, setSelected] = useState('')
  const [certified, setCertified] = useState(false)

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter une norme</DialogTitle>
          <DialogDescription>Sélectionnez une norme à appliquer à votre organisation</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div>
            <Label>Norme</Label>
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {notAttached.map(s => <SelectItem key={s.id} value={s.id}>{s.code} (v{s.version}) — {s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="certified" checked={certified} onChange={e => setCertified(e.target.checked)} />
            <Label htmlFor="certified" className="cursor-pointer">Marquer comme certifié</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={() => selected && onAdd(selected, certified)} disabled={!selected}>Ajouter</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
