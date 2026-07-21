'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft, UserPlus, Pencil, UserX, ShieldCheck, Loader2, Users, Check, X,
} from 'lucide-react'
import { rolePermissions, type UserRole } from '@/types/qms'

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Administrateur' },
  { value: 'quality_manager', label: 'Responsable Qualité' },
  { value: 'auditor', label: 'Auditeur' },
  { value: 'document_controller', label: 'Contrôleur Documentaire' },
  { value: 'executive', label: 'Direction' },
  { value: 'operator', label: 'Opérateur' },
]

const DEPARTMENTS = [
  'Qualité', 'Production', 'R&D', 'Réglementaire', 'Achats',
  'Logistique', 'Maintenance', 'Laboratoire', 'Direction',
]

const PERMISSION_MODULES = [
  'documents', 'capa', 'ncr', 'deviation', 'changecontrol',
  'audit', 'training', 'risk', 'batch', 'supplier',
  'recordtypes', 'reports', 'compliance', 'admin',
]

const fmtDate = (d: string) => {
  try { return new Date(d).toLocaleDateString('fr-FR') } catch { return '—' }
}

export default function UserManagementView() {
  const router = useRouter()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Invite dialog
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteFullName, setInviteFullName] = useState('')
  const [invitePassword, setInvitePassword] = useState('')
  const [inviteRole, setInviteRole] = useState<UserRole>('operator')
  const [inviteDept, setInviteDept] = useState('')
  const [inviting, setInviting] = useState(false)

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false)
  const [editUser, setEditUser] = useState<any>(null)
  const [editRole, setEditRole] = useState<UserRole>('operator')
  const [editDept, setEditDept] = useState('')
  const [editActive, setEditActive] = useState(true)
  const [saving, setSaving] = useState(false)

  // Deactivate confirmation
  const [deactivateOpen, setDeactivateOpen] = useState(false)
  const [deactivateUser, setDeactivateUser] = useState<any>(null)
  const [deactivating, setDeactivating] = useState(false)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiGet<any>('/api/admin/users')
      setUsers(Array.isArray(data) ? data : data?.items || [])
    } catch {
      // Fallback mock data
      setUsers([
        { id: '1', email: 'admin@qms.com', full_name: 'Marie Dupont', role: 'admin', department: 'Qualité', active: true, last_login: '2025-06-20T10:00:00Z' },
        { id: '2', email: 'jean@qms.com', full_name: 'Jean Martin', role: 'quality_manager', department: 'Qualité', active: true, last_login: '2025-06-19T14:30:00Z' },
        { id: '3', email: 'sophie@qms.com', full_name: 'Sophie Bernard', role: 'auditor', department: 'Réglementaire', active: true, last_login: '2025-06-18T09:00:00Z' },
        { id: '4', email: 'pierre@qms.com', full_name: 'Pierre Leroy', role: 'operator', department: 'Production', active: false, last_login: '2025-05-01T16:00:00Z' },
      ])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !inviteFullName.trim()) return
    setInviting(true)
    try {
      await apiPost('/api/admin/users', {
        email: inviteEmail,
        full_name: inviteFullName,
        password: invitePassword || undefined,
        role: inviteRole,
        department: inviteDept,
      })
      setInviteOpen(false)
      setInviteEmail('')
      setInviteFullName('')
      setInvitePassword('')
      setInviteRole('operator')
      setInviteDept('')
      fetchUsers()
    } catch (e: any) {
      alert(e.message || 'Erreur lors de l\'invitation')
    } finally {
      setInviting(false)
    }
  }

  const handleEditSave = async () => {
    if (!editUser) return
    setSaving(true)
    try {
      await apiPut(`/api/admin/users/${editUser.id}`, {
        role: editRole,
        department: editDept,
        active: editActive,
      })
      setEditOpen(false)
      setEditUser(null)
      fetchUsers()
    } catch (e: any) {
      alert(e.message || 'Erreur lors de la modification')
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivate = async () => {
    if (!deactivateUser) return
    setDeactivating(true)
    try {
      await apiPut(`/api/admin/users/${deactivateUser.id}`, { active: false })
      setDeactivateOpen(false)
      setDeactivateUser(null)
      fetchUsers()
    } catch (e: any) {
      alert(e.message || 'Erreur lors de la désactivation')
    } finally {
      setDeactivating(false)
    }
  }

  const openEdit = (user: any) => {
    setEditUser(user)
    setEditRole(user.role)
    setEditDept(user.department || '')
    setEditActive(user.active !== false)
    setEditOpen(true)
  }

  const openDeactivate = (user: any) => {
    setDeactivateUser(user)
    setDeactivateOpen(true)
  }

  const filteredUsers = users.filter(u =>
    !search ||
    (u.full_name || u.fullName || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase())
  )

  // Role permission matrix
  const permissionKeys = Object.values(rolePermissions).flatMap(perms => perms)
  const uniquePermissions = [...new Set(permissionKeys)]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <button onClick={() => router.push('/dashboard')} className="text-sm text-muted-foreground hover:text-foreground mb-1 flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Tableau de bord
          </button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" /> Gestion des utilisateurs
          </h1>
          <p className="text-sm text-muted-foreground">{users.length} utilisateur(s) · Administration</p>
        </div>
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" /> Inviter un utilisateur
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <Input
            placeholder="Rechercher par nom ou email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Users table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full rounded" />)}
            </div>
          ) : (
            <ScrollArea className="max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead className="hidden lg:table-cell">Département</TableHead>
                    <TableHead className="hidden lg:table-cell">Statut</TableHead>
                    <TableHead className="hidden lg:table-cell">Dernière connexion</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map(user => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.full_name || user.fullName || '—'}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {user.email}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {ROLES.find(r => r.value === user.role)?.label || user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">
                        {user.department || '—'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Badge variant={user.active !== false ? 'default' : 'secondary'} className="text-xs">
                          {user.active !== false ? 'Actif' : 'Inactif'}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {fmtDate(user.last_login)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(user)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          {user.active !== false && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:text-red-700"
                              onClick={() => openDeactivate(user)}
                            >
                              <UserX className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Aucun utilisateur trouvé
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Permission matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" /> Matrice des permissions par rôle
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-40">Module</TableHead>
                  {ROLES.map(r => (
                    <TableHead key={r.value} className="text-center text-xs px-2">{r.label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {PERMISSION_MODULES.map(mod => {
                  const perms = ROLES.map(r => {
                    const hasRead = rolePermissions[r.value].some(p => p.startsWith(mod + '.read'))
                    const hasWrite = rolePermissions[r.value].some(p => p.startsWith(mod + '.') && p.includes('create') || p.includes('update'))
                    return { hasRead, hasWrite }
                  })
                  return (
                    <TableRow key={mod}>
                      <TableCell className="text-sm font-medium capitalize">{mod}</TableCell>
                      {perms.map((perm, i) => (
                        <TableCell key={i} className="text-center px-2">
                          <div className="flex items-center justify-center gap-0.5">
                            {perm.hasRead && <Check className="h-3 w-3 text-green-600" />}
                            {perm.hasWrite && <span className="text-[9px] text-amber-600 font-bold">W</span>}
                            {!perm.hasRead && <X className="h-3 w-3 text-muted-foreground/30" />}
                          </div>
                        </TableCell>
                      ))}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </ScrollArea>
          <div className="p-3 border-t text-xs text-muted-foreground flex items-center gap-3">
            <span className="flex items-center gap-1"><Check className="h-3 w-3 text-green-600" /> Lecture</span>
            <span className="flex items-center gap-1"><span className="text-amber-600 font-bold text-[9px]">W</span> Écriture</span>
            <span className="flex items-center gap-1"><X className="h-3 w-3 text-muted-foreground/30" /> Aucun accès</span>
          </div>
        </CardContent>
      </Card>

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inviter un utilisateur</DialogTitle>
            <DialogDescription>Envoyer une invitation par email pour rejoindre l&apos;organisation.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm">Nom complet</Label>
              <Input
                type="text"
                placeholder="Jean Dupont"
                className="mt-1"
                value={inviteFullName}
                onChange={e => setInviteFullName(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-sm">Email</Label>
              <Input
                type="email"
                placeholder="utilisateur@entreprise.com"
                className="mt-1"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-sm">Mot de passe</Label>
              <Input
                type="password"
                placeholder="Minimum 8 caractères (laisser vide = généré auto)"
                className="mt-1"
                value={invitePassword}
                onChange={e => setInvitePassword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">Si laissé vide, un mot de passe temporaire sera généré automatiquement.</p>
            </div>
            <div>
              <Label className="text-sm">Rôle</Label>
              <Select value={inviteRole} onValueChange={v => setInviteRole(v as UserRole)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Département</Label>
              <Select value={inviteDept} onValueChange={setInviteDept}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Annuler</Button>
            <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim() || !inviteFullName.trim()}>
              {inviting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Inviter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l&apos;utilisateur</DialogTitle>
            <DialogDescription>Modifier le rôle et le département de {editUser?.full_name || editUser?.fullName}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm">Rôle</Label>
              <Select value={editRole} onValueChange={v => setEditRole(v as UserRole)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Département</Label>
              <Select value={editDept} onValueChange={setEditDept}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-active"
                checked={editActive}
                onChange={e => setEditActive(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="edit-active" className="text-sm">Compte actif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Annuler</Button>
            <Button onClick={handleEditSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate confirmation */}
      <AlertDialog open={deactivateOpen} onOpenChange={setDeactivateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Désactiver l&apos;utilisateur ?</AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous vraiment désactiver le compte de {deactivateUser?.full_name || deactivateUser?.fullName} ?
              L&apos;utilisateur ne pourra plus se connecter.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivate} disabled={deactivating} className="bg-red-600 hover:bg-red-700">
              {deactivating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Désactiver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}