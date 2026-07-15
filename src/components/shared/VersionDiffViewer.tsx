'use client'

import { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronRight, Plus, Minus, Equal } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VersionDiffViewerProps {
  oldVersion: Record<string, unknown>
  newVersion: Record<string, unknown>
  fieldLabels?: Record<string, string>
}

type DiffKind = 'added' | 'removed' | 'changed' | 'unchanged'

interface DiffEntry {
  key: string
  kind: DiffKind
  oldValue: unknown
  newValue: unknown
  label: string
}

function simpleLCS(a: string[], b: string[]): Set<string> {
  // Simple set intersection to find common keys (good enough for flat objects)
  const setA = new Set(a)
  const bSet = new Set(b)
  setA.forEach((k) => {
    if (!bSet.has(k)) setA.delete(k)
  })
  return setA
}

function computeDiff(
  oldV: Record<string, unknown>,
  newV: Record<string, unknown>,
  labels: Record<string, string>
): DiffEntry[] {
  const oldKeys = Object.keys(oldV)
  const newKeys = Object.keys(newV)
  const common = simpleLCS(oldKeys, newKeys)

  const entries: DiffEntry[] = []

  // Process common keys in order of newKeys, then remaining old keys
  const processed = new Set<string>()

  // Added keys
  for (const key of newKeys) {
    if (!oldV.hasOwnProperty(key)) {
      entries.push({
        key,
        kind: 'added',
        oldValue: undefined,
        newValue: newV[key],
        label: labels[key] ?? key,
      })
      processed.add(key)
    }
  }

  // Removed keys
  for (const key of oldKeys) {
    if (!newV.hasOwnProperty(key)) {
      entries.push({
        key,
        kind: 'removed',
        oldValue: oldV[key],
        newValue: undefined,
        label: labels[key] ?? key,
      })
      processed.add(key)
    }
  }

  // Common keys
  for (const key of common) {
    const oldVal = oldV[key]
    const newVal = newV[key]
    const kind: DiffKind =
      JSON.stringify(oldVal) === JSON.stringify(newVal) ? 'unchanged' : 'changed'
    entries.push({
      key,
      kind,
      oldValue: oldVal,
      newValue: newVal,
      label: labels[key] ?? key,
    })
    processed.add(key)
  }

  return entries
}

function formatValue(val: unknown): string {
  if (val === undefined || val === null) return '—'
  if (typeof val === 'boolean') return val ? 'Oui' : 'Non'
  if (typeof val === 'object') return JSON.stringify(val, null, 2)
  return String(val)
}

export function VersionDiffViewer({
  oldVersion,
  newVersion,
  fieldLabels = {},
}: VersionDiffViewerProps) {
  const [showUnchanged, setShowUnchanged] = useState(false)

  const diffs = useMemo(
    () => computeDiff(oldVersion, newVersion, fieldLabels),
    [oldVersion, newVersion, fieldLabels]
  )

  const changedEntries = diffs.filter((d) => d.kind !== 'unchanged')
  const unchangedEntries = diffs.filter((d) => d.kind === 'unchanged')

  const kindConfig: Record<DiffKind, { bg: string; border: string; badge: string; icon: typeof Equal }> = {
    added: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-l-emerald-500', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300', icon: Plus },
    removed: { bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-l-red-500', badge: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300', icon: Minus },
    changed: { bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-l-amber-500', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300', icon: Equal },
    unchanged: { bg: '', border: 'border-l-transparent', badge: 'bg-muted text-muted-foreground', icon: Equal },
  }

  const kindLabel: Record<DiffKind, string> = {
    added: 'Ajouté',
    removed: 'Supprimé',
    changed: 'Modifié',
    unchanged: 'Inchangé',
  }

  return (
    <div className="space-y-4">
      {/* Summary badges */}
      <div className="flex flex-wrap items-center gap-2">
        {changedEntries.length > 0 && (
          <Badge variant="outline" className="gap-1">
            {changedEntries.length} modification{changedEntries.length > 1 ? 's' : ''}
          </Badge>
        )}
        {unchangedEntries.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7"
            onClick={() => setShowUnchanged(!showUnchanged)}
          >
            {showUnchanged ? (
              <ChevronDown className="mr-1 h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="mr-1 h-3.5 w-3.5" />
            )}
            {unchangedEntries.length} champ{unchangedEntries.length > 1 ? 's' : ''} inchangé{unchangedEntries.length > 1 ? 's' : ''}
          </Button>
        )}
      </div>

      {/* Diff entries */}
      <div className="space-y-2">
        {changedEntries.map((entry) => {
          const config = kindConfig[entry.kind]
          const Icon = config.icon
          return (
            <div
              key={entry.key}
              className={cn(
                'rounded-md border-l-4 p-3',
                config.bg,
                config.border
              )}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-sm font-medium">{entry.label}</span>
                <Badge variant="secondary" className={cn('text-xs gap-1', config.badge)}>
                  <Icon className="h-3 w-3" />
                  {kindLabel[entry.kind]}
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Ancienne valeur</p>
                  <pre className="text-xs bg-background/50 rounded p-2 whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
                    {formatValue(entry.oldValue)}
                  </pre>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Nouvelle valeur</p>
                  <pre className="text-xs bg-background/50 rounded p-2 whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
                    {formatValue(entry.newValue)}
                  </pre>
                </div>
              </div>
            </div>
          )
        })}

        {/* Collapsible unchanged entries */}
        {showUnchanged && unchangedEntries.length > 0 && (
          <div className="space-y-1.5 pt-2">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider px-1">
              Champs inchangés
            </p>
            {unchangedEntries.map((entry) => (
              <div
                key={entry.key}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <span className="text-sm">{entry.label}</span>
                <span className="text-xs text-muted-foreground font-mono max-w-[200px] truncate">
                  {formatValue(entry.newValue)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}