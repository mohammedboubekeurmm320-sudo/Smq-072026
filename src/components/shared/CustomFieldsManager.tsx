'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Plus, Pencil, Trash2, Loader2, GripVertical } from 'lucide-react'

const FIELD_TYPES = [
  { value: 'text', label: 'Texte' },
  { value: 'number', label: 'Nombre' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Sélection' },
  { value: 'checkbox', label: 'Case à cocher' },
  { value: 'textarea', label: 'Zone de texte' },
  { value: 'rating', label: 'Évaluation' },
  { value: 'file', label: 'Fichier' },
  { value: 'table', label: 'Tableau' },
  { value: 'repeater', label: 'Répéteur' },
] as const

interface CustomFieldDef {
  id: string
  name: string
  label: string
  type: string
  required: boolean
  options: string[]
  helpText: string | null
  definitionId: string
  organizationId: string
  createdAt: string
}

interface CustomFieldsManagerProps {
  definitionId?: string
  organizationId: string
  onSave?: () => void
}

const emptyField = {
  name: '',
  label: '',
  type: 'text',
  required: false,
  options: '',
  helpText: '',
}

export function CustomFieldsManager({ definitionId, organizationId, onSave }: CustomFieldsManagerProps) {
  const [fields, setFields] = useState<CustomFieldDef[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...emptyField })
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const fetchFields = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ organizationId })
      if (definitionId) params.set('definitionId', definitionId)
      const res = await fetch(`/api/qms/custom_field_definitions?${params}`)
      if (res.ok) {
        const data = await res.json()
        setFields(data.data ?? data ?? [])
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [definitionId, organizationId])

  useEffect(() => {
    fetchFields()
  }, [fetchFields])

  const openCreate = () => {
    setEditingId(null)
    setForm({ ...emptyField })
    setDialogOpen(true)
  }

  const openEdit = (field: CustomFieldDef) => {
    setEditingId(field.id)
    setForm({
      name: field.name,
      label: field.label,
      type: field.type,
      required: field.required,
      options: (field.options ?? []).join(', '),
      helpText: field.helpText ?? '',
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.label.trim()) return
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        label: form.label.trim(),
        type: form.type,
        required: form.required,
        options: form.options
          .split(',')
          .map((o) => o.trim())
          .filter(Boolean),
        helpText: form.helpText.trim() || null,
        organizationId,
        definitionId: definitionId ?? null,
      }

      const url = editingId
        ? `/api/qms/custom_field_definitions/${editingId}`
        : '/api/qms/custom_field_definitions'
      const method = editingId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        setDialogOpen(false)
        fetchFields()
        onSave?.()
      }
    } catch {
      // silently fail
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      const res = await fetch(`/api/qms/custom_field_definitions/${deleteId}`, { method: 'DELETE' })
      if (res.ok) {
        setDeleteId(null)
        fetchFields()
        onSave?.()
      }
    } catch {
      // silently fail
    }
  }

  const getTypeLabel = (type: string) =>
    FIELD_TYPES.find((t) => t.value === type)?.label ?? type

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {fields.length} champ{fields.length !== 1 ? 's' : ''} personnalisé{fields.length !== 1 ? 's' : ''}
        </p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1.5 h-4 w-4" />
          Ajouter un champ
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : fields.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Aucun champ personnalisé défini.
        </p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Nom</TableHead>
                <TableHead>Libellé</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Requis</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((field) => (
                <TableRow key={field.id}>
                  <TableCell>
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                  <TableCell className="font-mono text-xs">{field.name}</TableCell>
                  <TableCell>{field.label}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{getTypeLabel(field.type)}</Badge>
                  </TableCell>
                  <TableCell>{field.required ? 'Oui' : 'Non'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(field)} aria-label="Modifier">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(field.id)}
                        aria-label="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Modifier le champ' : 'Nouveau champ personnalisé'}</DialogTitle>
            <DialogDescription>
              Définissez les propriétés du champ personnalisé.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="cf-name">Nom technique</Label>
              <Input
                id="cf-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="ex: priorite_client"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cf-label">Libellé d&apos;affichage</Label>
              <Input
                id="cf-label"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="ex: Priorité client"
              />
            </div>
            <div className="grid gap-2">
              <Label>Type de champ</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(form.type === 'select') && (
              <div className="grid gap-2">
                <Label htmlFor="cf-options">Options (séparées par des virgules)</Label>
                <Textarea
                  id="cf-options"
                  value={form.options}
                  onChange={(e) => setForm({ ...form, options: e.target.value })}
                  placeholder="Option A, Option B, Option C"
                  rows={2}
                />
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="cf-help">Texte d&apos;aide</Label>
              <Textarea
                id="cf-help"
                value={form.helpText}
                onChange={(e) => setForm({ ...form, helpText: e.target.value })}
                placeholder="Instructions affichées sous le champ…"
                rows={2}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label>Champ obligatoire</Label>
                <p className="text-xs text-muted-foreground">Le champ doit être rempli pour soumettre le formulaire</p>
              </div>
              <Switch
                checked={form.required}
                onCheckedChange={(checked) => setForm({ ...form, required: !!checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={!form.name.trim() || !form.label.trim() || saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingId ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce champ ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Les données existantes pour ce champ seront perdues.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}