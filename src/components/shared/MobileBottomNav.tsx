'use client'

import { LayoutDashboard, FileText, Shield, CheckSquare, MoreHorizontal } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { ActiveSection } from '@/types/qms'

interface NavItem {
  section: string
  label: string
  icon: React.ReactNode
}

interface MobileBottomNavProps {
  activeSection: string
  onNavigate: (section: ActiveSection) => void
  /** Notification count shown on the QMS icon */
  notificationCount?: number
}

const NAV_ITEMS: NavItem[] = [
  { section: 'dashboard', label: 'Tableau de bord', icon: <LayoutDashboard className="h-5 w-5" /> },
  { section: 'documents', label: 'Documents', icon: <FileText className="h-5 w-5" /> },
  { section: 'qms', label: 'QMS', icon: <Shield className="h-5 w-5" /> },
  { section: 'compliance', label: 'Conformité', icon: <CheckSquare className="h-5 w-5" /> },
  { section: 'more', label: 'Plus', icon: <MoreHorizontal className="h-5 w-5" /> },
]

const QMS_SUB_ITEMS: NavItem[] = [
  { section: 'ncr', label: 'NCR', icon: null },
  { section: 'capa', label: 'CAPA', icon: null },
  { section: 'audits', label: 'Audits', icon: null },
  { section: 'deviations', label: 'Déviations', icon: null },
  { section: 'change-control', label: 'Contrôle de changement', icon: null },
  { section: 'risks', label: 'Risques', icon: null },
  { section: 'training', label: 'Formation', icon: null },
  { section: 'reports', label: 'Rapports', icon: null },
]

export function MobileBottomNav({
  activeSection,
  onNavigate,
  notificationCount = 0,
}: MobileBottomNavProps) {
  const [qmsOpen, setQmsOpen] = useState(false)

  const isQmsSubActive = QMS_SUB_ITEMS.some((item) => activeSection === item.section)
  const isQmsActive = activeSection === 'qms' || isQmsSubActive

  const handleNavigate = (section: string) => {
    if (section === 'qms') {
      setQmsOpen(!qmsOpen)
      return
    }
    setQmsOpen(false)
    onNavigate(section as ActiveSection)
  }

  return (
    <>
      {/* Bottom nav — visible on mobile only */}
      <nav
        className="fixed bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur lg:hidden safe-area-pb"
        role="navigation"
        aria-label="Navigation principale"
      >
        <div className="flex items-stretch justify-around h-14">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.section === 'qms' ? isQmsActive : activeSection === item.section
            return (
              <button
                key={item.section}
                type="button"
                onClick={() => handleNavigate(item.section)}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-0.5 flex-1 transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="relative">
                  {item.icon}
                  {item.section === 'qms' && notificationCount > 0 && (
                    <Badge
                      className="absolute -top-1.5 -right-2.5 h-4 min-w-4 px-1 text-[10px] flex items-center justify-center"
                      variant="destructive"
                    >
                      {notificationCount > 99 ? '99+' : notificationCount}
                    </Badge>
                  )}
                </span>
                <span className="text-[10px] leading-tight font-medium">{item.label}</span>
              </button>
            )
          })}
        </div>

        {/* QMS sub-menu expandable panel */}
        {qmsOpen && (
          <div className="border-t bg-muted/50 animate-in slide-in-from-bottom-2 duration-200">
            <div className="grid grid-cols-2 gap-px p-2">
              {QMS_SUB_ITEMS.map((sub) => (
                <button
                  key={sub.section}
                  type="button"
                  onClick={() => {
                    onNavigate(sub.section as ActiveSection)
                    setQmsOpen(false)
                  }}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-3 py-2.5 text-sm transition-colors text-left',
                    activeSection === sub.section
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'hover:bg-muted'
                  )}
                >
                  {sub.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Spacer for content not covered by bottom nav on mobile */}
      <div className="h-14 lg:hidden" />
    </>
  )
}