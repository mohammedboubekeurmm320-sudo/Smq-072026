'use client'

import { useMemo } from 'react'

interface FmeaRiskMatrixProps {
  title?: string
  severity?: number
  probability?: number
  onCellClick?: (severity: number, probability: number) => void
  className?: string
}

function getCellColor(s: number, p: number): string {
  const val = s * p
  if (val <= 4) return 'bg-green-400 dark:bg-green-600'
  if (val <= 9) return 'bg-amber-400 dark:bg-amber-600'
  if (val <= 16) return 'bg-orange-500 dark:bg-orange-600'
  return 'bg-red-500 dark:bg-red-600'
}

function getCellTextColor(s: number, p: number): string {
  const val = s * p
  if (val <= 4) return 'text-green-950 dark:text-green-100'
  if (val <= 9) return 'text-amber-950 dark:text-amber-100'
  if (val <= 16) return 'text-white'
  return 'text-white'
}

const SEVERITY_LABELS: Record<number, string> = {
  5: 'Catastrophique',
  4: 'Majeur',
  3: 'Modéré',
  2: 'Mineur',
  1: 'Négligeable',
}

const PROBABILITY_LABELS: Record<number, string> = {
  1: 'Très rare',
  2: 'Rare',
  3: 'Occasionnel',
  4: 'Probable',
  5: 'Fréquent',
}

export function FmeaRiskMatrix({
  title = 'Matrice de risque (S × P)',
  severity,
  probability,
  onCellClick,
  className = '',
}: FmeaRiskMatrixProps) {
  const cells = useMemo(() => {
    const grid: { s: number; p: number; val: number; color: string; textColor: string }[] = []
    for (let s = 5; s >= 1; s--) {
      for (let p = 1; p <= 5; p++) {
        grid.push({
          s,
          p,
          val: s * p,
          color: getCellColor(s, p),
          textColor: getCellTextColor(s, p),
        })
      }
    }
    return grid
  }, [])

  return (
    <div className={className}>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
        {title}
      </p>
      <div className="flex gap-1">
        {/* Y-axis labels */}
        <div className="flex flex-col justify-between pr-1 py-1">
          {[5, 4, 3, 2, 1].map(s => (
            <span
              key={s}
              className="text-[9px] text-muted-foreground leading-tight h-9 flex items-end pb-0.5"
            >
              {s}
            </span>
          ))}
        </div>

        <div className="flex-1">
          {/* Grid */}
          <div className="grid grid-cols-5 gap-0.5">
            {cells.map(cell => {
              const isHighlighted =
                severity !== undefined &&
                probability !== undefined &&
                cell.s === severity &&
                cell.p === probability

              return (
                <button
                  key={`${cell.s}-${cell.p}`}
                  type="button"
                  onClick={() => onCellClick?.(cell.s, cell.p)}
                  className={`
                    h-9 rounded-sm flex items-center justify-center text-xs font-bold
                    transition-all ${cell.color} ${cell.textColor}
                    ${isHighlighted ? 'ring-2 ring-foreground ring-offset-1 ring-offset-background scale-105' : 'opacity-90 hover:opacity-100'}
                    ${onCellClick ? 'cursor-pointer' : 'cursor-default'}
                  `}
                  title={`S=${cell.s} × P=${cell.p} = ${cell.val}`}
                >
                  {cell.val}
                </button>
              )
            })}
          </div>

          {/* X-axis labels */}
          <div className="grid grid-cols-5 gap-0.5 mt-1">
            {[1, 2, 3, 4, 5].map(p => (
              <span
                key={p}
                className="text-[8px] text-muted-foreground text-center leading-tight"
              >
                {PROBABILITY_LABELS[p]}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Axis titles */}
      <div className="flex justify-between mt-1 px-5">
        <span className="text-[8px] text-muted-foreground font-medium">
          Probabilité →
        </span>
        <span className="text-[8px] text-muted-foreground font-medium">
          Sévérité ↑
        </span>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-3 pt-2 border-t">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-green-400 dark:bg-green-600" />
          <span className="text-[9px] text-muted-foreground">Faible (≤4)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-amber-400 dark:bg-amber-600" />
          <span className="text-[9px] text-muted-foreground">Moyen (5-9)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-orange-500 dark:bg-orange-600" />
          <span className="text-[9px] text-muted-foreground">Élevé (10-16)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-red-500 dark:bg-red-600" />
          <span className="text-[9px] text-muted-foreground">Critique (≥17)</span>
        </div>
      </div>
    </div>
  )
}