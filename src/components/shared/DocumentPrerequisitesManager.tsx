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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Plus, Pencil, Trash2, Loader2, Shield, FileText } from 'lucide-react'
import { QMS_ENTITIES } from '@/lib/qms-entity-map'
import type { DocumentType } from '@/types/qms'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PrerequisiteRecord {
  id: string
  organization_id: string
  record_type: string
  required_doc_type: string
  required_doc_ref: string | null
  is_mandatory: boolean
  description: string | null
  created_at: string
}

interface DocumentPrerequisitesManagerProps {
  // Autonomous component — fetches data from API
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RECORD_TYPE_OPTIONS = Object.entries(QMS_ENTITIES).map(([slug, cfg]) => ({
  value: slug,
  label: cfg.labelPlural,
}))

const DOCUMENT_TYPE_OPTIONS: { value: DocumentType; label: string }[] = [
  { value: 'MANUEL', label: 'Manuel Qualité' },
  { value: 'POLITIQUE', label: 'Politique' },
  { value: 'INDICATEUR', label: 'Indicateur' },
  { value: 'PROCESS_MAP', label: 'Cartographie Processus' },
  { value: 'ORGANIGRAMME', label: 'Organigramme' },
  { value: 'REGLEMENTAIRE', label: 'Document Réglementaire' },
  { value: 'PROCEDURE', label: 'Procédure' },
  { value: 'INSTRUCTION', label: 'Instruction' },
  { value: 'SOP', label: 'SOP' },
  { value: 'WI', label: 'WI' },
  { value: 'FORMULAIRE', label: 'Formulaire' },
  { value: 'REGISTRE', label: 'Registre' },
  { value: 'ENREGISTREMENT', label: 'Enregistrement' },
  { value: 'MASTER_BATCH', label: 'Master Batch Record' },
  { value: 'Specification', label: 'Spécification' },
  { value: 'Policy', label: 'Policy' },
  { value: 'Form', label: 'Form' },
]

const emptyForm = {
  recordType: '',
  requiredDocType: '',
  requiredDocRef: '',
  isMandatory: true,
  description: '',
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DocumentPrerequisitesManager(_props: DocumentPrerequisitesManagerProps) {
  const [prerequisites, setPrerequisites] = useState<PrerequisiteRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // -----------------------------------------------------------------------
  // Fetch
  // -----------------------------------------------------------------------

  const fetchPrerequisites = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/document-prerequisites', { credentials: 'include' })
      if (r.ok) {
        const d = await r.json()
        setPrerequisites(d.data?.items ?? d.data ?? [])
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPrerequisites()
  }, [fetchPrerequisites])

  // -----------------------------------------------------------------------
  // Grouped by record type
  // -----------------------------------------------------------------------

  const grouped: Record<string, PrerequisiteRecord[]> = {}
  for (const p of prerequisites) {
    if (!grouped[p.record_type]) grouped[p.record_type] = []
    grouped[p.record_type].push(p)
  }

  const sortedGroups = Object.entries(grouped).sort(([a], [b]) =>
    a.localeCompare(b),
  )

  const getRecordTypeLabel = (slug: string) =>
    QMS_ENTITIES[slug]?.labelPlural ?? slug

  const getDocTypeLabel = (t: string) =>
    DOCUMENT_TYPE_OPTIONS.find((o) => o.value === t)?.label ?? t

  // -----------------------------------------------------------------------
  // CRUD
  // -----------------------------------------------------------------------

  const openCreate = () => {
    setEditingId(null)
    setForm({ ...emptyForm })
    setDialogOpen(true)
  }

  const openEdit = (p: PrerequisiteRecord) => {
    setEditingId(p.id)
    setForm({
      recordType: p.record_type,
      requiredDocType: p.required_doc_type,
      requiredDocRef: p.required_doc_ref ?? '',
      isMandatory: p.is_mandatory,
      description: p.description ?? '',
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.recordType || !form.requiredDocType) return
    setSaving(true)
    try {
      if (editingId) {
        // Update
        const r = await fetch('/api/document-prerequisites', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingId,
            record_type: form.recordType,
            required_doc_type: form.requiredDocType,
            required_doc_ref: form.requiredDocRef.trim() || null,
            is_mandatory: form.isMandatory,
            description: form.description.trim() || null,
          }),
          credentials: 'include',
        })
        if (r.ok) {
          setDialogOpen(false)
          fetchPrerequisites()
        }
      } else {
        // Create
        const r = await fetch('/api/document-prerequisites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recordType: form.recordType,
            requiredDocType: form.requiredDocType,
            requiredDocRef: form.requiredDocRef.trim() || undefined,
            isMandatory: form.isMandatory,
            description: form.description.trim() || undefined,
          }),
          credentials: 'include',
        })
        if (r.ok) {
          setDialogOpen(false)
          fetchPrerequisites()
        }
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
      const r = await fetch(`/api/document-prerequisites?id=${deleteId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (r.ok) {
        setDeleteId(null)
        fetchPrerequisites()
      }
    } catch {
      // silently fail
    }
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-sm font-semibold">
            Prérequis documentaires par type d&apos;enregistrement
          </h3>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1.5 h-4 w-4" />
          Ajouter un prérequis
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : prerequisites.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Aucun prérequis documentaire défini.
        </p>
      ) : (
        <div className="space-y-6">
          {sortedGroups.map(([recordType, items]) => (
            <div key={recordType} className="space-y-2">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium">{getRecordTypeLabel(recordType)}</h4>
                <Badge variant="secondary" className="text-xs">
                  {items.length}
                </Badge>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type de document requis</TableHead>
                      <TableHead>Référence</TableHead>
                      <TableHead>Obligatoire</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-24 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">
                          {getDocTypeLabel(p.required_doc_type)}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {p.required_doc_ref || '—'}
                        </TableCell>
                        <TableCell>
                          {p.is_mandatory ? (
                            <Badge variant="outline" className="gap-1">
                              <Shield className="h-3 w-3" />
                              Oui
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              Non
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {p.description || '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEdit(p)}
                              aria-label="Modifier"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteId(p.id)}
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
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Modifier le prérequis' : 'Nouveau prérequis documentaire'}
            </DialogTitle>
            <DialogDescription>
              Définissez les documents requis avant la création d&apos;un enregistrement.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Record type */}
            <div className="grid gap-2">
              <Label>Type d&apos;enregistrement</Label>
              <Select
                value={form.recordType}
                onValueChange={(v) => setForm({ ...form, recordType: v })}
                disabled={!!editingId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner…" />
                </SelectTrigger>
                <SelectContent>
                  {RECORD_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Required document type */}
            <div className="grid gap-2">
              <Label>Type de document requis</Label>
              <Select
                value={form.requiredDocType}
                onValueChange={(v) => setForm({ ...form, requiredDocType: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner…" />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Required doc ref */}
            <div className="grid gap-2">
              <Label htmlFor="prereq-ref">Référence documentaire</Label>
              <Input
                id="prereq-ref"
                value={form.requiredDocRef}
                onChange={(e) => setForm({ ...form, requiredDocRef: e.target.value })}
                placeholder="ex: PR-4.2.4, MQ-001…"
              />
            </div>

            {/* Mandatory toggle */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label>Obligatoire</Label>
                <p className="text-xs text-muted-foreground">
                  Le document doit être présent pour créer l&apos;enregistrement
                </p>
              </div>
              <Switch
                checked={form.isMandatory}
                onCheckedChange={(checked) => setForm({ ...form, isMandatory: !!checked })}
              />
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="prereq-desc">Description</Label>
              <Textarea
                id="prereq-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Description optionnelle…"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={!form.recordType || !form.requiredDocType || saving}
            >
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
            <AlertDialogTitle>Supprimer ce prérequis ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le prérequis documentaire sera supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}