'use client'
// ============================================================
// Sidebar: Navigation QMS
// ============================================================

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Tableau de bord', icon: '📊' },
  { divider: true },
  { href: '/qms/documents', label: 'Documents', icon: '📄' },
  { href: '/qms/capas', label: 'CAPA', icon: '🔧' },
  { href: '/qms/non_conformances', label: 'Non-Conformites', icon: '⚠️' },
  { href: '/qms/deviations', label: 'Deviations', icon: '↗️' },
  { href: '/qms/change_controls', label: 'Change Controls', icon: '🔄' },
  { href: '/qms/audits', label: 'Audits', icon: '📋' },
  { href: '/qms/training', label: 'Formations', icon: '📚' },
  { href: '/qms/risks', label: 'Risques', icon: '🎯' },
  { href: '/qms/suppliers', label: 'Fournisseurs', icon: '🏢' },
  { href: '/qms/batch_records', label: 'Batch Records', icon: '📦' },
  { href: '/qms/form_templates', label: 'Modeles', icon: '📝' },
  { divider: true },
  { href: '/qms/form_instances', label: 'Formulaires', icon: '📑' },
  { href: '/api/audit', label: 'Audit Trail', icon: '🔍', external: true },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 h-screen sticky top-0 overflow-y-auto">
      <div className="p-4">
        <Link href="/dashboard" className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white text-sm font-bold flex items-center justify-center">
            Q
          </div>
          <span className="font-bold text-gray-900 dark:text-white text-sm">QMS ISO 13485</span>
        </Link>

        <nav className="space-y-1">
          {NAV_ITEMS.map((item, i) => {
            if ('divider' in item) {
              return <div key={i} className="border-t border-gray-100 dark:border-gray-800 my-2" />
            }

            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')

            if (item.external) {
              return (
                <a key={i} href={item.href} target="_blank"
                  className="flex items-center gap-3 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg">
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </a>
              )
            }

            return (
              <Link key={i} href={item.href}
                className={`flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-medium'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}>
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}