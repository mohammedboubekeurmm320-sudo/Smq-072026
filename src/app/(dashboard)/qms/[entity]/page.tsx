'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQmsEntity } from '@/hooks/useQmsQuery'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import { getEntityConfig } from '@/lib/qms-entity-map'

const STATUS_COLORS: Record<string, string> = {
  Open: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
  'Under Investigation': 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  Investigation: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  Implementation: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
  'In Progress': 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
  'Pending Disposition': 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  'Pending QA Review': 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  'Effectiveness Check': 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400',
  Closed: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
  Completed: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
  Approved: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
  Effective: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
  Released: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
  Qualified: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
  Draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  'Under Review': 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  Planned: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  Active: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
  Rejected: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
  Obsolete: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
  Archived: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
  Requested: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  'In Implementation': 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
  Mitigated: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  Conditional: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  'Under Evaluation': 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
}

export default function EntityListPage() {
  const params = useParams()
  const router = useRouter()
  const entity = params.entity as string
  const entityConfig = getEntityConfig(entity)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { items, total, page: currentPage, totalPages, isLoading, remove, isDeleting, refetch } = useQmsEntity(entity, {
    page,
    status: statusFilter !== 'ALL' ? statusFilter : undefined,
    q: search || undefined,
    sort: 'created_at',
    order: 'desc',
    limit: 20,
  })

  if (!entityConfig) return <div className="p-6">Entité non reconnue : {entity}</div>

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cet enregistrement ?')) return
    try {
      await remove(id)
    } catch (e: any) {
      alert(e.message)
    }
  }

  const statusBadge = (status: string) => (
    <Badge variant="outline" className={`text-xs ${STATUS_COLORS[status] || 'bg-slate-100 text-slate-700'}`}>
      {status}
    </Badge>
  )

  const fmtDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('fr-FR') } catch { return '-' }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <button onClick={() => router.push('/dashboard')} className="text-sm text-muted-foreground hover:text-foreground mb-1 flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Tableau de bord
          </button>
          <h1 className="text-2xl font-bold">{entityConfig.labelPlural}</h1>
          <p className="text-sm text-muted-foreground">{entityConfig.description} · {total} enregistrement(s)</p>
        </div>
        <Button onClick={() => router.push(`/qms/${entity}/new`)}>
          <Plus className="h-4 w-4 mr-2" /> Nouveau
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <input
              placeholder="Rechercher par titre..."
              value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              className="flex-1 px-3 py-2 text-sm border rounded-lg bg-background"
            />
            <select
              value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
              className="px-3 py-2 text-sm border rounded-lg bg-background"
            >
              <option value="ALL">Tous les statuts</option>
              {Object.keys(STATUS_COLORS).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}</div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">Aucun enregistrement</p>
            <Button variant="outline" onClick={() => router.push(`/qms/${entity}/new`)}>
              <Plus className="h-4 w-4 mr-2" /> Créer le premier
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3">
            {items.map((item: any) => (
              <Card key={item.id} className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/qms/${entity}/${item.id}`)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {entityConfig.numberField && item[entityConfig.numberField] && (
                          <Badge variant="outline" className="font-mono text-xs">{item[entityConfig.numberField]}</Badge>
                        )}
                        {entityConfig.statusField && item[entityConfig.statusField] && statusBadge(item[entityConfig.statusField])}
                      </div>
                      <h3 className="font-medium truncate">{item.title || item.name || '—'}</h3>
                      {item.description && <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">{item.description}</p>}
                      <p className="text-xs text-muted-foreground mt-1">{fmtDate(item.created_at || item.createdAt)}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={e => { e.stopPropagation(); handleDelete(item.id) }} disabled={isDeleting}>
                      Supprimer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} / {totalPages} ({total} éléments)
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={currentPage <= 1}
                  onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={currentPage >= totalPages}
                  onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}