'use client'

import { useState } from 'react'
import { CheckCircle2, ArrowDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'

export interface Discipline {
  discipline: number
  title: string
  description: string
  status: string
  assigned_to?: string
  completed_at?: string
  notes?: string
  fiveWhys?: string[]
}

const DEFAULT_DISCIPLINES: Discipline[] = [
  { discipline: 1, title: 'Équipe de résolution', description: "Former l'équipe multidisciplinaire", status: 'Not Started' },
  { discipline: 2, title: 'Décrire le problème', description: 'Décrire la non-conformité en détail (5W2H)', status: 'Not Started' },
  { discipline: 3, title: 'Actions de confinement', description: "Actions immédiates pour contenir le problème", status: 'Not Started' },
  { discipline: 4, title: 'Cause racine', description: 'Analyse de cause racine (5 Pourquoi, Ishikawa)', status: 'Not Started' },
  { discipline: 5, title: 'Actions correctives', description: "Plan d'actions correctives permanentes", status: 'Not Started' },
  { discipline: 6, title: 'Valider les actions', description: "Vérifier l'efficacité des actions correctives", status: 'Not Started' },
  { discipline: 7, title: 'Prévention', description: "Actions préventives pour éviter la récurrence", status: 'Not Started' },
  { discipline: 8, title: 'Clôture', description: "Clôture et reconnaissance de l'équipe", status: 'Not Started' },
]

const DISC_COLORS = [
  'bg-violet-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-orange-500',
  'bg-teal-500',
  'bg-sky-500',
  'bg-emerald-500',
  'bg-pink-500',
]

interface EightDPanelProps {
  ncrId: string
  disciplines?: Discipline[]
  onUpdate?: (disciplineNumber: number, data: { notes: string; status: string; fiveWhys?: string[] }) => void
  disabled?: boolean
  className?: string
}

function dStatusColor(status: string): string {
  const s = (status || '').toLowerCase()
  if (s === 'completed') return 'bg-green-100 text-green-700 border-green-300 dark:bg-green-950 dark:text-green-400 dark:border-green-800'
  if (s === 'in_progress' || s === 'in progress') return 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800'
  if (s === 'blocked') return 'bg-red-100 text-red-700 border-red-300 dark:bg-red-950 dark:text-red-400 dark:border-red-800'
  return 'bg-muted text-muted-foreground border-border'
}

function dStatusLabel(status: string): string {
  const s = (status || '').toLowerCase()
  if (s === 'completed') return 'Terminé'
  if (s === 'in_progress' || s === 'in progress') return 'En cours'
  if (s === 'blocked') return 'Bloqué'
  return 'Non démarré'
}

export function EightDPanel({
  ncrId,
  disciplines: externalDisciplines,
  onUpdate,
  disabled = false,
  className = '',
}: EightDPanelProps) {
  const [localDiscs, setLocalDiscs] = useState<Discipline[]>(
    externalDisciplines && externalDisciplines.length > 0
      ? externalDisciplines
      : DEFAULT_DISCIPLINES
  )
  const [whyFields, setWhyFields] = useState<string[]>(
    externalDisciplines?.find(d => d.discipline === 4)?.fiveWhys || ['', '', '', '', '']
  )

  const discs = externalDisciplines && externalDisciplines.length > 0 ? externalDisciplines : localDiscs
  const completedCount = discs.filter(d => (d.status || '').toLowerCase() === 'completed').length
  const allDone = completedCount === 8

  const handleStatusChange = (discNum: number, newStatus: string) => {
    const updated = discs.map(d =>
      d.discipline === discNum ? { ...d, status: newStatus } : d
    )
    setLocalDiscs(updated)
    const disc = updated.find(d => d.discipline === discNum)
    if (disc && onUpdate) {
      onUpdate(discNum, { notes: disc.notes || '', status: newStatus, fiveWhys: discNum === 4 ? whyFields : undefined })
    }
  }

  const handleNotesChange = (discNum: number, notes: string) => {
    const updated = discs.map(d =>
      d.discipline === discNum ? { ...d, notes } : d
    )
    setLocalDiscs(updated)
    if (onUpdate) {
      onUpdate(discNum, { notes, status: updated.find(d => d.discipline === discNum)?.status || 'Not Started' })
    }
  }

  const handleWhyChange = (idx: number, val: string) => {
    const next = [...whyFields]
    next[idx] = val
    setWhyFields(next)
  }

  const saveWhys = () => {
    if (onUpdate) {
      const d4 = discs.find(d => d.discipline === 4)
      onUpdate(4, { notes: d4?.notes || '', status: d4?.status || 'Not Started', fiveWhys: whyFields })
    }
  }

  return (
    <div className={className}>
      {/* Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Progression 8D
          </span>
          <span className="text-xs font-bold">
            {completedCount}/8 disciplines complétées
          </span>
        </div>
        <Progress value={(completedCount / 8) * 100} className="h-2" />
        {allDone && (
          <div className="mt-2 p-2 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-700 dark:text-green-400">
            Toutes les disciplines sont complétées. La résolution est terminée.
          </div>
        )}
      </div>

      {/* Discipline cards */}
      <div className="relative">
        <div className="absolute left-[15px] top-3 bottom-3 w-px bg-border" />

        <div className="space-y-2">
          {discs.map((disc, idx) => {
            const isCompleted = (disc.status || '').toLowerCase() === 'completed'
            const isInProgress = (disc.status || '').toLowerCase() === 'in_progress' || (disc.status || '').toLowerCase() === 'in progress'
            const isNotStarted = !isCompleted && !isInProgress

            return (
              <div key={disc.discipline} className="relative pl-10">
                {/* Connector line top */}
                {idx > 0 && <div className="absolute left-[15px] -top-2 w-px h-2 bg-border" />}

                {/* Circle */}
                <div
                  className={`
                    absolute left-0 top-1 w-[30px] h-[30px] rounded-full flex items-center justify-center
                    text-[10px] font-bold text-white z-10
                    ${isCompleted ? 'bg-green-500' : isInProgress ? DISC_COLORS[idx] : 'bg-muted-foreground/30'}
                  `}
                >
                  {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : `D${disc.discipline}`}
                </div>

                {/* Card */}
                <div className="bg-card border rounded-lg p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{disc.title}</span>
                        <Badge variant="outline" className={`text-[10px] border ${dStatusColor(disc.status)}`}>
                          {dStatusLabel(disc.status)}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{disc.description}</p>
                    </div>
                  </div>

                  {/* D4: 5-Pourquoi */}
                  {disc.discipline === 4 && (
                    <div className="mt-3 border-l-2 border-orange-300 dark:border-orange-700 pl-3 space-y-2">
                      <Label className="text-xs font-medium text-orange-700 dark:text-orange-400">
                        Analyse 5 Pourquoi
                      </Label>
                      {whyFields.map((w, wi) => (
                        <div key={wi} className="flex items-start gap-2">
                          <span className="text-[10px] font-mono text-orange-600 dark:text-orange-400 mt-1.5 shrink-0 w-6">
                            P{wi + 1}
                          </span>
                          <div className="flex-1">
                            <Input
                              className="text-xs h-7"
                              placeholder={`Pourquoi ${wi + 1} ?`}
                              value={w}
                              onChange={e => handleWhyChange(wi, e.target.value)}
                              disabled={disabled || isCompleted}
                              onBlur={saveWhys}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Notes */}
                  <div className="mt-2">
                    <Textarea
                      className="text-xs min-h-[50px]"
                      placeholder="Notes..."
                      value={disc.notes || ''}
                      onChange={e => handleNotesChange(disc.discipline, e.target.value)}
                      disabled={disabled || isCompleted}
                      rows={2}
                    />
                  </div>

                  {/* Actions */}
                  {!disabled && !isCompleted && (
                    <div className="flex gap-1.5 mt-2">
                      {isNotStarted && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-[11px] h-7"
                          onClick={() => handleStatusChange(disc.discipline, 'In Progress')}
                        >
                          Démarrer
                        </Button>
                      )}
                      {isInProgress && (
                        <Button
                          size="sm"
                          className="text-[11px] h-7 bg-green-600 hover:bg-green-700"
                          onClick={() => handleStatusChange(disc.discipline, 'Completed')}
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Valider
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Meta */}
                  {(disc.assigned_to || disc.completed_at) && (
                    <p className="text-[10px] text-muted-foreground mt-1.5">
                      {disc.assigned_to && <>Assigné à {disc.assigned_to} </>
                      }
                      {disc.completed_at && <>le {new Date(disc.completed_at).toLocaleDateString('fr-FR')}</>}
                    </p>
                  )}
                </div>

                {/* Arrow between steps */}
                {idx < discs.length - 1 && (
                  <div className="flex justify-center my-0.5">
                    <ArrowDown className="w-3 h-3 text-muted-foreground/40" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}