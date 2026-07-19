'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { CheckCircle2, Clock, AlertTriangle, BookOpen } from 'lucide-react'

interface TrainingModule {
  id: string
  title: string
  description?: string
  duration_hours: number
  category: string
  required_for_roles: string[]
  prerequisite_ids: string[]
  status: string
}

interface TrainingRecord {
  module_id: string
  status: string // completed, in_progress, expired, not_started
  completed_at?: string
  score?: number
  expiry_date?: string
}

interface TrainingCurriculumProps {
  modules: TrainingModule[]
  records?: TrainingRecord[]
  view?: 'matrix' | 'list'
  className?: string
}

const CATEGORY_LABELS: Record<string, string> = {
  gmp: 'BPF (Bonnes Pratiques)',
  quality: 'Qualité',
  safety: 'Sécurité',
  regulatory: 'Réglementaire',
  technical: 'Technique',
  ivdr: 'IVDR/MDR',
  process: 'Processus',
}

function recordStatus(rec?: TrainingRecord): string {
  if (!rec) return 'not_started'
  return rec.status
}

function statusIcon(status: string) {
  switch (status) {
    case 'completed': return <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
    case 'in_progress': return <Clock className="w-3.5 h-3.5 text-blue-600" />
    case 'expired': return <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
    default: return <div className="w-3.5 h-3.5 rounded-full border-2 border-muted-foreground/30" />
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'completed': return 'Complété'
    case 'in_progress': return 'En cours'
    case 'expired': return 'Expiré'
    default: return 'Non commencé'
  }
}

function statusBg(status: string): string {
  switch (status) {
    case 'completed': return 'bg-green-100 dark:bg-green-950'
    case 'in_progress': return 'bg-blue-100 dark:bg-blue-950'
    case 'expired': return 'bg-amber-100 dark:bg-amber-950'
    default: return 'bg-muted'
  }
}

export function TrainingCurriculum({
  modules,
  records = [],
  view = 'list',
  className = '',
}: TrainingCurriculumProps) {
  const recMap = new Map(records.map(r => [r.module_id, r]))
  const completedCount = modules.filter(m => recordStatus(recMap.get(m.id)) === 'completed').length
  const expiredCount = modules.filter(m => recordStatus(recMap.get(m.id)) === 'expired').length
  const totalHours = modules.reduce((s, m) => s + (m.duration_hours || 0), 0)
  const completedHours = modules
    .filter(m => recordStatus(recMap.get(m.id)) === 'completed')
    .reduce((s, m) => s + (m.duration_hours || 0), 0)

  return (
    <div className={className}>
      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center p-2 bg-muted/50 rounded-lg">
          <p className="text-lg font-bold">{completedCount}/{modules.length}</p>
          <p className="text-[10px] text-muted-foreground">Modules complétés</p>
        </div>
        <div className="text-center p-2 bg-muted/50 rounded-lg">
          <p className="text-lg font-bold">{completedHours}h</p>
          <p className="text-[10px] text-muted-foreground">sur {totalHours}h requis</p>
        </div>
        <div className="text-center p-2 bg-amber-50 dark:bg-amber-950 rounded-lg">
          <p className="text-lg font-bold text-amber-700 dark:text-amber-400">{expiredCount}</p>
          <p className="text-[10px] text-amber-600 dark:text-amber-500">Expirés</p>
        </div>
      </div>

      <Progress value={modules.length > 0 ? (completedCount / modules.length) * 100 : 0} className="h-1.5 mb-4" />

      {/* Module list */}
      <div className="space-y-2">
        {modules.map(mod => {
          const rec = recMap.get(mod.id)
          const st = recordStatus(rec)

          return (
            <div key={mod.id} className={`p-3 border rounded-lg ${statusBg(st)}`}>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">
                  {statusIcon(st)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{mod.title}</span>
                    <Badge variant="outline" className="text-[9px]">
                      {CATEGORY_LABELS[mod.category] || mod.category}
                    </Badge>
                    <Badge variant="outline" className="text-[9px]">
                      <BookOpen className="w-2.5 h-2.5 mr-0.5" />
                      {mod.duration_hours}h
                    </Badge>
                  </div>

                  {mod.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {mod.description}
                    </p>
                  )}

                  {/* Required for roles */}
                  {mod.required_for_roles && mod.required_for_roles.length > 0 && (
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {mod.required_for_roles.map(role => (
                        <Badge key={role} variant="secondary" className="text-[9px]">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Training record info */}
                  {rec && (
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                      {rec.completed_at && (
                        <span>Complété le {new Date(rec.completed_at).toLocaleDateString('fr-FR')}</span>
                      )}
                      {rec.score !== undefined && rec.score !== null && (
                        <span>Score : {rec.score}%</span>
                      )}
                      {rec.expiry_date && (
                        <span className={st === 'expired' ? 'text-amber-600 font-medium' : ''}>
                          Expire le {new Date(rec.expiry_date).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}