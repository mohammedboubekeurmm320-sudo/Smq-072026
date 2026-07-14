'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'
import {
  ShieldCheck, AlertTriangle, AlertOctagon, ArrowLeftRight,
  FileText, BarChart3, GraduationCap, Clock,
} from 'lucide-react'

interface KpiData {
  label: string
  value: number
  subtitle?: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
}

interface KpiCardProps {
  data: KpiData
  icon: LucideIcon
  color: string
  onClick?: () => void
  loading?: boolean
}

function KpiCard({ data, icon: Icon, color, onClick, loading }: KpiCardProps) {
  if (loading) {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-7 w-12" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const [textColor, bgColor] = color.split(' ')

  return (
    <Card
      className={cn('hover:shadow-md transition-shadow', onClick && 'cursor-pointer')}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground truncate">{data.label}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold">{data.value}</span>
              {data.trend && data.trendValue && (
                <span className={cn(
                  'text-xs font-medium',
                  data.trend === 'up' && 'text-green-600',
                  data.trend === 'down' && 'text-red-600',
                  data.trend === 'neutral' && 'text-muted-foreground',
                )}>
                  {data.trend === 'up' ? '↑' : data.trend === 'down' ? '↓' : '→'} {data.trendValue}
                </span>
              )}
            </div>
            {data.subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{data.subtitle}</p>
            )}
          </div>
          <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0', bgColor)}>
            <Icon className={cn('h-5 w-5', textColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface KpiDefinition {
  key: string
  label: string
  subtitleKey?: string
  icon: LucideIcon
  color: string
  navigateTo?: string
}

export const QMS_KPI_DEFINITIONS: KpiDefinition[] = [
  { key: 'openCapas', label: 'CAPAs ouvertes', subtitleKey: 'overdueCapas', icon: ShieldCheck, color: 'text-violet-600 bg-violet-50', navigateTo: 'capas' },
  { key: 'openNcrs', label: 'NCRs ouvertes', subtitleKey: 'criticalNcrs', icon: AlertTriangle, color: 'text-amber-600 bg-amber-50', navigateTo: 'ncrs' },
  { key: 'openDeviations', label: 'Déviations', icon: AlertOctagon, color: 'text-rose-600 bg-rose-50', navigateTo: 'deviations' },
  { key: 'openChangeControls', label: 'Contrôles Changement', icon: ArrowLeftRight, color: 'text-cyan-600 bg-cyan-50', navigateTo: 'change-controls' },
  { key: 'approvedDocs', label: 'Documents approuvés', subtitleKey: 'inReviewDocs', icon: FileText, color: 'text-sky-600 bg-sky-50', navigateTo: 'documents' },
  { key: 'activeRisks', label: 'Risques actifs', icon: BarChart3, color: 'text-orange-600 bg-orange-50', navigateTo: 'risks' },
  { key: 'overdueTraining', label: 'Formations en retard', icon: GraduationCap, color: 'text-indigo-600 bg-indigo-50', navigateTo: 'training' },
  { key: 'upcomingDeadlines', label: 'Échéances proches', icon: Clock, color: 'text-red-600 bg-red-50', navigateTo: 'deadlines' },
]

export function KpiGrid({ kpisData, onNavigate }: { kpisData: Record<string, any>; onNavigate?: (slug: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {QMS_KPI_DEFINITIONS.map(def => {
        const value = kpisData?.[def.key] ?? 0
        const subtitle = def.subtitleKey && kpisData?.[def.subtitleKey]
          ? `${kpisData[def.subtitleKey]} ${def.key === 'openCapas' ? 'en retard' : def.key === 'openNcrs' ? 'critiques' : ''}`
          : undefined

        return (
          <KpiCard
            key={def.key}
            data={{ label: def.label, value, subtitle }}
            icon={def.icon}
            color={def.color}
            onClick={def.navigateTo && onNavigate ? () => onNavigate(def.navigateTo) : undefined}
          />
        )
      })}
    </div>
  )
}

export { KpiCard }