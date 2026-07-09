'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useQmsStore } from '@/lib/demo-store'
import { INDUSTRY_CONFIG, CORE_MODULES, OPTIONAL_MODULES, type ModuleKey, type ActiveSection, type OrgSettings, type IndustryType, STANDARDS_BY_INDUSTRY } from '@/types/qms'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  ShieldCheck, LayoutDashboard, FileText, GitBranch, AlertTriangle, Shield, AlertOctagon,
  ArrowLeftRight, ClipboardCheck, BarChart3, GraduationCap, Package, Truck, FlaskConical,
  FileSpreadsheet, PieChart, CheckCircle2, Users, Settings as SettingsIcon, LogOut, Menu,
  CalendarClock, FolderOpen, ScrollText, Layers,
} from 'lucide-react'
import { SetupWizard } from '@/components/setup/SetupWizard'
import { Login } from '@/components/auth/Login'

interface NavItem {
  id: ActiveSection
  label: string
  icon: any
  module?: ModuleKey  // for filtering by active_modules
  group: string
  adminOnly?: boolean
}

const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Tableau de Bord', icon: LayoutDashboard, group: 'Pilotage' },
  { id: 'documents', label: 'Documents', icon: FileText, module: 'documents', group: 'Gouvernance Documentaire' },
  { id: 'document-hierarchy', label: 'Hiérarchie Documentaire', icon: GitBranch, module: 'hierarchy', group: 'Gouvernance Documentaire' },
  { id: 'ncr', label: 'Non-Conformités', icon: AlertTriangle, module: 'ncr', group: 'Qualité & Amélioration' },
  { id: 'capa', label: 'CAPA', icon: Shield, module: 'capa', group: 'Qualité & Amélioration' },
  { id: 'deviations', label: 'Déviations', icon: AlertOctagon, module: 'deviations', group: 'Qualité & Amélioration' },
  { id: 'change-control', label: 'Contrôle des Changements', icon: ArrowLeftRight, module: 'change_control', group: 'Qualité & Amélioration' },
  { id: 'audits', label: 'Audits', icon: ClipboardCheck, module: 'audits', group: 'Qualité & Amélioration' },
  { id: 'risks', label: 'Risques', icon: BarChart3, module: 'risks', group: 'Qualité & Amélioration' },
  { id: 'oos-oot', label: 'OOS/OOT', icon: FlaskConical, module: 'oos_oot', group: 'Qualité & Amélioration' },
  { id: 'training', label: 'Formation', icon: GraduationCap, module: 'training', group: 'Qualité & Amélioration' },
  { id: 'batch-records', label: 'Dossiers de Lot', icon: Package, module: 'batch_records', group: 'Production & Achats' },
  { id: 'suppliers', label: 'Fournisseurs', icon: Truck, module: 'suppliers', group: 'Production & Achats' },
  { id: 'forms', label: 'Formulaires', icon: FileSpreadsheet, module: 'forms', group: 'Production & Achats' },
  { id: 'record-types', label: 'Types d\'Enregistrements', icon: Layers, group: 'Administration', adminOnly: true },
  { id: 'custom-records', label: 'Enregistrements Personnalisés', icon: FolderOpen, module: 'forms', group: 'Administration' },
  { id: 'reports', label: 'Rapports', icon: PieChart, module: 'reports', group: 'Administration' },
  { id: 'compliance', label: 'Conformité', icon: CheckCircle2, module: 'compliance', group: 'Administration' },
  { id: 'scheduled-reports', label: 'Rapports Planifiés', icon: CalendarClock, module: 'reports', group: 'Administration' },
  { id: 'audit-trail', label: 'Piste d\'Audit', icon: ScrollText, group: 'Administration', adminOnly: true },
  { id: 'user-management', label: 'Utilisateurs', icon: Users, group: 'Administration', adminOnly: true },
  { id: 'settings', label: 'Paramètres', icon: SettingsIcon, group: 'Administration', adminOnly: true },
]

const GROUPS = ['Pilotage', 'Gouvernance Documentaire', 'Qualité & Amélioration', 'Production & Achats', 'Administration']

export function AppShell({ children }: { children: React.ReactNode | ((props: { active: ActiveSection; setActive: (s: ActiveSection) => void }) => React.ReactNode) }) {
  const { profile, organization, loading, logout, hasRole, user } = useAuth()
  const [active, setActive] = useState<ActiveSection>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-pulse text-muted-foreground flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 animate-spin text-emerald-600" />
          Chargement du système QMS…
        </div>
      </div>
    )
  }

  if (!profile || !organization) {
    return <Login />
  }

  // Check if setup is needed
  const needsSetup = !organization.settings.setup_completed
  if (needsSetup) {
    return <SetupWizard />
  }

  const activeModules = organization.settings.active_modules || [...CORE_MODULES]
  const allowedNav = NAV.filter(n => {
    if (n.adminOnly && !hasRole('admin')) return false
    if (n.module && !activeModules.includes(n.module)) return false
    return true
  })

  const initials = profile.fullName.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
  const industryConfig = organization.settings.industry_type ? INDUSTRY_CONFIG[organization.settings.industry_type] : null

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-emerald-600 text-white">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-sm">QMS ISO 13485 Pro</div>
            <div className="text-xs text-muted-foreground truncate">{organization.name}</div>
          </div>
        </div>
        {industryConfig && (
          <div className="mt-2 flex flex-wrap gap-1">
            <Badge variant="outline" className="text-xs">{industryConfig.label}</Badge>
            <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">{industryConfig.primaryStandard}</Badge>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        {GROUPS.map(group => {
          const items = allowedNav.filter(n => n.group === group)
          if (items.length === 0) return null
          return (
            <div key={group}>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">{group}</div>
              <div className="space-y-1">
                {items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => { setActive(item.id); setSidebarOpen(false) }}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                      active === item.id
                        ? 'bg-emerald-50 text-emerald-700 font-medium border border-emerald-200'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </nav>

      <div className="p-3 border-t">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="text-left flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{profile.fullName}</div>
                <div className="text-xs text-muted-foreground truncate">{profile.role}</div>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="font-medium">{profile.fullName}</div>
              <div className="text-xs text-muted-foreground font-normal">{profile.email}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-red-600">
              <LogOut className="h-4 w-4 mr-2" /> Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
      <aside className="hidden lg:flex w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col fixed inset-y-0 left-0 z-30">
        <SidebarContent />
      </aside>

      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden fixed top-3 left-3 z-40">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      <div className="flex-1 lg:ml-64">
        <main className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          {typeof children === 'function' ? (children as any)({ active, setActive }) : children}
        </main>
      </div>
    </div>
  )
}
