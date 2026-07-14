'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, FileText, Shield, AlertTriangle, AlertOctagon, ArrowLeftRight, ClipboardCheck, BarChart3, GraduationCap, Package, Truck } from 'lucide-react'
import { apiGet } from '@/lib/api-client'
import { QMS_ENTITIES, getEntityConfig } from '@/lib/qms-entity-map'

const MODULE_ICONS: Record<string, any> = {
  capas: Shield, ncrs: AlertTriangle, deviations: AlertOctagon,
  'change-controls': ArrowLeftRight, audits: ClipboardCheck, risks: BarChart3,
  training: GraduationCap, 'batch-records': Package, suppliers: Truck,
  documents: FileText,
}

const SEARCHABLE_ENTITIES = ['capas', 'ncrs', 'deviations', 'change-controls', 'audits', 'risks', 'training', 'batch-records', 'suppliers', 'documents']

interface SearchResult {
  id: string
  entitySlug: string
  title: string
  subtitle: string
  number: string
  status: string
}

interface Props {
  open: boolean
  onClose: () => void
}

export function GlobalSearch({ open, onClose }: Props) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      setQuery('')
      setResults([])
    }
  }, [open])

  // Debounced search across all entities
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!open) return
    if (query.length < 2) {
      setResults([])
      return
    }

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    setIsSearching(true)

    searchTimerRef.current = setTimeout(async () => {
      try {
        const q = query.toLowerCase()
        const allResults: SearchResult[] = []

        // Fetch from all searchable entities in parallel
        const promises = SEARCHABLE_ENTITIES.map(async (slug) => {
          try {
            const res = await apiGet<{ items: any[]; count: number }>(
              `/api/qms/${slug}?title=ilike:${encodeURIComponent(q)}&limit=5&sort=created_at&order=desc`
            )
            const items = res.items || []
            const cfg = getEntityConfig(slug)
            if (!cfg) return

            return items.map(item => ({
              id: item.id,
              entitySlug: slug,
              title: item.title || item.name || '—',
              subtitle: [
                item.capa_type || item.ncr_type || item.deviation_type || item.audit_type || item.training_type || item.category || item.supplier_type || item.doc_type || '',
                item.priority || item.severity || '',
              ].filter(Boolean).join(' · ') || cfg.label,
              number: item[cfg.numberField] || '',
              status: item.status || '',
            }))
          } catch { return [] }
        })

        const settled = await Promise.all(promises)
        for (const group of settled) {
          if (group) allResults.push(...group)
        }

        setResults(allResults.slice(0, 50))
      } catch {
        setResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [query, open])

  const handleSelect = useCallback((result: SearchResult) => {
    router.push(`/qms/${result.entitySlug}/${result.id}`)
    onClose()
  }, [router, onClose])

  // Group results by entity
  const grouped = useMemo(() => {
    const map = new Map<string, SearchResult[]>()
    for (const r of results) {
      const existing = map.get(r.entitySlug) || []
      existing.push(r)
      map.set(r.entitySlug, existing)
    }
    return map
  }, [results])

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Search className="h-4 w-4" /> Recherche globale
          </DialogTitle>
        </DialogHeader>
        <div className="px-4 pb-2">
          <Input
            ref={inputRef}
            placeholder="Rechercher dans tous les modules…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="text-base border-0 focus-visible:ring-0 px-0 shadow-none"
          />
        </div>
        <div className="max-h-80 overflow-y-auto px-2 pb-4">
          {query.length < 2 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Saisissez au moins 2 caractères pour rechercher
            </p>
          ) : isSearching ? (
            <div className="space-y-2 px-2 py-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : results.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Aucun résultat pour &quot;{query}&quot;
            </p>
          ) : (
            <div className="space-y-3">
              {Array.from(grouped.entries()).map(([slug, items]) => {
                const cfg = getEntityConfig(slug)
                const Icon = MODULE_ICONS[slug] || FileText
                return (
                  <div key={slug}>
                    <div className="flex items-center gap-2 px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <Icon className="h-3 w-3" />
                      {cfg?.labelPlural || slug}
                      <Badge variant="secondary" className="text-xs font-normal">{items.length}</Badge>
                    </div>
                    {items.map(item => (
                      <button
                        key={`${item.entitySlug}-${item.id}`}
                        onClick={() => handleSelect(item)}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted rounded-lg text-left transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{item.title}</div>
                          <div className="text-xs text-muted-foreground truncate">{item.subtitle}</div>
                        </div>
                        {item.number && (
                          <Badge variant="outline" className="font-mono text-xs shrink-0">{item.number}</Badge>
                        )}
                        {item.status && (
                          <Badge variant="secondary" className="text-xs shrink-0">{item.status}</Badge>
                        )}
                      </button>
                    ))}
                  </div>
                )
              })}
              {results.length >= 50 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  50 résultats affichés (limité)
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}