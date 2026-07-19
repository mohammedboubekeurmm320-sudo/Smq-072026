'use client'

import { useState } from 'react'
import { Check, X, Minus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'

export interface AuditChecklistItem {
  id: string
  clause: string
  requirement: string
  status: 'compliant' | 'non_conform' | 'na' | 'pending'
  evidence?: string
  finding_severity?: 'major' | 'minor' | 'observation' | ''
  linked_capa_id?: string
}

interface AuditChecklistProps {
  items: AuditChecklistItem[]
  onUpdate?: (itemId: string, data: Partial<AuditChecklistItem>) => void
  disabled?: boolean
  className?: string
}

function statusIcon(status: string) {
  switch (status) {
    case 'compliant': return <Check className="w-3.5 h-3.5 text-green-600" />
    case 'non_conform': return <X className="w-3.5 h-3.5 text-red-600" />
    case 'na': return <Minus className="w-3.5 h-3.5 text-muted-foreground" />
    default: return <div className="w-3.5 h-3.5 rounded-full border-2 border-muted-foreground/30" />
  }
}

function statusBadgeStyle(status: string): string {
  switch (status) {
    case 'compliant': return 'bg-green-100 text-green-700 border-green-300 dark:bg-green-950 dark:text-green-400'
    case 'non_conform': return 'bg-red-100 text-red-700 border-red-300 dark:bg-red-950 dark:text-red-400'
    case 'na': return 'bg-muted text-muted-foreground border-border'
    default: return 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-400'
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'compliant': return 'Conforme'
    case 'non_conform': return 'Non-conforme'
    case 'na': return 'N/A'
    default: return 'En attente'
  }
}

export function AuditChecklist({
  items,
  onUpdate,
  disabled = false,
  className = '',
}: AuditChecklistProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const compliant = items.filter(i => i.status === 'compliant').length
  const nonConform = items.filter(i => i.status === 'non_conform').length
  const na = items.filter(i => i.status === 'na').length
  const total = items.length
  const checked = compliant + nonConform + na
  const pct = total > 0 ? Math.round((checked / total) * 100) : 0

  const cycleStatus = (itemId: string) => {
    const item = items.find(i => i.id === itemId)
    if (!item || !onUpdate) return
    const order: Array<'pending' | 'compliant' | 'non_conform' | 'na'> = ['pending', 'compliant', 'non_conform', 'na']
    const idx = order.indexOf((item.status as any) || 'pending')
    const next = order[(idx + 1) % order.length]
    onUpdate(itemId, { status: next })
  }

  return (
    <div className={className}>
      {/* Summary bar */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="text-center p-2 bg-muted/50 rounded-lg">
          <p className="text-lg font-bold">{checked}/{total}</p>
          <p className="text-[10px] text-muted-foreground">Vérifiés ({pct}%)</p>
        </div>
        <div className="text-center p-2 bg-green-50 dark:bg-green-950 rounded-lg">
          <p className="text-lg font-bold text-green-700 dark:text-green-400">{compliant}</p>
          <p className="text-[10px] text-green-600 dark:text-green-500">Conformes</p>
        </div>
        <div className="text-center p-2 bg-red-50 dark:bg-red-950 rounded-lg">
          <p className="text-lg font-bold text-red-700 dark:text-red-400">{nonConform}</p>
          <p className="text-[10px] text-red-600 dark:text-red-500">Non-conformes</p>
        </div>
        <div className="text-center p-2 bg-muted rounded-lg">
          <p className="text-lg font-bold text-muted-foreground">{na}</p>
          <p className="text-[10px] text-muted-foreground">N/A</p>
        </div>
      </div>

      <Progress value={pct} className="h-1.5 mb-4" />

      {/* Checklist items */}
      <div className="space-y-1">
        {items.map((item, idx) => {
          const isOpen = expandedId === item.id
          const isNC = item.status === 'non_conform'

          return (
            <div key={item.id}>
              <div
                className={`
                  flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors
                  ${isNC ? 'bg-red-50/50 dark:bg-red-950/20' : 'hover:bg-accent/30'}
                `}
                onClick={() => setExpandedId(isOpen ? null : item.id)}
              >
                {/* Status toggle */}
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); cycleStatus(item.id) }}
                  disabled={disabled}
                  className="shrink-0 hover:opacity-70 transition-opacity"
                >
                  {statusIcon(item.status)}
                </button>

                {/* Clause ref */}
                <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                  {item.clause}
                </Badge>

                {/* Requirement */}
                <span className={`text-xs flex-1 truncate ${isNC ? 'text-red-700 dark:text-red-400 font-medium' : ''}`}>
                  {item.requirement}
                </span>

                {/* Status badge */}
                <Badge variant="outline" className={`text-[9px] shrink-0 border ${statusBadgeStyle(item.status)}`}>
                  {statusLabel(item.status)}
                </Badge>

                {/* Finding severity */}
                {isNC && item.finding_severity && (
                  <Badge variant="outline" className="text-[9px] shrink-0 border-amber-300 bg-amber-50 text-amber-700">
                    {item.finding_severity === 'major' ? 'Majeur' : item.finding_severity === 'minor' ? 'Mineur' : 'Observation'}
                  </Badge>
                )}
              </div>

              {/* Expanded detail */}
              {isOpen && (
                <div className="ml-8 mr-2 mt-1 p-3 border rounded-lg bg-card space-y-3">
                  {/* Evidence */}
                  <div>
                    <Label className="text-xs text-muted-foreground">Preuves / Observations</Label>
                    <Textarea
                      className="text-xs min-h-[60px] mt-1"
                      placeholder="Décrire les preuves examinées..."
                      value={item.evidence || ''}
                      onChange={e => onUpdate?.(item.id, { evidence: e.target.value })}
                      disabled={disabled}
                      rows={2}
                    />
                  </div>

                  {/* Finding severity (if NC) */}
                  {item.status === 'non_conform' && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Sévérité du constat</Label>
                      <div className="flex gap-2 mt-1">
                        {[
                          { val: 'major', label: 'Majeur' },
                          { val: 'minor', label: 'Mineur' },
                          { val: 'observation', label: 'Observation' },
                        ].map(s => (
                          <Button
                            key={s.val}
                            size="sm"
                            variant={item.finding_severity === s.val ? 'default' : 'outline'}
                            className="text-[11px] h-7"
                            onClick={() => onUpdate?.(item.id, { finding_severity: s.val as any })}
                            disabled={disabled}
                          >
                            {s.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}