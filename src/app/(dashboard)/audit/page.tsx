'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { History, Search, Filter, ArrowRight, User, Clock } from 'lucide-react'
import { useAuditTrail } from '@/hooks/useQmsQuery'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

const ENTITY_OPTIONS = [
  { value: '', label: 'Toutes les entités' },
  { value: 'capas', label: 'CAPAs' },
  { value: 'ncrs', label: 'Non-Conformités' },
  { value: 'deviations', label: 'Déviations' },
  { value: 'change-controls', label: 'Contrôles Changement' },
  { value: 'risks', label: 'Risques' },
  { value: 'audits', label: 'Audits' },
  { value: 'documents', label: 'Documents' },
  { value: 'training', label: 'Formations' },
  { value: 'suppliers', label: 'Fournisseurs' },
]

const ACTION_COLORS: Record<string, string> = {
  INSERT: 'bg-green-100 text-green-700 border-green-200',
  UPDATE: 'bg-blue-100 text-blue-700 border-blue-200',
  DELETE: 'bg-red-100 text-red-700 border-red-200',
  STATUS_CHANGE: 'bg-violet-100 text-violet-700 border-violet-200',
}

export default function AuditPage() {
  const router = useRouter()
  const [entity, setEntity] = useState('')
  const [search, setSearch] = useState('')
  const [limit] = useState(50)

  const { data: auditData, isLoading } = useAuditTrail({
    entity: entity || undefined,
    limit,
  })

  const entries = auditData?.data || auditData || []

  const filtered = search
    ? entries.filter((e: any) =>
        [e.action, e.tableName, e.userName, e.recordTitle, e.oldValues, e.newValues]
          .some((v: any) => v && String(v).toLowerCase().includes(search.toLowerCase()))
      )
    : entries

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  const formatChanges = (oldVal: any, newVal: any) => {
    try {
      const oldObj = typeof oldVal === 'string' ? JSON.parse(oldVal) : oldVal
      const newObj = typeof newVal === 'string' ? JSON.parse(newVal) : newVal
      if (!oldObj || !newObj) return null
      const keys = Object.keys(newObj)
      return keys.slice(0, 3).map(k => (
        <span key={k} className="inline-block">
          <Badge variant="outline" className="text-xs font-mono mr-1">{k}</Badge>
          <span className="text-red-600 line-through text-xs mr-1">{String(oldObj[k] ?? '').slice(0, 20)}</span>
          <ArrowRight className="h-3 w-3 inline text-muted-foreground" />
          <span className="text-green-600 text-xs">{String(newObj[k] ?? '').slice(0, 20)}</span>
        </span>
      ))
    } catch { return null }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <History className="h-6 w-6" /> Piste d&apos;audit
        </h1>
        <p className="text-sm text-muted-foreground">
          Historique de toutes les modifications sur les enregistrements QMS
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher dans l'historique..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={entity} onValueChange={v => setEntity(v)}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filtrer par entité" />
              </SelectTrigger>
              <SelectContent>
                {ENTITY_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Audit entries */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <Card key={i}>
              <CardContent className="p-4 flex items-center gap-4">
                <Skeleton className="h-8 w-20 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-lg font-medium">Aucune entrée d&apos;audit</p>
            <p className="text-sm mt-1">Les modifications apparaîtront ici automatiquement</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((entry: any, idx: number) => {
            const actionColor = ACTION_COLORS[entry.action] || 'bg-slate-100 text-slate-700 border-slate-200'

            return (
              <Card key={entry.id || idx} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Badge variant="outline" className={cn('text-xs font-mono flex-shrink-0 mt-0.5', actionColor)}>
                      {entry.action || 'UPDATE'}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {entry.tableName && (
                          <Badge variant="secondary" className="text-xs">{entry.tableName}</Badge>
                        )}
                        {entry.recordTitle && (
                          <span className="text-sm font-medium truncate">{entry.recordTitle}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" /> {entry.userName || entry.profileName || 'Système'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {fmtDate(entry.createdAt || entry.timestamp)}
                        </span>
                      </div>
                      {(entry.action === 'UPDATE' || entry.action === 'STATUS_CHANGE') && entry.oldValues && entry.newValues && (
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                          {formatChanges(entry.oldValues, entry.newValues)}
                        </div>
                      )}
                    </div>
                    {entry.entityType && entry.recordId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs flex-shrink-0"
                        onClick={() => router.push(`/qms/${entry.entityType}/${entry.recordId}`)}
                      >
                        Voir
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}