'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { OrgSwitcher } from '@/components/qms/OrgSwitcher'
import { NotificationBell } from '@/components/qms/NotificationBell'
import { UserMenu } from '@/components/qms/UserMenu'
import { GlobalSearch } from '@/components/shared/GlobalSearch'
import { SIDEBAR_NAV, type NavGroup } from '@/lib/qms-entity-map'
import { cn } from '@/lib/utils'
import { Menu, ShieldCheck, PanelLeftClose, PanelLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useState, useEffect, useCallback } from 'react'

import {
  LayoutDashboard, Shield, AlertTriangle, AlertOctagon, ArrowLeftRight,
  ClipboardCheck, FileText, GraduationCap, Package, Truck, BarChart3,
  History, Bell, Search as SearchIcon,
} from 'lucide-react'

const ICON_MAP: Record<string, any> = {
  LayoutDashboard, Shield, AlertTriangle, AlertOctagon, ArrowLeftRight,
  ClipboardCheck, FileText, GraduationCap, Package, Truck, BarChart3,
  History, Bell, Search: SearchIcon,
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isAuthenticated, loading } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login')
    }
  }, [loading, isAuthenticated, router])

  // Close mobile sidebar on navigation
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Ctrl+K / Cmd+K shortcut
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      setSearchOpen(prev => !prev)
    }
  }, [])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Chargement...</div>
      </div>
    )
  }

  if (!isAuthenticated) return null

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed md:sticky top-0 z-50 h-screen border-r bg-background transition-all duration-300 flex flex-col',
          sidebarOpen ? 'w-64' : 'w-16',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-4 border-b">
          {sidebarOpen && (
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-emerald-600 text-white text-sm font-bold flex items-center justify-center">
                Q
              </div>
              <span className="font-bold text-sm">QMS ISO 13485</span>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Nav */}
        <ScrollArea className="flex-1 px-3 py-2">
          <nav className="space-y-1">
            {SIDEBAR_NAV.map((group, gi) => (
              <div key={gi}>
                {sidebarOpen && group.label && (
                  <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {group.label}
                  </p>
                )}
                {group.items.map((item) => {
                  const href = item.slug === 'dashboard'
                    ? '/dashboard'
                    : item.slug === 'audit-trail'
                    ? '/audit'
                    : item.slug === 'notifications'
                    ? '/notifications'
                    : item.slug === 'deadlines'
                    ? '/deadlines'
                    : `/qms/${item.slug}`

                  const isActive = pathname === href || pathname?.startsWith(href + '/')
                  const Icon = ICON_MAP[item.icon] || ShieldCheck

                  return (
                    <Link
                      key={item.slug}
                      href={href}
                      title={item.label}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors',
                        sidebarOpen ? '' : 'justify-center px-2',
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      {sidebarOpen && <span>{item.label}</span>}
                    </Link>
                  )
                })}
                {gi < SIDEBAR_NAV.length - 1 && <Separator className="my-2" />}
              </div>
            ))}
          </nav>
        </ScrollArea>

        {/* ISO badge */}
        {sidebarOpen && (
          <div className="p-4 border-t">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Conforme ISO 13485:2016</span>
            </div>
          </div>
        )}
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-8 w-8"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            {/* Global search trigger */}
            <div className="relative hidden sm:block">
              <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher... (Ctrl+K)"
                className="w-64 pl-9 h-9 text-sm cursor-pointer"
                readOnly
                onClick={() => setSearchOpen(true)}
              />
              <kbd className="absolute right-2 top-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:flex">
                Ctrl+K
              </kbd>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <OrgSwitcher />
            <NotificationBell />
            <UserMenu />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>

      {/* Global Search Dialog */}
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}