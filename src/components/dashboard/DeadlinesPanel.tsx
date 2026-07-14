'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Clock, AlertTriangle, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface Deadline {
  id: string
  entityType: string
  entityId: string
  title: string
  dueDate: string
  status: string
  assigneeName?: string
  daysRemaining: number
}

interface DeadlinesPanelProps {
  deadlines: Deadline[]
  loading?: boolean
  showViewAll?: boolean
}

const ENTITY_LABELS: Record<string, string> = {
  capas: 'CAPA',
  ncrs: 'NCR',
  deviations: 'Déviation',
  'change-controls': 'Contrôle Changement',
  audits: 'Audit',
  risks: 'Risque',
  training: 'Formation',
  'batch-records': 'Lot',
  suppliers: 'Fournisseur',
  documents: 'Document',
}

export function DeadlinesPanel({ deadlines, loading, showViewAll = true }: DeadlinesPanelProps) {
  const router = useRouter()

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" /> Échéances à venir
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" /> Échéances à venir
          </CardTitle>
          {showViewAll && (
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => router.push('/deadlines')}>
              Voir tout <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {deadlines.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            Aucune échéance à venir
          </div>
        ) : (
          <div className="space-y-3">
            {deadlines.slice(0, 8).map((d) => {
              const isOverdue = d.daysRemaining < 0
              const isUrgent = d.daysRemaining >= 0 && d.daysRemaining <= 3
              const dateStr = new Date(d.dueDate).toLocaleDateString('fr-FR', {
                day: '2-digit', month: 'short',
              })

              return (
                <div
                  key={d.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => router.push(`/qms/${d.entityType}/${d.entityId}`)}
                >
                  <div className={cn(
                    'h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold',
                    isOverdue && 'bg-red-100 text-red-700',
                    !isOverdue && isUrgent && 'bg-amber-100 text-amber-700',
                    !isOverdue && !isUrgent && 'bg-blue-100 text-blue-700',
                  )}>
                    {isOverdue ? (
                      <AlertTriangle className="h-4 w-4" />
                    ) : (
                      d.daysRemaining
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{d.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary" className="text-xs px-1.5 py-0">
                        {ENTITY_LABELS[d.entityType] || d.entityType}
                      </Badge>
                      <span>{dateStr}</span>
                      {d.assigneeName && <span>· {d.assigneeName}</span>}
                    </div>
                  </div>
                  {isOverdue && (
                    <Badge variant="destructive" className="text-xs">En retard</Badge>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}