'use client'

import { Check } from 'lucide-react'

const STAGES = [
  { key: 'raw_material', label: 'Matières premières' },
  { key: 'in_process', label: 'Production' },
  { key: 'finished_product', label: 'Produit fini' },
  { key: 'packaging', label: 'Conditionnement' },
  { key: 'storage', label: 'Stockage' },
  { key: 'distribution', label: 'Distribution' },
]

interface ProductStageTrackerProps {
  currentStage?: string
  onStageChange?: (stage: string) => void
  disabled?: boolean
  className?: string
}

export function ProductStageTracker({
  currentStage,
  onStageChange,
  disabled = false,
  className = '',
}: ProductStageTrackerProps) {
  const currentIdx = STAGES.findIndex(s => s.key === currentStage)

  return (
    <div className={className}>
      <p className="text-xs font-medium text-muted-foreground mb-2">
        Stade du produit
      </p>
      <div className="flex items-center gap-0">
        {STAGES.map((stage, idx) => {
          const isPast = idx < currentIdx
          const isCurrent = idx === currentIdx
          const isFuture = idx > currentIdx

          return (
            <div key={stage.key} className="flex items-center">
              <button
                type="button"
                onClick={() => onStageChange?.(stage.key)}
                disabled={disabled || !onStageChange}
                className={`
                  flex flex-col items-center gap-1 cursor-default
                  ${onStageChange && !disabled ? 'cursor-pointer' : ''}
                `}
              >
                <div
                  className={`
                    w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold
                    border-2 transition-colors
                    ${isPast
                      ? 'bg-green-500 border-green-500 text-white'
                      : isCurrent
                        ? 'bg-primary border-primary text-primary-foreground ring-2 ring-primary/30'
                        : 'bg-background border-muted-foreground/30 text-muted-foreground'
                    }
                  `}
                >
                  {isPast ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                </div>
                <span
                  className={`
                    text-[9px] leading-tight text-center max-w-[60px]
                    ${isCurrent ? 'font-medium text-foreground' : 'text-muted-foreground'}
                  `}
                >
                  {stage.label}
                </span>
              </button>
              {idx < STAGES.length - 1 && (
                <div
                  className={`
                    w-6 h-px mx-0.5
                    ${idx < currentIdx ? 'bg-green-400' : 'bg-border'}
                  `}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export { STAGES }