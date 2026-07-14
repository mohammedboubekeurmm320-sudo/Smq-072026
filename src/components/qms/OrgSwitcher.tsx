'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Check, Building2, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export function OrgSwitcher() {
  const { memberships, currentOrgId, currentOrgName, switchOrg, loading } = useAuth()

  if (loading) return <div className="h-8 w-48 animate-pulse bg-muted rounded-md" />

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-[200px] justify-between font-normal">
          <div className="flex items-center gap-2 truncate">
            <Building2 className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <span className="truncate">{currentOrgName || 'Sélectionner...'}</span>
          </div>
          <ChevronsUpDown className="h-4 w-4 flex-shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[200px]">
        <DropdownMenuLabel>Organisations</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {memberships.length === 0 ? (
          <div className="px-2 py-1.5 text-sm text-muted-foreground">
            Aucune organisation
          </div>
        ) : (
          memberships.map((m) => (
            <DropdownMenuItem
              key={m.organization_id}
              onClick={() => switchOrg(m.organization_id)}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Building2 className="h-4 w-4" />
              <span className="truncate flex-1">{m.organization.name}</span>
              {m.organization_id === currentOrgId && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}