'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowUp, ArrowDown, Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Column<T = Record<string, unknown>> {
  key: string
  label: string
  sortable?: boolean
  render?: (value: unknown, row: T) => React.ReactNode
  className?: string
}

interface ResponsiveTableProps<T = Record<string, unknown>> {
  columns: Column<T>[]
  data: T[]
  onSort?: (key: string, direction: 'asc' | 'desc') => void
  onRowClick?: (row: T) => void
  loading?: boolean
  emptyMessage?: string
  skeletonRows?: number
}

export function ResponsiveTable<T extends Record<string, unknown>>({
  columns,
  data,
  onSort,
  onRowClick,
  loading = false,
  emptyMessage = 'Aucune donnée à afficher.',
  skeletonRows = 5,
}: ResponsiveTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const handleSort = (key: string) => {
    const newDir = sortKey === key && sortDir === 'asc' ? 'desc' : 'asc'
    setSortKey(key)
    setSortDir(newDir)
    onSort?.(key, newDir)
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead
                key={col.key}
                className={cn(
                  col.sortable && 'cursor-pointer select-none hover:bg-muted/50',
                  col.className
                )}
                onClick={col.sortable ? () => handleSort(col.key) : undefined}
                aria-sort={
                  sortKey === col.key
                    ? sortDir === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : undefined
                }
              >
                <div className="flex items-center gap-1">
                  {col.label}
                  {col.sortable && sortKey === col.key && (
                    sortDir === 'asc' ? (
                      <ArrowUp className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <ArrowDown className="h-3.5 w-3.5 text-primary" />
                    )
                  )}
                  {col.sortable && sortKey !== col.key && (
                    <span className="text-muted-foreground/40 text-xs">↕</span>
                  )}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: skeletonRows }).map((_, rowIdx) => (
              <TableRow key={rowIdx}>
                {columns.map((col) => (
                  <TableCell key={col.key}>
                    <Skeleton className="h-5 w-3/4" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-48">
                <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Inbox className="h-10 w-10" />
                  <p className="text-sm">{emptyMessage}</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, rowIdx) => (
              <TableRow
                key={rowIdx}
                className={cn(onRowClick && 'cursor-pointer')}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((col) => (
                  <TableCell key={col.key} className={col.className}>
                    {col.render
                      ? col.render(row[col.key], row)
                      : (row[col.key] as React.ReactNode) ?? '—'}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}