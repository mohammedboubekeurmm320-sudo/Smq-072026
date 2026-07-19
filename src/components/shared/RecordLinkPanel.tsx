'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Link2,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  Search,
  Loader2,
  Link,
} from 'lucide-react'
import { apiGet, apiPost, apiDelete } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import { RecordLinkType, RECORD_LINK_TYPES } from '@/types/qms'
import { QMS_ENTITIES, type QmsEntityConfig } from '@/lib/qms-entity-map'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RecordLinkPanelProps {
  recordId: string
  recordType: string
  recordTitle?: string
}

interface RecordLink {
  id: string
  sourceId: string
  sourceType: string
  targetId: string
  targetType: string
  linkType: RecordLinkType
  description?: string
  createdAt?: string
}

interface LinkRow {
  link: RecordLink
  direction: 'outgoing' | 'incoming'
  otherEntity: QmsEntityConfig
  otherRecord: { id: string; title: string; number?: string }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DIRECTIONAL_TYPES = new Set<string>(['caused_by', 'corrected_by', 'derived_from', 'supersedes', 'references', 'depends_on'])

const LINK_TYPE_BADGE_COLORS: Record<RecordLinkType, string> = {
  related: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  caused_by: 'bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300',
  corrected_by: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300',
  linked_to: 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300',
  derived_from: 'bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-300',
  supersedes: 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300',
  references: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/60 dark:text-cyan-300',
  depends_on: 'bg-orange-100 text-orange-700 dark:bg-orange-900/60 dark:text-orange-300',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getRecordTitle(rec: Record<string, unknown>, entity: QmsEntityConfig): string {
  // Try title field, then number field, then fall back to id
  if (rec.title) return String(rec.title)
  if (rec[entity.numberField]) return String(rec[entity.numberField])
  return rec.id ?? '—'
}

function getRecordNumber(rec: Record<string, unknown>, entity: QmsEntityConfig): string | undefined {
  if (entity.numberField && rec[entity.numberField]) return String(rec[entity.numberField])
  return undefined
}

function entityHref(slug: string, id: string): string {
  const entity = QMS_ENTITIES[slug]
  if (entity?.specializedRoute) return `${entity.specializedRoute}/${id}`
  return `/qms/${slug}/${id}`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RecordLinkPanel({ recordId, recordType, recordTitle }: RecordLinkPanelProps) {
  const [links, setLinks] = useState<LinkRow[]>([])
  const [loading, setLoading] = useState(true)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [targetEntitySlug, setTargetEntitySlug] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Record<string, unknown>[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedTargetId, setSelectedTargetId] = useState('')
  const [linkType, setLinkType] = useState<RecordLinkType | ''>('')
  const [linkDescription, setLinkDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Fetch links
  const fetchLinks = useCallback(async () => {
    setLoading(true)
    try {
      const [outgoing, incoming] = await Promise.all([
        apiGet<RecordLink[]>(`/api/record-links?sourceId=${recordId}&sourceType=${recordType}`),
        apiGet<RecordLink[]>(`/api/record-links?targetId=${recordId}&targetType=${recordType}`),
      ])

      const rows: LinkRow[] = []

      for (const link of outgoing) {
        const cfg = QMS_ENTITIES[link.targetType]
        if (!cfg) continue
        let otherRecord = { id: link.targetId, title: '', number: '' }
        try {
          const rec = await apiGet<Record<string, unknown>>(`/api/qms/${cfg.slug}/${link.targetId}`)
          otherRecord = { id: link.targetId, title: getRecordTitle(rec, cfg), number: getRecordNumber(rec, cfg) ?? '' }
        } catch { /* use fallback */ }
        rows.push({ link, direction: 'outgoing', otherEntity: cfg, otherRecord })
      }

      for (const link of incoming) {
        const cfg = QMS_ENTITIES[link.sourceType]
        if (!cfg) continue
        let otherRecord = { id: link.sourceId, title: '', number: '' }
        try {
          const rec = await apiGet<Record<string, unknown>>(`/api/qms/${cfg.slug}/${link.sourceId}`)
          otherRecord = { id: link.sourceId, title: getRecordTitle(rec, cfg), number: getRecordNumber(rec, cfg) ?? '' }
        } catch { /* use fallback */ }
        rows.push({ link, direction: 'incoming', otherEntity: cfg, otherRecord })
      }

      setLinks(rows)
    } catch (err) {
      alert('Erreur lors du chargement des liens : ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setLoading(false)
    }
  }, [recordId, recordType])

  useEffect(() => { fetchLinks() }, [fetchLinks])

  // Search target records
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query)
    if (!targetEntitySlug || query.length < 2) {
      setSearchResults([])
      return
    }
    setSearching(true)
    try {
      const data = await apiGet<{ items: Record<string, unknown>[] }>(
        `/api/qms/${targetEntitySlug}?q=${encodeURIComponent(query)}&limit=20`
      )
      setSearchResults(data.items ?? [])
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }, [targetEntitySlug])

  // Create link
  const handleCreate = async () => {
    if (!selectedTargetId || !linkType) return
    setSubmitting(true)
    try {
      await apiPost('/api/record-links', {
        sourceId: recordId,
        sourceType: recordType,
        targetId: selectedTargetId,
        targetType: targetEntitySlug,
        linkType,
        description: linkDescription || undefined,
      })
      setDialogOpen(false)
      resetDialog()
      fetchLinks()
    } catch (err) {
      alert('Erreur lors de la création du lien : ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setSubmitting(false)
    }
  }

  // Delete link
  const handleDelete = async (linkId: string) => {
    if (!confirm('Supprimer ce lien ?')) return
    try {
      await apiDelete(`/api/record-links?id=${linkId}`)
      fetchLinks()
    } catch (err) {
      alert('Erreur lors de la suppression : ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  const resetDialog = () => {
    setTargetEntitySlug('')
    setSearchQuery('')
    setSearchResults([])
    setSelectedTargetId('')
    setLinkType('')
    setLinkDescription('')
  }

  // Split links
  const outgoing = links.filter((r) => r.direction === 'outgoing')
  const incoming = links.filter((r) => r.direction === 'incoming')

  // Render single link row
  const renderLinkRow = (row: LinkRow) => {
    const { link, direction, otherEntity, otherRecord } = row
    const ltConfig = RECORD_LINK_TYPES.find((t) => t.value === link.linkType)
    const isDirectional = ltConfig?.directional ?? false
    const isBidirectional = link.linkType === 'related' || link.linkType === 'linked_to'
    const badgeColor = LINK_TYPE_BADGE_COLORS[link.linkType] ?? ''

    return (
      <Card
        key={link.id}
        className="flex items-center gap-3 px-3 py-2.5 dark:bg-card/80"
      >
        {/* Entity icon fallback */}
        <div
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-bold',
            'bg-muted text-muted-foreground dark:bg-muted/60'
          )}
        >
          {otherEntity.label.charAt(0)}
        </div>

        <div className="flex-1 min-w-0 space-y-0.5">
          <p className="text-sm font-medium truncate">
            {otherRecord.number && (
              <span className="text-muted-foreground mr-1.5">{otherRecord.number}</span>
            )}
            {otherRecord.title || otherRecord.id}
          </p>
          <p className="text-xs text-muted-foreground">{otherEntity.labelPlural}</p>
        </div>

        {/* Direction indicator */}
        <div className="flex items-center gap-1 shrink-0">
          {isBidirectional ? (
            <Link className="h-3.5 w-3.5 text-muted-foreground" />
          ) : direction === 'outgoing' ? (
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <Badge variant="secondary" className={cn('text-xs whitespace-nowrap', badgeColor)}>
            {ltConfig?.label ?? link.linkType}
          </Badge>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <a
            href={entityHref(otherEntity.slug, row.link.direction === 'outgoing' ? link.targetId : link.sourceId)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => handleDelete(link.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </Card>
    )
  }

  // Selected target entity config
  const selectedTargetEntity = targetEntitySlug ? QMS_ENTITIES[targetEntitySlug] : undefined

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Link2 className="h-4 w-4" />
          Liens entre enregistrements
        </h3>

        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetDialog() }}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" />
              Ajouter un lien
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Nouveau lien</DialogTitle>
              <DialogDescription>
                Liez {recordTitle ?? `cet enregistrement`} à un autre enregistrement QMS.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Target entity type */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Type d&apos;enregistrement cible</label>
                <Select value={targetEntitySlug} onValueChange={(v) => { setTargetEntitySlug(v); setSearchResults([]); setSelectedTargetId('') }}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sélectionner un type…" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(QMS_ENTITIES).map((entity) => (
                      <SelectItem key={entity.slug} value={entity.slug}>
                        {entity.labelPlural}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Search target */}
              {selectedTargetEntity && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Enregistrement cible</label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-8"
                      placeholder={`Rechercher un ${selectedTargetEntity.label.toLowerCase()}…`}
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                    />
                    {searching && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
                  </div>
                  {searchResults.length > 0 && (
                    <div className="max-h-40 overflow-y-auto rounded-md border">
                      {searchResults.map((rec) => {
                        const rid = String(rec.id)
                        const title = getRecordTitle(rec, selectedTargetEntity)
                        const num = getRecordNumber(rec, selectedTargetEntity)
                        return (
                          <button
                            key={rid}
                            type="button"
                            className={cn(
                              'flex w-full items-center gap-2 px-3 py-2 text-sm text-left hover:bg-accent transition-colors',
                              selectedTargetId === rid && 'bg-accent font-medium'
                            )}
                            onClick={() => { setSelectedTargetId(rid); setSearchResults([]); setSearchQuery(title) }}
                          >
                            <span className="text-muted-foreground font-mono text-xs">{num || '—'}</span>
                            <span className="truncate">{title}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Link type */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Type de lien</label>
                <Select value={linkType} onValueChange={(v) => setLinkType(v as RecordLinkType)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sélectionner un type de lien…" />
                  </SelectTrigger>
                  <SelectContent>
                    {RECORD_LINK_TYPES.map((lt) => (
                      <SelectItem key={lt.value} value={lt.value}>
                        {lt.label}
                        {lt.directional && (
                          <span className="ml-2 text-xs text-muted-foreground">(directionnel)</span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Description <span className="text-muted-foreground font-normal">(optionnel)</span></label>
                <Input
                  placeholder="Raison du lien…"
                  value={linkDescription}
                  onChange={(e) => setLinkDescription(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button
                onClick={handleCreate}
                disabled={!selectedTargetId || !linkType || submitting}
              >
                {submitting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Créer le lien
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Content */}
      {loading ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Chargement…</p>
      ) : links.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <Link2 className="h-8 w-8 mb-2 opacity-40" />
          <p className="text-sm">Aucun lien établi</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Outgoing */}
          {outgoing.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Enregistrements liés sortants
              </p>
              <div className="space-y-1.5">{outgoing.map(renderLinkRow)}</div>
            </div>
          )}

          {outgoing.length > 0 && incoming.length > 0 && <Separator />}

          {/* Incoming */}
          {incoming.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Enregistrements liés entrants
              </p>
              <div className="space-y-1.5">{incoming.map(renderLinkRow)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}