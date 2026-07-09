'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/store/auth'
import { Login } from '@/components/qms/Login'
import { Dashboard } from '@/components/qms/Dashboard'
import { Documents } from '@/components/qms/Documents'
import { Risks } from '@/components/qms/Risks'
import { Audits } from '@/components/qms/Audits'
import { Nonconformities } from '@/components/qms/Nonconformities'
import { Capas } from '@/components/qms/Capas'
import { Trainings } from '@/components/qms/Trainings'
import { Suppliers } from '@/components/qms/Suppliers'
import { Processes } from '@/components/qms/Processes'
import { Users } from '@/components/qms/Users'
import { Settings } from '@/components/qms/Settings'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { ShieldCheck, LayoutDashboard, FileText, AlertTriangle, ClipboardList, ShieldAlert, CheckCircle2, Users as UsersIcon, Building2, Activity, Settings as SettingsIcon, LogOut, Menu, User as UserIcon } from 'lucide-react'
import { LABELS } from '@/lib/ui-labels'
import type { Role, SessionUser } from '@/lib/types'

interface NavItem {
  id: string
  label: string
  icon: any
  roles?: Role[]
  group?: string
}

const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard, group: 'Pilotage' },
  { id: 'documents', label: 'Documents', icon: FileText, group: 'Maîtrise' },
  { id: 'risks', label: 'Risques', icon: ShieldAlert, group: 'Maîtrise' },
  { id: 'processes', label: 'Processus', icon: Activity, group: 'Maîtrise' },
  { id: 'audits', label: 'Audits', icon: CheckCircle2, group: 'Évaluation' },
  { id: 'nonconformities', label: 'Non-conformités', icon: AlertTriangle, group: 'Évaluation' },
  { id: 'capas', label: 'CAPA', icon: ClipboardList, group: 'Évaluation' },
  { id: 'suppliers', label: 'Fournisseurs', icon: Building2, group: 'Ressources' },
  { id: 'trainings', label: 'Formations', icon: UsersIcon, group: 'Ressources' },
  { id: 'users', label: 'Utilisateurs', icon: UserIcon, roles: ['ADMIN'], group: 'Administration' },
  { id: 'settings', label: 'Paramètres', icon: SettingsIcon, roles: ['ADMIN'], group: 'Administration' }
]

function getInitials(name: string): string {
  return name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
}

interface SidebarProps {
  user: SessionUser
  active: string
  onNavigate: (tab: string) => void
  onLogout: () => void
}

function SidebarContent({ user, active, onNavigate, onLogout }: SidebarProps) {
  const allowedNav = NAV.filter(n => !n.roles || n.roles.includes(user.role as Role) || user.role === 'SUPER_ADMIN')
  const groups = [...new Set(allowedNav.map(n => n.group || ''))]
  const initials = getInitials(user.name)

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-emerald-600 text-white">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="font-bold text-sm">QMS ISO 13485</div>
            <div className="text-xs text-muted-foreground truncate max-w-[160px]">{user.organizationName}</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        {groups.map(group => (
          <div key={group}>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">{group}</div>
            <div className="space-y-1">
              {allowedNav.filter(n => n.group === group).map(item => (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
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
        ))}
      </nav>

      <div className="p-3 border-t">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="text-left flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{user.name}</div>
                <div className="text-xs text-muted-foreground truncate">{LABELS.role(user.role)}</div>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="font-medium">{user.name}</div>
              <div className="text-xs text-muted-foreground font-normal">{user.email}</div>
              <Badge variant="secondary" className="mt-1 text-xs">{LABELS.role(user.role)}</Badge>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLogout} className="text-red-600">
              <LogOut className="h-4 w-4 mr-2" /> Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

function renderContent(active: string, setActive: (t: string) => void) {
  switch (active) {
    case 'dashboard': return <Dashboard onNavigate={setActive} />
    case 'documents': return <Documents />
    case 'risks': return <Risks />
    case 'processes': return <Processes />
    case 'audits': return <Audits />
    case 'nonconformities': return <Nonconformities />
    case 'capas': return <Capas />
    case 'suppliers': return <Suppliers />
    case 'trainings': return <Trainings />
    case 'users': return <Users />
    case 'settings': return <Settings />
    default: return <Dashboard onNavigate={setActive} />
  }
}

export function AppShell() {
  const { user, loading, fetchUser, logout } = useAuth()
  const [active, setActive] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => { fetchUser() }, [fetchUser])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Chargement…</div>
      </div>
    )
  }

  if (!user) return <Login />

  const handleNavigate = (tab: string) => {
    setActive(tab)
    setSidebarOpen(false)
  }

  const handleLogout = () => {
    logout()
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col fixed inset-y-0 left-0 z-30">
        <SidebarContent user={user} active={active} onNavigate={handleNavigate} onLogout={handleLogout} />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden fixed top-3 left-3 z-40">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SidebarContent user={user} active={active} onNavigate={handleNavigate} onLogout={handleLogout} />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex-1 lg:ml-64">
        <main className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          {renderContent(active, setActive)}
        </main>
      </div>
    </div>
  )
}
