'use client'

import { useState, useEffect } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { DashboardView } from '@/components/dashboard/DashboardView'
import { DocumentControlView, DocumentHierarchyView } from '@/components/modules/Documents'
import { CapaView, NcrView, DeviationView, ChangeControlView, AuditView, RiskView, TrainingView, BatchRecordView, SupplierView } from '@/components/modules'
import { OosOotView } from '@/components/modules/OosOot'
import { FormsView } from '@/components/modules/Forms'
import { ComplianceView } from '@/components/modules/Compliance'
import { UserManagementView, SettingsView, AuditTrailView, RecordTypesView, ReportsView } from '@/components/modules/Admin'
import { ScheduledReportsView } from '@/components/modules/ScheduledReports'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { GlobalSearch } from '@/components/shared/GlobalSearch'
import type { ActiveSection } from '@/types/qms'

export default function Home() {
  return (
    <ErrorBoundary>
      <AppShell>
        {({ active, setActive }) => (
          <MainContent active={active} setActive={setActive} />
        )}
      </AppShell>
    </ErrorBoundary>
  )
}

function MainContent({ active, setActive }: { active: ActiveSection; setActive: (s: ActiveSection) => void }) {
  const [searchOpen, setSearchOpen] = useState(false)

  // Global search shortcut (Ctrl+K)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const renderContent = () => {
    switch (active) {
      case 'dashboard': return <DashboardView onNavigate={setActive} />
      case 'documents': return <DocumentControlView />
      case 'document-hierarchy': return <DocumentHierarchyView />
      case 'ncr': return <NcrView />
      case 'capa': return <CapaView />
      case 'deviations': return <DeviationView />
      case 'change-control': return <ChangeControlView />
      case 'audits': return <AuditView />
      case 'risks': return <RiskView />
      case 'training': return <TrainingView />
      case 'batch-records': return <BatchRecordView />
      case 'suppliers': return <SupplierView />
      case 'oos-oot': return <OosOotView />
      case 'forms': return <FormsView />
      case 'record-types': return <RecordTypesView />
      case 'custom-records': return <RecordTypesView />
      case 'reports': return <ReportsView />
      case 'compliance': return <ComplianceView />
      case 'scheduled-reports': return <ScheduledReportsView />
      case 'audit-trail': return <AuditTrailView />
      case 'user-management': return <UserManagementView />
      case 'settings': return <SettingsView />
      default: return <DashboardView onNavigate={setActive} />
    }
  }

  return (
    <>
      {renderContent()}
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} onNavigate={setActive} />
    </>
  )
}
