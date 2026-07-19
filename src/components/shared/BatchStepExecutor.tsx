'use client'

import { useState } from 'react'
import { Play, CheckCircle2, XCircle, ChevronDown, ChevronUp, Settings2, FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'

export interface BatchStep {
  id: string
  step_number: number
  step_description: string
  status: string
  completed_by?: string
  completed_at?: string
  comments?: string
  parameters?: Record<string, string | number>
}

interface BatchStepExecutorProps {
  batchId: string
  steps: BatchStep[]
  onStepComplete?: (stepId: string, data: { comments: string; status: string; parameters?: Record<string, string | number> }) => void
  disabled?: boolean
  editable?: boolean
  className?: string
}

function statusColor(status: string): string {
  const s = (status || '').toLowerCase()
  if (s === 'completed') return 'bg-green-500 text-white'
  if (s === 'in_progress' || s === 'in progress') return 'bg-blue-500 text-white'
  if (s === 'failed') return 'bg-red-500 text-white'
  return 'bg-muted-foreground/20 text-muted-foreground'
}

function statusLabel(status: string): string {
  const s = (status || '').toLowerCase()
  if (s === 'completed') return 'Validé'
  if (s === 'in_progress' || s === 'in progress') return 'En cours'
  if (s === 'failed') return 'Échoué'
  return 'En attente'
}

export function BatchStepExecutor({
  steps,
  onStepComplete,
  disabled = false,
  editable = true,
  className = '',
}: BatchStepExecutorProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [comments, setComments] = useState<Record<string, string>>({})
  const [params, setParams] = useState<Record<string, Record<string, string | number>>>({})

  const completedCount = steps.filter(s => {
    const st = (s.status || '').toLowerCase()
    return st === 'completed'
  }).length

  const progressPct = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleAction = (step: BatchStep, targetStatus: string) => {
    if (!onStepComplete) return
    onStepComplete(step.id, {
      comments: comments[step.id] || '',
      status: targetStatus,
      parameters: params[step.id],
    })
  }

  if (steps.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground bg-muted/30 rounded-lg">
        Aucune étape de production définie pour ce dossier de lot.
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Progression des étapes
          </span>
          <span className="text-xs font-bold">
            {completedCount}/{steps.length} — {progressPct}%
          </span>
        </div>
        <Progress value={progressPct} className="h-2" />
      </div>

      {/* Steps */}
      <div className="relative">
        <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />

        <div className="space-y-0">
          {steps.map(step => {
            const isOpen = expanded.has(step.id)
            const isLocked = disabled || !editable
            const stepStatus = (step.status || '').toLowerCase()
            const isCompleted = stepStatus === 'completed'
            const isFailed = stepStatus === 'failed'
            const isInProgress = stepStatus === 'in_progress' || stepStatus === 'in progress'
            const isPending = !isCompleted && !isFailed && !isInProgress

            return (
              <div key={step.id} className="relative pl-10 pb-3">
                {/* Circle */}
                <button
                  type="button"
                  onClick={() => toggleExpand(step.id)}
                  className={`
                    absolute left-0 top-1 w-[30px] h-[30px] rounded-full flex items-center justify-center
                    text-xs font-bold border-2 z-10 transition-colors
                    ${isCompleted ? 'bg-green-500 border-green-500 text-white' : ''}
                    ${isFailed ? 'bg-red-500 border-red-500 text-white' : ''}
                    ${isInProgress ? 'bg-blue-500 border-blue-500 text-white' : ''}
                    ${isPending ? 'bg-background border-muted-foreground/30 text-muted-foreground' : ''}
                  `}
                >
                  {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : step.step_number}
                </button>

                {/* Content */}
                <div className="bg-card border rounded-lg p-3">
                  <div
                    className="flex items-start justify-between cursor-pointer"
                    onClick={() => toggleExpand(step.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">
                          Étape {step.step_number}
                        </span>
                        <Badge variant="outline" className={`text-[10px] ${statusColor(step.status)}`}>
                          {statusLabel(step.status)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {step.step_description}
                      </p>
                    </div>
                    <div className="shrink-0 ml-2">
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isOpen && (
                    <div className="mt-3 space-y-3 border-t pt-3">
                      {/* Parameters */}
                      {step.parameters && Object.keys(step.parameters).length > 0 && (
                        <div>
                          <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-1.5">
                            <Settings2 className="w-3 h-3" /> Paramètres
                          </Label>
                          <div className="grid grid-cols-2 gap-1.5">
                            {Object.entries(step.parameters).map(([key, val]) => (
                              <div key={key} className="flex items-center gap-1.5 text-xs bg-muted/50 rounded px-2 py-1">
                                <span className="font-medium text-muted-foreground">{key}:</span>
                                {isPending || isInProgress ? (
                                  <Input
                                    className="h-6 text-xs px-1"
                                    value={String(params[step.id]?.[key] ?? val)}
                                    onChange={e => {
                                      const curr = params[step.id] || { ...step.parameters }
                                      setParams(p => ({ ...p, [step.id]: { ...curr, [key]: e.target.value } }))
                                    }}
                                    disabled={isLocked}
                                  />
                                ) : (
                                  <span className="font-mono">{String(val)}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Comments */}
                      <div>
                        <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-1.5">
                          <FileText className="w-3 h-3" /> Commentaires
                        </Label>
                        <Textarea
                          className="text-xs min-h-[60px]"
                          placeholder="Ajouter des observations..."
                          value={comments[step.id] || step.comments || ''}
                          onChange={e => setComments(p => ({ ...p, [step.id]: e.target.value }))}
                          disabled={isLocked || isCompleted || isFailed}
                          rows={2}
                        />
                      </div>

                      {/* Completion info */}
                      {(isCompleted || isFailed) && (
                        <p className="text-[10px] text-muted-foreground">
                          {isCompleted ? 'Validé' : 'Échoué'}
                          {step.completed_by ? ` par ${step.completed_by}` : ''}
                          {step.completed_at ? ` le ${new Date(step.completed_at).toLocaleDateString('fr-FR')}` : ''}
                        </p>
                      )}

                      {/* Actions */}
                      {!isLocked && (
                        <div className="flex gap-2">
                          {isPending && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7"
                              onClick={() => handleAction(step, 'in_progress')}
                            >
                              <Play className="w-3 h-3 mr-1" /> Démarrer
                            </Button>
                          )}
                          {isInProgress && (
                            <>
                              <Button
                                size="sm"
                                className="text-xs h-7 bg-green-600 hover:bg-green-700"
                                onClick={() => handleAction(step, 'completed')}
                              >
                                <CheckCircle2 className="w-3 h-3 mr-1" /> Valider
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleAction(step, 'failed')}
                              >
                                <XCircle className="w-3 h-3 mr-1" /> Échec
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}