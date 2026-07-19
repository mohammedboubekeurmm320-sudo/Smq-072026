'use client'

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

interface ActionDef {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  variant?: 'default' | 'destructive'
  disabled?: boolean
}

interface MobileActionSheetProps {
  open: boolean
  actions: ActionDef[]
  onClose: () => void
  title?: string
}

export function MobileActionSheet({
  open,
  actions,
  onClose,
  title = 'Actions',
}: MobileActionSheetProps) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="rounded-t-xl max-h-[70vh]">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription className="sr-only">
            Sélectionnez une action à effectuer.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-1 px-4 pb-4 pt-2">
          {/* Cancel button (iOS style) */}
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center rounded-lg py-3 text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
          >
            Annuler
          </button>

          <div className="h-px bg-border my-1" />

          {/* Action buttons */}
          {actions.map((action, idx) => (
            <button
              key={idx}
              type="button"
              disabled={action.disabled}
              onClick={() => {
                action.onClick()
                onClose()
              }}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors',
                action.variant === 'destructive'
                  ? 'text-destructive hover:bg-destructive/10'
                  : 'hover:bg-muted',
                action.disabled && 'opacity-50 pointer-events-none'
              )}
            >
              {action.icon && <span className="flex-shrink-0">{action.icon}</span>}
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}