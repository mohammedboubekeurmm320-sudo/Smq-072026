'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  GitBranch,
  Plus,
  Trash2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Shield,
  Loader2,
  Search,
} from 'lucide-react'
import { apiGet, apiPost } from '@/lib/api-client'
import type { TriggerType } from '@/types/qms'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DocumentTriggersPanelProps {
  documentId: string
  documentTitle?: string
  organizationId?: string
}

interface TriggerRecord {
  id: string
  source_document_id: string
  target_document_id: string
  trigger_type: TriggerType
  description: string | null
  is_mandatory: boolean
  source_document: { id: string; title: string; document_number: string; doc_type: string } | null
  target_document: { id: string; title: string; document_number: string; doc_type: string } | null
}

interface DocumentSearchResult {
  id: string
  title: string
  document_number: string
  doc_type: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TRIGGER_TYPE_CONFIG: Record<
  TriggerType,
  { label: string; description: string; color: string; outgoing: boolean }
> = {
  prerequisite: {
    label: 'Prérequis',
    description: 'Le document cible doit être approuvé avant',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    outgoing: true,
  },
  references: {
    label: 'Référence',
    description: 'Ce document fait référence au document cible',
    color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
    outgoing: false,
  },
  activates: {
    label: 'Active',
    description: 'La publication de ce document active le cible',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    outgoing: true,
  },
  output: {
    label: 'Résultat',
    description: 'Ce document est un résultat du document cible',
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    outgoing: true,
  },
  escalation: {
    label: 'Escalade',
    description: 'Ce document déclenche une action sur le cible',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    outgoing: true,
  },
}

const TRIGGER_TYPES_FOR_ADD: { value: TriggerType; label: string; description: string }[] = [
  {
    value: 'prerequisite',
    label: 'Prérequis',
    description: 'Le document cible doit être approuvé avant',
  },
  {
    value: 'references',
    label: 'Référence',
    description: 'Ce document fait référence au document cible',
  },
  {
    value: 'activates',
    label: 'Active',
    description: 'La publication de ce document active le cible',
  },
  {
    value: 'output',
    label: 'Résultat',
    description: 'Ce document est un résultat du document cible',
  },
  {
    value: 'escalation',
    label: 'Escalade',
    description: 'Ce document déclenche une action sur le cible',
  },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DocumentTriggersPanel({
  documentId,
  documentTitle,
}: DocumentTriggersPanelProps) {
  const [triggers, setTriggers] = useState<TriggerRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [cycleError, setCycleError] = useState<string | null>(null)

  // Form state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<DocumentSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)
  const [triggerType, setTriggerType] = useState<TriggerType | ''>('')
  const [isMandatory, setIsMandatory] = useState(false)
  const [description, setDescription] = useState('')

  // -----------------------------------------------------------------------
  // Fetch triggers
  // -----------------------------------------------------------------------

  const fetchTriggers = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiGet<{ items: TriggerRecord[] }>(
        `/api/document-triggers?documentId=${documentId}`,
      )
      setTriggers(data.items ?? [])
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [documentId])

  useEffect(() => {
    fetchTriggers()
  }, [fetchTriggers])

  // -----------------------------------------------------------------------
  // Document search (debounced)
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const data = await apiGet<{ items: DocumentSearchResult[] }>(
          `/api/qms/documents?title=ilike:${encodeURIComponent(searchQuery.trim())}&limit=20&select=id,title,document_number,doc_type`,
        )
        // Filter out current document
        setSearchResults((data.items ?? []).filter((d) => d.id !== documentId))
      } catch {
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, documentId])

  // -----------------------------------------------------------------------
  // Grouped triggers
  // -----------------------------------------------------------------------

  const outgoingTriggers = triggers.filter(
    (t) => t.source_document_id === documentId,
  )
  const incomingTriggers = triggers.filter(
    (t) => t.target_document_id === documentId,
  )

  // -----------------------------------------------------------------------
  // Save trigger
  // -----------------------------------------------------------------------

  const handleSave = async () => {
    if (!selectedDocId || !triggerType) return
    setSaving(true)
    setCycleError(null)

    try {
      await apiPost('/api/document-triggers', {
        sourceDocumentId: documentId,
        targetDocumentId: selectedDocId,
        triggerType,
        isMandatory,
        description: description.trim() || undefined,
      })
      setDialogOpen(false)
      resetForm()
      fetchTriggers()
    } catch (e: any) {
      const msg = e?.message ?? ''
      if (msg.toLowerCase().includes('cycle') || msg.toLowerCase().includes('boucle')) {
        setCycleError(msg)
      } else {
        setCycleError(msg || 'Erreur lors de la création du déclencheur')
      }
    } finally {
      setSaving(false)
    }
  }

  // -----------------------------------------------------------------------
  // Delete trigger
  // -----------------------------------------------------------------------

  const handleDelete = async () => {
    if (!deletingId) return
    try {
      const r = await fetch('/api/document-triggers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deletingId }),
        credentials: 'include',
      })
      if (r.ok) {
        setDeletingId(null)
        fetchTriggers()
      }
    } catch {
      // silently fail
    }
  }

  // -----------------------------------------------------------------------
  // Form helpers
  // -----------------------------------------------------------------------

  const resetForm = () => {
    setSearchQuery('')
    setSearchResults([])
    setSelectedDocId(null)
    setTriggerType('')
    setIsMandatory(false)
    setDescription('')
    setCycleError(null)
  }

  const selectedDoc = searchResults.find((d) => d.id === selectedDocId)

  // -----------------------------------------------------------------------
  // Render helpers
  // -----------------------------------------------------------------------

  const renderTriggerCard = (t: TriggerRecord, direction: 'outgoing' | 'incoming') => {
    const config = TRIGGER_TYPE_CONFIG[t.trigger_type as TriggerType]
    const relatedDoc = direction === 'outgoing' ? t.target_document : t.source_document

    return (
      <div
        key={t.id}
        className="flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-muted/50"
      >
        {/* Direction arrow */}
        {direction === 'outgoing' ? (
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ArrowLeft className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className={config?.color}>
              {config?.label ?? t.trigger_type}
            </Badge>
            {t.is_mandatory && (
              <Badge variant="outline" className="gap-1">
                <Shield className="h-3 w-3" />
                Obligatoire
              </Badge>
            )}
          </div>
          {relatedDoc ? (
            <p className="mt-1 text-sm truncate">
              {relatedDoc.document_number && (
                <span className="font-mono text-muted-foreground">
                  {relatedDoc.document_number}
                </span>
              )}
              {relatedDoc.document_number && ' — '}
              {relatedDoc.title}
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground italic">
              Document introuvable
            </p>
          )}
          {t.description && (
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
              {t.description}
            </p>
          )}
        </div>

        {/* Delete */}
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 text-muted-foreground hover:text-destructive"
          onClick={() => setDeletingId(t.id)}
          aria-label="Supprimer le déclencheur"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-sm font-semibold">
            Déclencheurs et références
          </h3>
        </div>
        <Button size="sm" onClick={() => { resetForm(); setDialogOpen(true) }}>
          <Plus className="mr-1.5 h-4 w-4" />
          Ajouter
        </Button>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : triggers.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          Aucun déclencheur défini pour ce document.
        </p>
      ) : (
        <div className="space-y-4">
          {/* Outgoing triggers */}
          {outgoingTriggers.length > 0 && (
            <Card>
              <CardHeader className="pb-3 pt-4 px-4">
                <CardTitle className="text-sm font-medium">
                  Déclencheurs sortants
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    ({outgoingTriggers.length})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0 space-y-2">
                {outgoingTriggers.map((t) => renderTriggerCard(t, 'outgoing'))}
              </CardContent>
            </Card>
          )}

          {/* Incoming triggers */}
          {incomingTriggers.length > 0 && (
            <Card>
              <CardHeader className="pb-3 pt-4 px-4">
                <CardTitle className="text-sm font-medium">
                  Déclencheurs entrants
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    ({incomingTriggers.length})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0 space-y-2">
                {incomingTriggers.map((t) => renderTriggerCard(t, 'incoming'))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Add dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Ajouter un déclencheur</DialogTitle>
            <DialogDescription>
              {documentTitle
                ? `Lier « ${documentTitle} » à un autre document.`
                : 'Lier ce document à un autre document.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Document search */}
            <div className="grid gap-2">
              <Label htmlFor="doc-search">Document cible</Label>
              {selectedDocId && selectedDoc ? (
                <div className="flex items-center gap-2 rounded-md border p-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{selectedDoc.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedDoc.document_number} — {selectedDoc.doc_type}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setSelectedDocId(null); setSearchQuery('') }}
                  >
                    Changer
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="doc-search"
                    className="pl-8"
                    placeholder="Rechercher par titre ou numéro…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searching && (
                    <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              )}

              {/* Search results dropdown */}
              {!selectedDocId && searchResults.length > 0 && (
                <div className="max-h-48 overflow-y-auto rounded-md border bg-popover">
                  {searchResults.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted/80 transition-colors border-b last:border-b-0"
                      onClick={() => {
                        setSelectedDocId(doc.id)
                        setSearchQuery('')
                      }}
                    >
                      <span className="font-mono text-xs text-muted-foreground">
                        {doc.document_number}
                      </span>
                      {' — '}
                      <span className="truncate">{doc.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Trigger type */}
            <div className="grid gap-2">
              <Label>Type de déclencheur</Label>
              <Select
                value={triggerType}
                onValueChange={(v) => setTriggerType(v as TriggerType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un type…" />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGER_TYPES_FOR_ADD.map((tt) => (
                    <SelectItem key={tt.value} value={tt.value}>
                      <span className="font-medium">{tt.label}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        — {tt.description}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Mandatory toggle */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label>Obligatoire</Label>
                <p className="text-xs text-muted-foreground">
                  Le déclencheur doit être satisfait pour la publication
                </p>
              </div>
              <Switch
                checked={isMandatory}
                onCheckedChange={(checked) => setIsMandatory(!!checked)}
              />
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="trigger-desc">Description</Label>
              <Textarea
                id="trigger-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description optionnelle du déclencheur…"
                rows={2}
              />
            </div>

            {/* Cycle error */}
            {cycleError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{cycleError}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => { resetForm(); setDialogOpen(false) }}>
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={!selectedDocId || !triggerType || saving}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce déclencheur ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le lien entre les deux documents sera supprimé.
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