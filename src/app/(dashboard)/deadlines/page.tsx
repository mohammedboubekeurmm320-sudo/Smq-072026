'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Clock, AlertTriangle, Search, Calendar } from 'lucide-react'
import { useDeadlines } from '@/hooks/useQmsQuery'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

const ENTITY_LABELS: Record<string, string> = {
  capas: 'CAPA', ncrs: 'NCR', deviations: 'Déviation',
  'change-controls': 'Contrôle Changement', audits: 'Audit',
  risks: 'Risque', training: 'Formation', 'batch-records': 'Lot',
  suppliers: 'Fournisseur', documents: 'Document',
}

export default function DeadlinesPage() {
  const router = useRouter()
  const [days, setDays] = useState(30)
  const [search, setSearch] = useState('')
  const [entityFilter, setEntityFilter] = useState('ALL')

  const { data: deadlinesData, isLoading } = useDeadlines(days)
  const deadlines = deadlinesData?.data || deadlinesData || []

  const filtered = deadlines
    .filter((d: any) => entityFilter === 'ALL' || d.entityType === entityFilter)
    .filter((d: any) => !search || (d.title || '').toLowerCase().includes(search.toLowerCase()))

  const overdue = filtered.filter((d: any) => (d.daysRemaining ?? 0) < 0)
  const urgent = filtered.filter((d: any) => { const r = d.daysRemaining ?? 99; return r >= 0 && r <= 7 })
  const upcoming = filtered.filter((d: any) => { const r = d.daysRemaining ?? 99; return r > 7 })

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

  const DeadlineRow = ({ d }: { d: any }) => {
    const isOverdue = (d.daysRemaining ?? 0) < 0
    const isUrgent = !isOverdue && (d.daysRemaining ?? 99) <= 7
    const daysLabel = isOverdue
      ? `${Math.abs(d.daysRemaining)}j de retard`
      : d.daysRemaining === 0 ? "Aujourd'hui" : `Dans ${d.daysRemaining}j`

    return (
      <Card
        className="hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => d.entityType && d.entityId && router.push(`/qms/${d.entityType}/${d.entityId}`)}
      >
        <CardContent className="p-4 flex items-center gap-4">
          <div className={cn(
            'h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold',
            isOverdue && 'bg-red-100 text-red-700',
            !isOverdue && isUrgent && 'bg-amber-100 text-amber-700',
            !isOverdue && !isUrgent && 'bg-blue-100 text-blue-700',
          )}>
            {isOverdue ? <AlertTriangle className="h-5 w-5" /> : d.daysRemaining}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium truncate">{d.title || 'Sans titre'}</h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <Badge variant="secondary" className="text-xs">{ENTITY_LABELS[d.entityType] || d.entityType}</Badge>
              <span>{fmtDate(d.dueDate)}</span>
              {d.assigneeName && <span>· {d.assigneeName}</span>}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <Badge
              variant={isOverdue ? 'destructive' : isUrgent ? 'outline' : 'secondary'}
              className={cn(isUrgent && !isOverdue && 'border-amber-300 text-amber-700')}
            >
              {daysLabel}
            </Badge>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6" /> Échéances
          </h1>
          <p className="text-sm text-muted-foreground">Suivi des délais des enregistrements QMS</p>
        </div>
        <div className="flex gap-2">
          {[14, 30, 60, 90].map(d => (
            <Button key={d} variant={days === d ? 'default' : 'outline'} size="sm" onClick={() => setDays(d)}>{d}j</Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-red-600">{overdue.length}</p>
            <p className="text-sm text-red-700">En retard</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-amber-600">{urgent.length}</p>
            <p className="text-sm text-amber-700">Urgent (&lt; 7j)</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">{upcoming.length}</p>
            <p className="text-sm text-blue-700">À venir</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
            </div>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-full md:w-48"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les types</SelectItem>
                {Object.entries(ENTITY_LABELS).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-lg font-medium">Aucune échéance</p>
            <p className="text-sm mt-1">Aucune échéance dans les {days} prochains jours</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {overdue.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-red-600 mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> En retard ({overdue.length})
              </h2>
              <div className="space-y-2">{overdue.map((d: any) => <DeadlineRow key={d.id} d={d} />)}</div>
            </div>
          )}
          {urgent.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-amber-600 mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4" /> Urgent — 7 jours ou moins ({urgent.length})
              </h2>
              <div className="space-y-2">{urgent.map((d: any) => <DeadlineRow key={d.id} d={d} />)}</div>
            </div>
          )}
          {upcoming.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-blue-600 mb-2 flex items-center gap-2">
                <Calendar className="h-4 w-4" /> À venir ({upcoming.length})
              </h2>
              <div className="space-y-2">{upcoming.map((d: any) => <DeadlineRow key={d.id} d={d} />)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}