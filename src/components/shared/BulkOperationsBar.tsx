'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CheckSquare, Square, MoreHorizontal, ArrowUpDown, Download, Trash2, UserPlus } from 'lucide-react'

interface BulkOperationsBarProps {
  selectedIds: string[]
  entityName: string
  onBulkAction: (action: string, ids: string[]) => void
  availableActions?: string[]
  onSelectAll?: () => void
  onDeselectAll?: () => void
  total?: number
}

const DEFAULT_ACTIONS = [
  { value: 'change_status', label: 'Changer le statut', icon: ArrowUpDown },
  { value: 'export_csv', label: 'Exporter (CSV)', icon: Download },
  { value: 'assign', label: 'Assigner', icon: UserPlus },
  { value: 'delete', label: 'Supprimer', icon: Trash2, destructive: true },
] as const

export function BulkOperationsBar({
  selectedIds,
  entityName,
  onBulkAction,
  availableActions,
  onSelectAll,
  onDeselectAll,
  total,
}: BulkOperationsBarProps) {
  if (selectedIds.length === 0) return null

  const actions = (availableActions
    ? DEFAULT_ACTIONS.filter((a) => availableActions.includes(a.value))
    : DEFAULT_ACTIONS
  ) as typeof DEFAULT_ACTIONS[number][]

  const entityLabel = entityName.charAt(0).toUpperCase() + entityName.slice(1)
  const allSelected = total !== undefined && selectedIds.length === total

  return (
    <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 animate-in slide-in-from-bottom-4 fade-in duration-200">
      <div className="flex items-center gap-3 rounded-xl border bg-background/95 backdrop-blur px-4 py-2.5 shadow-lg">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="font-semibold tabular-nums">
            {selectedIds.length}
          </Badge>
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {entityLabel}{selectedIds.length > 1 ? 's' : ''} sélectionné{selectedIds.length > 1 ? 's' : ''}
          </span>
        </div>

        <div className="h-5 w-px bg-border" />

        {/* Select all / deselect all */}
        {total !== undefined && total > 0 && (
          <div className="flex items-center gap-1">
            {allSelected ? (
              <Button variant="ghost" size="sm" onClick={onDeselectAll}>
                <Square className="mr-1.5 h-3.5 w-3.5" />
                Tout désélectionner
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={onSelectAll}>
                <CheckSquare className="mr-1.5 h-3.5 w-3.5" />
                Tout sélectionner
              </Button>
            )}
          </div>
        )}

        <div className="h-5 w-px bg-border" />

        {/* Actions dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <MoreHorizontal className="mr-1.5 h-4 w-4" />
              Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {actions.map((action, i) => {
              const Icon = action.icon
              return (
                <div key={action.value}>
                  <DropdownMenuItem
                    onClick={() => onBulkAction(action.value, selectedIds)}
                    className={action.destructive ? 'text-destructive focus:text-destructive' : ''}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {action.label}
                  </DropdownMenuItem>
                  {action.destructive && i < actions.length - 1 && <DropdownMenuSeparator />}
                </div>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}