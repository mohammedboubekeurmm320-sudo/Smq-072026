'use client'
// ============================================================
// Sidebar: Navigation QMS — Updated with specialized routes
// ============================================================

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, FileText, ShieldAlert, AlertTriangle, GitBranch,
  ClipboardCheck, GraduationCap, Target, Building2, Package,
  FileQuestion, FileSpreadsheet, BarChart3, Gavel, Settings,
  Users, Clock, Bell, Shield, Layers
} from 'lucide-react'

const NAV_SECTIONS = [
  {
    label: 'Principal',
    items: [
      { href: '/dashboard', label: 'Tableau de bord', Icon: LayoutDashboard },
    ],
  },
  {
    label: 'Gestion Qualité',
    items: [
      { href: '/documents', label: 'Documents', Icon: FileText },
      { href: '/ncrs', label: 'Non-Conformités', Icon: ShieldAlert },
      { href: '/capas', label: 'CAPA', Icon: AlertTriangle },
      { href: '/deviations', label: 'Déviations', Icon: GitBranch },
      { href: '/change-controls', label: 'Contrôle des Changements', Icon: Layers },
      { href: '/audits', label: 'Audits', Icon: ClipboardCheck },
      { href: '/risks', label: 'Risques', Icon: Target },
      { href: '/training', label: 'Formations', Icon: GraduationCap },
    ],
  },
  {
    label: 'Opérations',
    items: [
      { href: '/batch-records', label: 'Dossiers de Lot', Icon: Package },
      { href: '/suppliers', label: 'Fournisseurs', Icon: Building2 },
      { href: '/oos-oot', label: 'OOS/OOT', Icon: FileQuestion },
      { href: '/forms', label: 'Formulaires', Icon: FileSpreadsheet },
    ],
  },
  {
    label: 'Analyse & Conformité',
    items: [
      { href: '/reports', label: 'Rapports', Icon: BarChart3 },
      { href: '/compliance', label: 'Conformité', Icon: Gavel },
      { href: '/audit', label: 'Piste d\'Audit', Icon: Shield },
    ],
  },
  {
    label: 'Administration',
    items: [
      { href: '/deadlines', label: 'Échéances', Icon: Clock },
      { href: '/notifications', label: 'Notifications', Icon: Bell },
      { href: '/admin/users', label: 'Utilisateurs', Icon: Users },
      { href: '/admin/settings', label: 'Paramètres', Icon: Settings },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 h-screen sticky top-0 overflow-y-auto flex flex-col">
      <div className="p-4 flex-shrink-0">
        <Link href="/dashboard" className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white text-sm font-bold flex items-center justify-center">
            Q
          </div>
          <span className="font-bold text-gray-900 dark:text-white text-sm">QMS ISO 13485</span>
        </Link>
      </div>

      <nav className="flex-1 px-3 pb-4 space-y-4 overflow-y-auto">
        {NAV_SECTIONS.map((section, si) => (
          <div key={si}>
            <p className="px-3 mb-1.5 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
                return (
                  <Link key={item.href} href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                      isActive
                        ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-medium'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}>
                    <item.Icon className="h-4 w-4 flex-shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  )
}