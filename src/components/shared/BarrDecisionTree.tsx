'use client'

import { Check, ChevronDown } from 'lucide-react'

interface BarrStep {
  id: number
  label: string
  isDecision?: boolean
  ouiConclusion?: string
  nonNext?: number
}

const TREE_STEPS: BarrStep[] = [
  { id: 0, label: 'Résultat OOS/OOT identifié' },
  {
    id: 1,
    label: 'Erreur de laboratoire ?',
    isDecision: true,
    ouiConclusion: 'Erreur lab confirmée — Re-tester avec échantillon original',
  },
  {
    id: 2,
    label: "Erreur d'échantillonnage ?",
    isDecision: true,
    ouiConclusion: "Erreur échantillonnage — Re-prélever l'échantillon",
  },
  {
    id: 3,
    label: 'Processus de fabrication en cause ?',
    isDecision: true,
    ouiConclusion: 'Déviation processus — CAPA requise',
  },
  {
    id: 4,
    label: 'Matières premières en cause ?',
    isDecision: true,
    ouiConclusion: 'Problème fournisseur — Action corrective fournisseur',
  },
  { id: 5, label: 'Cause indéterminée', ouiConclusion: 'Investigation étendue requise — Escalader' },
]

interface BarrDecisionTreeProps {
  currentStep?: number
  conclusion?: string
  onStepSelect?: (step: number) => void
  className?: string
}

export function BarrDecisionTree({
  currentStep = 0,
  conclusion,
  onStepSelect,
  className = '',
}: BarrDecisionTreeProps) {
  return (
    <div className={`space-y-0 ${className}`}>
      {TREE_STEPS.map((step, idx) => {
        const isCompleted = step.id < currentStep
        const isActive = step.id === currentStep
        const isFuture = step.id > currentStep
        const isTerminal = step.id === 5 || (step.isDecision && step.ouiConclusion)
        const isLast = idx === TREE_STEPS.length - 1

        return (
          <div key={step.id}>
            {/* Step node */}
            <button
              type="button"
              onClick={() => onStepSelect?.(step.id)}
              disabled={!onStepSelect}
              className={`
                w-full text-left p-2.5 rounded-lg border transition-all
                ${isActive
                  ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
                  : isCompleted
                    ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950/30'
                    : 'border-border bg-muted/30 opacity-70'
                }
                ${onStepSelect ? 'cursor-pointer hover:bg-accent/50' : 'cursor-default'}
              `}
            >
              <div className="flex items-center gap-2">
                {/* Status icon */}
                <div
                  className={`
                    w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold
                    ${isCompleted
                      ? 'bg-green-500 text-white'
                      : isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted-foreground/20 text-muted-foreground'
                    }
                  `}
                >
                  {isCompleted ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    step.id
                  )}
                </div>

                <span
                  className={`
                    text-sm font-medium flex-1
                    ${isFuture ? 'text-muted-foreground' : 'text-foreground'}
                  `}
                >
                  {step.label}
                </span>

                {step.isDecision && (
                  <span className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                    Décision
                  </span>
                )}
              </div>
            </button>

            {/* Oui/Non branches for decision steps */}
            {step.isDecision && (
              <div className="ml-8 mt-1 space-y-1">
                {/* Oui branch */}
                <div
                  className={`
                    p-2 rounded-md border text-xs
                    ${isCompleted
                      ? 'border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-950/30'
                      : 'border-border bg-muted/20 opacity-50'
                    }
                  `}
                >
                  <span className="font-medium text-green-700 dark:text-green-400">Oui → </span>
                  <span className="text-muted-foreground">
                    {step.ouiConclusion}
                  </span>
                </div>

                {/* Non branch — continue */}
                {!isLast && (
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground py-1">
                    <span>Non →</span>
                    <ChevronDown className="w-3 h-3" />
                    <span>Poursuivre l&apos;investigation</span>
                  </div>
                )}
              </div>
            )}

            {/* Terminal conclusion for step 5 */}
            {step.id === 5 && (
              <div
                className={`
                  ml-8 mt-1 p-2 rounded-md border text-xs
                  ${isActive || isCompleted
                    ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30'
                    : 'border-border bg-muted/20 opacity-50'
                  }
                `}
              >
                <span className="font-medium text-amber-700 dark:text-amber-400">Conclusion : </span>
                <span className="text-muted-foreground">
                  {conclusion || step.ouiConclusion}
                </span>
              </div>
            )}

            {/* Connector line */}
            {!isLast && (
              <div className="ml-4 pl-0.5">
                <div
                  className={`
                    w-px h-3 mx-auto
                    ${isCompleted ? 'bg-green-300 dark:bg-green-700' : 'bg-border'}
                  `}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}