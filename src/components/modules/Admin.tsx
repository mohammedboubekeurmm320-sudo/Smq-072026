'use client'
import { useShallow } from 'zustand/react/shallow'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/contexts/AuthContext'
import { useQmsStore, type Profile } from '@/lib/demo-store'
import { rolePermissions, type UserRole, type Permission, type IndustryType, INDUSTRY_CONFIG, STANDARDS_BY_INDUSTRY, CORE_MODULES, OPTIONAL_MODULES, type ModuleKey } from '@/types/qms'
import { useToast } from '@/hooks/use-toast'
import { Users as UsersIcon, ShieldCheck, Layers, CheckCircle2, Plus, Pencil, Trash2, ScrollText, FileText } from 'lucide-react'

function clientHashPassword(p: string): string {
  const salt = 'qms_demo_salt_v1'
  let h = 0
  const data = salt + p
  for (let i = 0; i < data.length; i++) h = ((h << 5) - h) + data.charCodeAt(i) | 0
  return `DEMO$${Math.abs(h).toString(16)}$${data.length}`
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrateur', quality_manager: 'Responsable Qualité',
  auditor: 'Auditeur', document_controller: 'Contrôleur Documentaire',
  executive: 'Direction', operator: 'Opérateur',
}

const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  quality_manager: 'bg-blue-100 text-blue-700 border-blue-200',
  auditor: 'bg-violet-100 text-violet-700 border-violet-200',
  document_controller: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  executive: 'bg-amber-100 text-amber-700 border-amber-200',
  operator: 'bg-slate-100 text-slate-700 border-slate-200',
}

const PERMISSION_GROUPS = [
  { name: 'Documents', perms: ['documents.create', 'documents.read', 'documents.update', 'documents.delete', 'documents.approve'] },
  { name: 'CAPA', perms: ['capa.create', 'capa.read', 'capa.update', 'capa.delete', 'capa.approve'] },
  { name: 'NCR', perms: ['ncr.create', 'ncr.read', 'ncr.update', 'ncr.delete', 'ncr.approve'] },
  { name: 'Déviation', perms: ['deviation.create', 'deviation.read', 'deviation.update', 'deviation.delete', 'deviation.approve'] },
  { name: 'Change Control', perms: ['changecontrol.create', 'changecontrol.read', 'changecontrol.update', 'changecontrol.delete', 'changecontrol.approve'] },
  { name: 'Audit', perms: ['audit.create', 'audit.read', 'audit.update', 'audit.delete'] },
  { name: 'Formation', perms: ['training.create', 'training.read', 'training.update', 'training.delete'] },
  { name: 'Risque', perms: ['risk.create', 'risk.read', 'risk.update', 'risk.delete'] },
  { name: 'Lot', perms: ['batch.create', 'batch.read', 'batch.update', 'batch.delete', 'batch.release'] },
  { name: 'Fournisseur', perms: ['supplier.create', 'supplier.read', 'supplier.update', 'supplier.delete'] },
  { name: 'Types d\'enregistrement', perms: ['recordtypes.create', 'recordtypes.read', 'recordtypes.update', 'recordtypes.delete'] },
  { name: 'Rapports', perms: ['reports.view', 'reports.export'] },
  { name: 'Conformité', perms: ['compliance.view', 'compliance.manage'] },
  { name: 'Administration', perms: ['admin.users', 'admin.settings', 'admin.audit_trail'] },
]

export function UserManagementView() {
  const { profile: currentUser, hasPermission } = useAuth()
  const orgId = currentUser?.organizationId || ''
  const profiles = useQmsStore(useShallow(s => s.profiles)).filter(p => p.organizationId === orgId)
  const { toast } = useToast()
  const [editing, setEditing] = useState<Profile | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showMatrix, setShowMatrix] = useState(false)

  const handleToggleActive = (p: Profile) => {
    if (p.id === currentUser?.id) { toast({ title: 'Vous ne pouvez pas vous désactiver', variant: 'destructive' }); return }
    // Direct state update via store (we'll add a helper)
    useQmsStore.setState(state => ({
      profiles: state.profiles.map(prof => prof.id === p.id ? { ...prof, active: !prof.active } : prof),
    }))
    toast({ title: p.active ? 'Utilisateur désactivé' : 'Utilisateur activé' })
  }

  const handleDelete = (p: Profile) => {
    if (p.id === currentUser?.id) { toast({ title: 'Vous ne pouvez pas vous supprimer', variant: 'destructive' }); return }
    if (!confirm(`Supprimer ${p.fullName} ?`)) return
    useQmsStore.setState(state => ({ profiles: state.profiles.filter(prof => prof.id !== p.id) }))
    toast({ title: 'Utilisateur supprimé' })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><UsersIcon className="h-6 w-6 text-emerald-600" /> Gestion Utilisateurs</h1>
          <p className="text-sm text-muted-foreground">Comptes, rôles et permissions (ISO 13485 §5.5.1, §6.2)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowMatrix(!showMatrix)}>Matrice permissions</Button>
          {hasPermission('admin.users' as any) && <Button onClick={() => { setEditing(null); setShowForm(true) }}><Plus className="h-4 w-4 mr-2" /> Nouvel utilisateur</Button>}
        </div>
      </div>

      {showMatrix && (
        <Card>
          <CardHeader><CardTitle className="text-base">Matrice des permissions par rôle</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Module / Action</th>
                  {Object.keys(ROLE_LABELS).map(r => <th key={r} className="p-2 text-center">{ROLE_LABELS[r as UserRole]}</th>)}
                </tr>
              </thead>
              <tbody>
                {PERMISSION_GROUPS.map(g => (
                  <>
                    <tr key={g.name} className="border-b bg-slate-50 dark:bg-slate-900">
                      <td colSpan={7} className="p-2 font-medium">{g.name}</td>
                    </tr>
                    {g.perms.map(p => (
                      <tr key={p} className="border-b">
                        <td className="p-2 font-mono text-xs">{p}</td>
                        {(Object.keys(ROLE_LABELS) as UserRole[]).map(r => (
                          <td key={r} className="text-center p-2">
                            {rolePermissions[r].includes(p as Permission) ? <CheckCircle2 className="h-4 w-4 text-green-600 inline" /> : <span className="text-slate-300">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 dark:bg-slate-900">
                  <th className="text-left p-3">Nom</th>
                  <th className="text-left p-3">Email</th>
                  <th className="text-left p-3">Rôle</th>
                  <th className="text-left p-3">Département</th>
                  <th className="text-left p-3">Statut</th>
                  <th className="text-right p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map(p => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <td className="p-3">
                      <div className="font-medium">{p.fullName}{p.id === currentUser?.id && <span className="text-xs text-muted-foreground ml-1">(vous)</span>}</div>
                      {p.jobTitle && <div className="text-xs text-muted-foreground">{p.jobTitle}</div>}
                    </td>
                    <td className="p-3 text-xs">{p.email}</td>
                    <td className="p-3"><Badge variant="outline" className={ROLE_COLORS[p.role]}>{ROLE_LABELS[p.role]}</Badge></td>
                    <td className="p-3 text-xs">{p.department || '—'}</td>
                    <td className="p-3"><Switch checked={p.active} onCheckedChange={() => handleToggleActive(p)} disabled={p.id === currentUser?.id} /></td>
                    <td className="p-3 text-right">
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="ghost" onClick={() => { setEditing(p); setShowForm(true) }}><Pencil className="h-4 w-4" /></Button>
                        {p.id !== currentUser?.id && <Button size="sm" variant="ghost" onClick={() => handleDelete(p)}><Trash2 className="h-4 w-4 text-red-500" /></Button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {showForm && (
        <UserForm user={editing} orgId={orgId} currentUserId={currentUser?.id || ''} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); toast({ title: 'Utilisateur enregistré' }) }} />
      )}
    </div>
  )
}

function UserForm({ user, orgId, currentUserId, onClose, onSaved }: any) {
  const [form, setForm] = useState({
    fullName: user?.fullName || '', email: user?.email || '', password: '',
    role: user?.role || 'operator', department: user?.department || '', jobTitle: user?.jobTitle || '',
  })
  const [error, setError] = useState('')

  const handleSave = () => {
    setError('')
    if (!form.fullName || !form.email) { setError('Nom et email requis'); return }
    if (!user && !form.password) { setError('Mot de passe requis'); return }
    // Check email uniqueness
    const all = useQmsStore.getState().profiles
    if (all.find(p => p.email.toLowerCase() === form.email.toLowerCase() && p.id !== user?.id)) {
      setError('Email déjà utilisé'); return
    }
    const data: any = {
      fullName: form.fullName, email: form.email.toLowerCase(),
      role: form.role, department: form.department, jobTitle: form.jobTitle,
    }
    if (form.password) data.passwordHash = clientHashPassword(form.password)
    if (user) {
      useQmsStore.setState(state => ({
        profiles: state.profiles.map(p => p.id === user.id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p),
      }))
    } else {
      useQmsStore.setState(state => ({
        profiles: [...state.profiles, {
          id: 'u_' + Math.random().toString(36).slice(2, 10),
          ...data, organizationId: orgId, active: true,
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        }],
      }))
    }
    onSaved()
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>{user ? 'Modifier' : 'Nouvel'} utilisateur</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div><Label>Nom complet *</Label><Input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} /></div>
          <div><Label>Email *</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
          <div><Label>{user ? 'Nouveau mot de passe (vide = inchangé)' : 'Mot de passe *'}</Label><Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
          <div>
            <Label>Rôle</Label>
            <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(ROLE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Département</Label><Input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} /></div>
          <div><Label>Poste</Label><Input value={form.jobTitle} onChange={e => setForm({ ...form, jobTitle: e.target.value })} /></div>
          {error && <div className="text-sm text-red-600">{error}</div>}
        </div>
        <DialogFooter><Button variant="ghost" onClick={onClose}>Annuler</Button><Button onClick={handleSave}>Enregistrer</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// Settings View
// ============================================================================
export function SettingsView() {
  const { organization, updateOrgSettings, hasRole } = useAuth()
  const { toast } = useToast()
  const [form, setForm] = useState({
    name: organization?.name || '',
    industry_type: organization?.settings.industry_type || 'medical_device',
    applicable_standards: organization?.settings.applicable_standards || [],
    active_modules: organization?.settings.active_modules || [...CORE_MODULES],
    country: organization?.settings.country || '',
    city: organization?.settings.city || '',
    notifications: organization?.settings.notifications || { capa_overdue: true, ncr_overdue: true, document_expiry: true, training_overdue: true, audit_due: true },
  })

  const handleSave = () => {
    updateOrgSettings({
      industry_type: form.industry_type as IndustryType,
      applicable_standards: form.applicable_standards,
      active_modules: form.active_modules as ModuleKey[],
      country: form.country, city: form.city,
      notifications: form.notifications,
    } as any)
    toast({ title: 'Paramètres enregistrés' })
  }

  const toggleModule = (m: ModuleKey) => {
    if (CORE_MODULES.includes(m as any)) return
    setForm(f => ({
      ...f,
      active_modules: f.active_modules.includes(m) ? f.active_modules.filter(x => x !== m) : [...f.active_modules, m],
    }))
  }

  const toggleStandard = (s: string) => {
    setForm(f => ({
      ...f,
      applicable_standards: f.applicable_standards.includes(s) ? f.applicable_standards.filter(x => x !== s) : [...f.applicable_standards, s],
    }))
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Layers className="h-6 w-6 text-emerald-600" /> Paramètres</h1>
        <p className="text-sm text-muted-foreground">Configuration de l'organisation et du SMQ</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Informations organisation</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          <div><Label>Nom</Label><Input value={form.name} disabled /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Ville</Label><Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
            <div><Label>Pays</Label><Input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} /></div>
          </div>
          <div>
            <Label>Industrie</Label>
            <Select value={form.industry_type} onValueChange={v => setForm({ ...form, industry_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(INDUSTRY_CONFIG).map(([k, c]) => <SelectItem key={k} value={k}>{c.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Normes applicables</CardTitle><CardDescription>Sélectionnez les normes de référence</CardDescription></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {[...new Set(Object.values(STANDARDS_BY_INDUSTRY).flat())].map(s => (
              <label key={s} className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-slate-50">
                <input type="checkbox" checked={form.applicable_standards.includes(s)} onChange={() => toggleStandard(s)} />
                <span className="text-sm">{s}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Modules QMS activés</CardTitle><CardDescription>Modules Core obligatoires, modules optionnels activables</CardDescription></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {[...CORE_MODULES, ...OPTIONAL_MODULES].map(m => {
              const isCore = CORE_MODULES.includes(m as any)
              const isChecked = form.active_modules.includes(m)
              return (
                <label key={m} className={`flex items-center gap-2 p-2 border rounded ${isCore ? 'bg-slate-50 opacity-90' : 'cursor-pointer hover:bg-slate-50'}`}>
                  <input type="checkbox" checked={isChecked} disabled={isCore} onChange={() => toggleModule(m)} />
                  <span className="text-sm">{m}{isCore && <Badge variant="secondary" className="ml-1 text-xs">Core</Badge>}</span>
                </label>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Notifications</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(form.notifications).map(([k, v]) => (
              <label key={k} className="flex items-center gap-2 p-2 border rounded cursor-pointer">
                <Switch checked={v as boolean} onCheckedChange={(c) => setForm(f => ({ ...f, notifications: { ...f.notifications, [k]: c } }))} />
                <span className="text-sm">{k.replace(/_/g, ' ')}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end"><Button onClick={handleSave}>Enregistrer les paramètres</Button></div>
    </div>
  )
}

// ============================================================================
// Audit Trail View
// ============================================================================
export function AuditTrailView() {
  const { profile } = useAuth()
  const orgId = profile?.organizationId || ''
  const [actionFilter, setActionFilter] = useState('ALL')
  const [tableFilter, setTableFilter] = useState('ALL')

  let entries = useQmsStore(useShallow(s => s.auditTrails)).filter(a => a.organizationId === orgId)
  if (actionFilter !== 'ALL') entries = entries.filter(e => e.auditAction === actionFilter)
  if (tableFilter !== 'ALL') entries = entries.filter(e => e.tableName === tableFilter)

  const tables = [...new Set(useQmsStore(useShallow(s => s.auditTrails)).filter(a => a.organizationId === orgId).map(a => a.tableName))]
  const actions = ['CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'SIGN', 'LOGIN']

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><ScrollText className="h-6 w-6 text-emerald-600" /> Piste d'Audit</h1>
        <p className="text-sm text-muted-foreground">Journal immuable hash-chainé (21 CFR Part 11 §11.10(e))</p>
      </div>

      <Card>
        <CardContent className="p-4 flex gap-3">
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Action" /></SelectTrigger>
            <SelectContent><SelectItem value="ALL">Toutes actions</SelectItem>{actions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={tableFilter} onValueChange={setTableFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Table" /></SelectTrigger>
            <SelectContent><SelectItem value="ALL">Toutes tables</SelectItem>{tables.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-slate-50 dark:bg-slate-900">
                  <th className="p-2 text-left">#</th>
                  <th className="p-2 text-left">Hash</th>
                  <th className="p-2 text-left">Action</th>
                  <th className="p-2 text-left">Table</th>
                  <th className="p-2 text-left">Utilisateur</th>
                  <th className="p-2 text-left">Date</th>
                </tr>
              </thead>
              <tbody>
                {entries.slice(0, 200).map(e => (
                  <tr key={e.id} className="border-b last:border-0 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <td className="p-2 font-mono">{e.sequenceNumber}</td>
                    <td className="p-2 font-mono text-xs">{e.hash?.slice(0, 20)}…</td>
                    <td className="p-2"><Badge variant="secondary">{e.auditAction}</Badge></td>
                    <td className="p-2">{e.tableName}</td>
                    <td className="p-2">{e.userEmail || '—'}</td>
                    <td className="p-2">{new Date(e.createdAt).toLocaleString('fr-FR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================================
// Record Types View (admin only) — with custom type creation
// ============================================================================
export function RecordTypesView() {
  const { profile, hasPermission } = useAuth()
  const orgId = profile?.organizationId || ''
  const recordTypes = useQmsStore(useShallow(s => s.recordTypeDefinitions)).filter(r => r.organizationId === orgId)
  const createRecordType = useQmsStore(s => s.createRecordType)
  const deleteRecordType = useQmsStore(s => s.deleteRecordType)
  const { toast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [viewing, setViewing] = useState<any | null>(null)

  const canCreate = hasPermission('recordtypes.create' as any)
  const canDelete = hasPermission('recordtypes.delete' as any)

  const systemTypes = recordTypes.filter(r => r.isSystem)
  const customTypes = recordTypes.filter(r => !r.isSystem)

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Layers className="h-6 w-6 text-emerald-600" /> Types d'Enregistrements</h1>
          <p className="text-sm text-muted-foreground">Système extensible : {systemTypes.length} types système + {customTypes.length} types custom</p>
        </div>
        {canCreate && <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-2" /> Nouveau type</Button>}
      </div>

      {/* System types */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Types système ({systemTypes.length})</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {systemTypes.map(rt => (
            <Card key={rt.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setViewing(rt)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge variant="outline" className="font-mono">{rt.slug}</Badge>
                      <Badge variant="secondary" className="text-xs">Système</Badge>
                      {!rt.isActive && <Badge variant="outline" className="text-xs">Inactif</Badge>}
                      {rt.requiresEsig && <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">E-sig</Badge>}
                    </div>
                    <h3 className="font-medium">{rt.name}</h3>
                    {rt.description && <p className="text-sm text-muted-foreground line-clamp-2">{rt.description}</p>}
                    <div className="mt-2 text-xs text-muted-foreground">
                      {rt.statusFlow.length} statuts · {rt.complianceRefs.length} réf. conformité · v{rt.version}
                    </div>
                    {rt.complianceRefs.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {rt.complianceRefs.slice(0, 3).map((c: any, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs">{c.standard} {c.clause}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Custom types */}
      {customTypes.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Types custom ({customTypes.length})</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {customTypes.map(rt => (
              <Card key={rt.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setViewing(rt)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge variant="outline" className="font-mono">{rt.slug}</Badge>
                        <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">Custom</Badge>
                        {rt.codePrefix && <Badge variant="outline" className="text-xs font-mono">{rt.codePrefix}-</Badge>}
                        {rt.requiresEsig && <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">E-sig</Badge>}
                      </div>
                      <h3 className="font-medium">{rt.name}</h3>
                      {rt.description && <p className="text-sm text-muted-foreground line-clamp-2">{rt.description}</p>}
                      <div className="mt-2 text-xs text-muted-foreground">
                        {rt.statusFlow.length} statuts · {rt.complianceRefs.length} réf. conformité
                      </div>
                      {rt.complianceRefs.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {rt.complianceRefs.slice(0, 3).map((c: any, i: number) => (
                            <Badge key={i} variant="outline" className="text-xs">{c.standard} {c.clause}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    {canDelete && (
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); if (confirm('Supprimer ce type custom ?')) { const r = deleteRecordType(orgId, profile?.id || '', rt.id); if (!r.ok) toast({ title: r.error || 'Erreur', variant: 'destructive' }); else toast({ title: 'Type supprimé' }) } }}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <RecordTypeForm
          onClose={() => setShowForm(false)}
          onSave={(data) => {
            const r = createRecordType(orgId, profile?.id || '', data)
            if (r.ok) { toast({ title: 'Type custom créé' }); setShowForm(false) }
            else toast({ title: r.error || 'Erreur', variant: 'destructive' })
          }}
        />
      )}

      {viewing && (
        <RecordTypeDetailDialog
          recordType={viewing}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  )
}

function RecordTypeForm({ onClose, onSave }: { onClose: () => void; onSave: (data: any) => void }) {
  const [form, setForm] = useState({
    slug: '',
    name: '',
    description: '',
    codePrefix: '',
    requiresEsig: false,
    minApproverCount: 1,
    statuses: ['Open', 'Under Review', 'Closed'] as string[],
    newStatus: '',
    complianceRefs: [
      { standard: 'ISO 13485', clause: '4.1', description: 'Exigences générales' },
    ] as { standard: string; clause: string; description?: string }[],
  })
  const [error, setError] = useState('')

  const addStatus = () => {
    if (form.newStatus && !form.statuses.includes(form.newStatus)) {
      setForm({ ...form, statuses: [...form.statuses, form.newStatus], newStatus: '' })
    }
  }
  const removeStatus = (s: string) => setForm({ ...form, statuses: form.statuses.filter(x => x !== s) })

  const addCompliance = () => setForm({ ...form, complianceRefs: [...form.complianceRefs, { standard: 'ISO 13485', clause: '', description: '' }] })
  const removeCompliance = (i: number) => setForm({ ...form, complianceRefs: form.complianceRefs.filter((_, j) => j !== i) })

  const handleSave = () => {
    setError('')
    if (!form.slug) { setError('Slug requis'); return }
    if (!/^[a-z][a-z0-9_]*$/.test(form.slug)) { setError('Slug invalide (minuscules, chiffres, _)'); return }
    if (form.statuses.length === 0) { setError('Au moins 1 statut requis'); return }
    if (form.complianceRefs.length === 0) { setError('Au moins 1 référence de conformité requise'); return }
    onSave({
      slug: form.slug,
      name: form.name || form.slug,
      description: form.description,
      codePrefix: form.codePrefix || undefined,
      requiresEsig: form.requiresEsig,
      minApproverCount: form.minApproverCount,
      statusFlow: form.statuses.map((s, i) => ({ status: s, label: s, requiresESignature: form.requiresEsig && i === form.statuses.length - 1 })),
      defaultFields: [],
      complianceRefs: form.complianceRefs.filter(c => c.standard && c.clause),
    })
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouveau type d'enregistrement custom</DialogTitle>
          <DialogDescription>Créez un type d'enregistrement personnalisé extensible</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Slug *</Label>
              <Input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="mon_type_custom" className="font-mono" />
              <div className="text-xs text-muted-foreground mt-1">Minuscules, chiffres, _ uniquement</div>
            </div>
            <div><Label>Nom</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Mon Type Custom" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Préfixe de code</Label><Input value={form.codePrefix} onChange={e => setForm({ ...form, codePrefix: e.target.value })} placeholder="CUS" className="font-mono" /></div>
            <div><Label>Nb minimum d'approbateurs</Label><Input type="number" min="1" value={form.minApproverCount} onChange={e => setForm({ ...form, minApproverCount: Number(e.target.value) })} /></div>
          </div>
          <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} /></div>

          {/* Workflow / Statuses */}
          <div className="border-t pt-3">
            <div className="text-sm font-medium mb-2">Workflow (statuts)</div>
            <div className="flex flex-wrap gap-1 mb-2">
              {form.statuses.map(s => (
                <Badge key={s} variant="secondary" className="text-xs">{s} <button onClick={() => removeStatus(s)} className="ml-1">×</button></Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={form.newStatus} onChange={e => setForm({ ...form, newStatus: e.target.value })} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addStatus())} placeholder="Nouveau statut…" />
              <Button size="sm" onClick={addStatus}><Plus className="h-4 w-4" /></Button>
            </div>
            <label className="flex items-center gap-2 mt-2 text-sm">
              <input type="checkbox" checked={form.requiresEsig} onChange={e => setForm({ ...form, requiresEsig: e.target.checked })} />
              Signature électronique requise sur le statut terminal
            </label>
          </div>

          {/* Compliance refs */}
          <div className="border-t pt-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">Références de conformité *</div>
              <Button size="sm" variant="outline" onClick={addCompliance}><Plus className="h-3 w-3 mr-1" /> Ajouter</Button>
            </div>
            <div className="space-y-2">
              {form.complianceRefs.map((c, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <Select value={c.standard} onValueChange={v => { const arr = [...form.complianceRefs]; arr[i] = { ...arr[i], standard: v }; setForm({ ...form, complianceRefs: arr }) }}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ISO 13485">ISO 13485</SelectItem>
                      <SelectItem value="ISO 14971">ISO 14971</SelectItem>
                      <SelectItem value="ICH Q10">ICH Q10</SelectItem>
                      <SelectItem value="IVDR EU 2017/746">IVDR EU 2017/746</SelectItem>
                      <SelectItem value="FDA 21 CFR 820">FDA 21 CFR 820</SelectItem>
                      <SelectItem value="FDA 21 CFR Part 11">FDA 21 CFR Part 11</SelectItem>
                      <SelectItem value="IEC 62304">IEC 62304</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input placeholder="Clause (ex. 4.2.3)" value={c.clause} onChange={e => { const arr = [...form.complianceRefs]; arr[i] = { ...arr[i], clause: e.target.value }; setForm({ ...form, complianceRefs: arr }) }} className="flex-1" />
                  <Button size="sm" variant="ghost" onClick={() => removeCompliance(i)}><Trash2 className="h-3 w-3 text-red-500" /></Button>
                </div>
              ))}
            </div>
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSave}>Créer le type</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RecordTypeDetailDialog({ recordType, onClose }: { recordType: any; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <Layers className="h-5 w-5" />
            {recordType.name}
            <Badge variant="outline" className="font-mono">{recordType.slug}</Badge>
            {recordType.isSystem && <Badge variant="secondary">Système</Badge>}
          </DialogTitle>
          <DialogDescription>{recordType.description || '—'}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Préfixe de code:</span> {recordType.codePrefix || '—'}</div>
            <div><span className="text-muted-foreground">Version:</span> {recordType.version}</div>
            <div><span className="text-muted-foreground">E-sig requise:</span> {recordType.requiresEsig ? 'Oui' : 'Non'}</div>
            <div><span className="text-muted-foreground">Min approbateurs:</span> {recordType.minApproverCount}</div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">Workflow ({recordType.statusFlow.length} statuts)</h4>
            <div className="flex flex-wrap gap-1">
              {recordType.statusFlow.map((s: any, i: number) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {i + 1}. {s.status}
                  {s.requiresESignature && <span className="ml-1 text-amber-600">🔒</span>}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">Références de conformité ({recordType.complianceRefs.length})</h4>
            <div className="space-y-1">
              {recordType.complianceRefs.map((c: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Badge variant="outline" className="text-xs">{c.standard}</Badge>
                  <Badge variant="secondary" className="text-xs font-mono">{c.clause}</Badge>
                  {c.description && <span className="text-xs text-muted-foreground">{c.description}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// Reports View (placeholder)
// ============================================================================
export function ReportsView() {
  const { organization } = useAuth()
  const orgId = organization?.id || ''
  const capas = useQmsStore(useShallow(s => s.capas)).filter(c => c.organizationId === orgId)
  const ncrs = useQmsStore(useShallow(s => s.ncrs)).filter(n => n.organizationId === orgId)
  const audits = useQmsStore(useShallow(s => s.audits)).filter(a => a.organizationId === orgId)
  const documents = useQmsStore(useShallow(s => s.documents)).filter(d => d.organizationId === orgId)
  const risks = useQmsStore(useShallow(s => s.risks)).filter(r => r.organizationId === orgId)

  const reports = [
    { id: 'management_review', name: 'Revue de Direction', desc: 'Synthèse pour revue de direction (ISO 13485 §5.6)', icon: ShieldCheck },
    { id: 'capa_summary', name: 'Synthèse CAPA', desc: 'Statistiques CAPA sur la période', icon: CheckCircle2 },
    { id: 'audit_summary', name: 'Synthèse Audits', desc: 'Compte-rendu des audits réalisés', icon: ScrollText },
    { id: 'compliance_overview', name: 'Vue Conformité', desc: 'État de conformité global', icon: CheckCircle2 },
    { id: 'training_status', name: 'Statut Formations', desc: 'État des formations du personnel', icon: UsersIcon },
    { id: 'risk_profile', name: 'Profil de Risques', desc: 'Analyse des risques (FMEA)', icon: ShieldCheck },
  ]

  const handleExport = (id: string) => {
    let csv = ''
    if (id === 'capa_summary') {
      csv = ['N° CAPA', 'Titre', 'Type', 'Statut', 'Priorité', 'Source', 'Échéance'].join(';') + '\n'
      for (const c of capas) csv += [c.capaNumber, c.title, c.capaType, c.status, c.priority, c.source, c.dueDate || ''].join(';') + '\n'
    } else if (id === 'audit_summary') {
      csv = ['N° Audit', 'Titre', 'Type', 'Statut', 'Date'].join(';') + '\n'
      for (const a of audits) csv += [a.auditNumber, a.title, a.auditType, a.status, a.scheduledDate || ''].join(';') + '\n'
    } else {
      csv = `Rapport ${id}\nGénéré le ${new Date().toISOString()}\n\nStatistiques:\nCAPAs: ${capas.length}\nNCRs: ${ncrs.length}\nAudits: ${audits.length}\nDocuments: ${documents.length}\nRisques: ${risks.length}\n`
    }
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${id}-${Date.now()}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-6 w-6 text-emerald-600" /> Rapports & Analyses</h1>
        <p className="text-sm text-muted-foreground">Génération de rapports QMS (ISO 13485 §8.4)</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {reports.map(r => (
          <Card key={r.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleExport(r.id)}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600"><r.icon className="h-5 w-5" /></div>
                <div className="flex-1">
                  <h3 className="font-medium">{r.name}</h3>
                  <p className="text-sm text-muted-foreground">{r.desc}</p>
                  <Button size="sm" variant="outline" className="mt-2" onClick={(e) => { e.stopPropagation(); handleExport(r.id) }}>Exporter CSV</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
