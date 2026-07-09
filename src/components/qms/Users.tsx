'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/lib/store/auth'
import { Plus, Pencil, Trash2, Mail, ShieldCheck } from 'lucide-react'
import type { OrgUser } from '@/lib/types'
import { LABELS, fmtDate, fmtDateTime, statusBadge } from '@/lib/ui-labels'

const ROLES = ['ADMIN', 'QUALITY_MANAGER', 'ENGINEER', 'AUDITOR', 'VIEWER']

export function Users() {
  const { user: currentUser } = useAuth()
  const { toast } = useToast()
  const [items, setItems] = useState<OrgUser[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<OrgUser | null>(null)
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/users')
    const d = await r.json()
    setItems(d.users || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cet utilisateur ?')) return
    const r = await fetch(`/api/users/${id}`, { method: 'DELETE' })
    if (r.ok) { toast({ title: 'Utilisateur supprimé' }); load() }
    else { const d = await r.json(); toast({ title: d.error || 'Erreur', variant: 'destructive' }) }
  }

  const toggleActive = async (u: OrgUser) => {
    const r = await fetch(`/api/users/${u.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !u.active })
    })
    if (r.ok) { toast({ title: u.active ? 'Désactivé' : 'Activé' }); load() }
    else { const d = await r.json(); toast({ title: d.error || 'Erreur', variant: 'destructive' }) }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Utilisateurs</h1>
          <p className="text-sm text-muted-foreground">Gestion des comptes et rôles (ISO 13485 §5.5.1, §6.2)</p>
        </div>
        <Button onClick={() => { setEditing(null); setShowForm(true) }}>
          <Plus className="h-4 w-4 mr-2" /> Nouvel utilisateur
        </Button>
      </div>

      {loading ? <div className="text-center py-8 text-muted-foreground">Chargement…</div> : items.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Aucun utilisateur</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 dark:bg-slate-900">
                    <th className="text-left p-3 font-medium">Nom</th>
                    <th className="text-left p-3 font-medium">Email</th>
                    <th className="text-left p-3 font-medium">Rôle</th>
                    <th className="text-left p-3 font-medium">Département</th>
                    <th className="text-left p-3 font-medium">Statut</th>
                    <th className="text-left p-3 font-medium">Dernière connexion</th>
                    <th className="text-right p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(u => (
                    <tr key={u.id} className="border-b last:border-0 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                      <td className="p-3">
                        <div className="font-medium">{u.name}{u.id === currentUser?.id && <span className="text-xs text-muted-foreground ml-1">(vous)</span>}</div>
                        {u.position && <div className="text-xs text-muted-foreground">{u.position}</div>}
                      </td>
                      <td className="p-3 text-xs">
                        <a href={`mailto:${u.email}`} className="flex items-center gap-1 hover:underline"><Mail className="h-3 w-3" />{u.email}</a>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-xs">
                          {u.role === 'ADMIN' && <ShieldCheck className="h-3 w-3 mr-1" />}
                          {LABELS.role(u.role)}
                        </Badge>
                      </td>
                      <td className="p-3 text-xs">{u.department || '—'}</td>
                      <td className="p-3">
                        <Switch
                          checked={u.active}
                          onCheckedChange={() => toggleActive(u)}
                          disabled={u.id === currentUser?.id}
                        />
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">{u.lastLoginAt ? fmtDateTime(u.lastLoginAt) : 'Jamais'}</td>
                      <td className="p-3 text-right">
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="ghost" onClick={() => { setEditing(u); setShowForm(true) }}><Pencil className="h-4 w-4" /></Button>
                          {u.id !== currentUser?.id && (
                            <Button size="sm" variant="ghost" onClick={() => handleDelete(u.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {showForm && <UserForm user={editing} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load() }} />}
    </div>
  )
}

function UserForm({ user, onClose, onSaved }: { user: OrgUser | null; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast()
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    role: user?.role || 'VIEWER',
    position: user?.position || '',
    department: user?.department || ''
  })
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!form.name || !form.email) { toast({ title: 'Nom et email requis', variant: 'destructive' }); return }
    if (!user && !form.password) { toast({ title: 'Mot de passe requis', variant: 'destructive' }); return }
    setSaving(true)
    const payload: any = { name: form.name, email: form.email, role: form.role, position: form.position, department: form.department }
    if (form.password) payload.password = form.password
    const url = user ? `/api/users/${user.id}` : '/api/users'
    const method = user ? 'PUT' : 'POST'
    const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    setSaving(false)
    if (r.ok) { toast({ title: user ? 'Utilisateur mis à jour' : 'Utilisateur créé' }); onSaved() }
    else { const d = await r.json(); toast({ title: d.error || 'Erreur', variant: 'destructive' }) }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{user ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}</DialogTitle>
          <DialogDescription>{user ? 'Mettre à jour les informations' : 'Créer un compte dans votre organisation'}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div>
            <Label>Nom complet *</Label>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Email *</Label>
            <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <Label>{user ? 'Nouveau mot de passe (laisser vide pour ne pas changer)' : 'Mot de passe *'}</Label>
            <Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Rôle</Label>
              <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{LABELS.role(r)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Département</Label>
              <Input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Poste</Label>
            <Input value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} />
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
