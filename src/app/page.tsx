'use client'

import { AppShell } from '@/components/layout/AppShell'
import { DashboardView } from '@/components/dashboard/DashboardView'
import { DocumentControlView, DocumentHierarchyView } from '@/components/modules/Documents'
import { CapaView, NcrView, DeviationView, ChangeControlView, AuditView, RiskView, TrainingView, BatchRecordView, SupplierView } from '@/components/modules'
import { ComplianceView } from '@/components/modules/Compliance'
import { UserManagementView, SettingsView, AuditTrailView, RecordTypesView, ReportsView } from '@/components/modules/Admin'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import type { ActiveSection } from '@/types/qms'

export default function Home() {
  return (
    <ErrorBoundary>
      <AppShell>
        {({ active, setActive }) => <MainContent active={active} setActive={setActive} />}
      </AppShell>
    </ErrorBoundary>
  )
}

function MainContent({ active, setActive }: { active: ActiveSection; setActive: (s: ActiveSection) => void }) {
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
    case 'oos-oot': return <NcrView />
    case 'forms': return <DocumentControlView />
    case 'record-types': return <RecordTypesView />
    case 'custom-records': return <RecordTypesView />
    case 'reports': return <ReportsView />
    case 'compliance': return <ComplianceView />
    case 'scheduled-reports': return <ReportsView />
    case 'audit-trail': return <AuditTrailView />
    case 'user-management': return <UserManagementView />
    case 'settings': return <SettingsView />
    default: return <DashboardView onNavigate={setActive} />
  }
}
