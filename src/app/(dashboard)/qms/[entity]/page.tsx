'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQmsEntity } from '@/hooks/useQmsQuery'
import { useAuth } from '@/contexts/AuthContext'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, ArrowLeft } from 'lucide-react'
import { getEntityConfig } from '@/lib/qms-entity-map'

const STATUS_COLORS: Record<string, string> = {
  Open: 'bg-red-100 text-red-700', 'Under Investigation': 'bg-amber-100 text-amber-700',
  Investigation: 'bg-amber-100 text-amber-700', Implementation: 'bg-blue-100 text-blue-700',
  'In Progress': 'bg-blue-100 text-blue-700', 'Pending Disposition': 'bg-amber-100 text-amber-700',
  'Pending QA Review': 'bg-amber-100 text-amber-700', 'Effectiveness Check': 'bg-violet-100 text-violet-700',
  Closed: 'bg-green-100 text-green-700', Completed: 'bg-green-100 text-green-700',
  Approved: 'bg-green-100 text-green-700', Effective: 'bg-green-100 text-green-700',
  Released: 'bg-green-100 text-green-700', Qualified: 'bg-green-100 text-green-700',
  Draft: 'bg-slate-100 text-slate-700', 'Under Review': 'bg-amber-100 text-amber-700',
  Planned: 'bg-slate-100 text-slate-700', Active: 'bg-blue-100 text-blue-700',
  Rejected: 'bg-red-100 text-red-700', Obsolete: 'bg-red-100 text-red-700',
}

export default function EntityListPage() {
  const params = useParams()
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const entity = params.entity as string
  const entityConfig = getEntityConfig(entity)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [search, setSearch] = useState('')

  const { items, total, isLoading, remove, isDeleting, refetch } = useQmsEntity(entity, {
    status: statusFilter !== 'ALL' ? statusFilter : undefined,
    q: search || undefined,
    sort: 'createdAt',
    order: 'desc',
    limit: 20,
  })

  if (!entityConfig) return <div className="p-6">Entité non reconnue : {entity}</div>

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cet enregistrement ?')) return
    await remove(id)
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
      <div className="flex items-center justify-between">
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
              placeholder="Rechercher..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border rounded-lg bg-background"
            />
            <select
              value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
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
          <CardContent className="py-12 text-center text-muted-foreground">Aucun enregistrement</CardContent>
        </Card>
      ) : (
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
                    <p className="text-xs text-muted-foreground mt-1">{fmtDate(item.createdAt)}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); handleDelete(item.id) }} disabled={isDeleting}>
                    Supprimer
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}