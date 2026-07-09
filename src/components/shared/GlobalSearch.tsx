'use client'

import { useShallow } from 'zustand/react/shallow'
import { useState, useMemo, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'
import { useQmsStore } from '@/lib/demo-store'
import { Search, FileText, Shield, AlertTriangle, AlertOctagon, ArrowLeftRight, ClipboardCheck, BarChart3, GraduationCap, Package, Truck, FlaskConical, FileSpreadsheet } from 'lucide-react'
import type { ActiveSection } from '@/types/qms'

const MODULE_ICONS: Record<string, any> = {
  document: FileText, capa: Shield, ncr: AlertTriangle, deviation: AlertOctagon,
  change_control: ArrowLeftRight, audit: ClipboardCheck, risk: BarChart3,
  training: GraduationCap, batch_record: Package, supplier: Truck,
  oos_oot: FlaskConical, form_instance: FileSpreadsheet,
}

const MODULE_LABELS: Record<string, string> = {
  document: 'Document', capa: 'CAPA', ncr: 'Non-Conformité', deviation: 'Déviation',
  change_control: 'Contrôle Changement', audit: 'Audit', risk: 'Risque',
  training: 'Formation', batch_record: 'Dossier de Lot', supplier: 'Fournisseur',
  oos_oot: 'OOS/OOT', form_instance: 'Instance Formulaire',
}

interface SearchResult {
  id: string
  type: string
  title: string
  subtitle: string
  number: string
}

export function GlobalSearch({ open, onClose, onNavigate }: { open: boolean; onClose: () => void; onNavigate: (section: ActiveSection) => void }) {
  const { profile } = useAuth()
  const orgId = profile?.organizationId || ''
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const documents = useQmsStore(useShallow(s => s.documents)).filter(d => d.organizationId === orgId)
  const capas = useQmsStore(useShallow(s => s.capas)).filter(c => c.organizationId === orgId)
  const ncrs = useQmsStore(useShallow(s => s.ncrs)).filter(n => n.organizationId === orgId)
  const deviations = useQmsStore(useShallow(s => s.deviations)).filter(d => d.organizationId === orgId)
  const changeControls = useQmsStore(useShallow(s => s.changeControls)).filter(c => c.organizationId === orgId)
  const audits = useQmsStore(useShallow(s => s.audits)).filter(a => a.organizationId === orgId)
  const risks = useQmsStore(useShallow(s => s.risks)).filter(r => r.organizationId === orgId)
  const trainings = useQmsStore(useShallow(s => s.trainings)).filter(t => t.organizationId === orgId)
  const batchRecords = useQmsStore(useShallow(s => s.batchRecords)).filter(b => b.organizationId === orgId)
  const suppliers = useQmsStore(useShallow(s => s.suppliers)).filter(s => s.organizationId === orgId)

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      setQuery('')
    }
  }, [open])

  const results = useMemo<SearchResult[]>(() => {
    if (!query || query.length < 2) return []
    const q = query.toLowerCase()
    const all: SearchResult[] = []

    for (const d of documents) {
      if (d.title.toLowerCase().includes(q) || d.documentNumber.toLowerCase().includes(q) || (d.code || '').toLowerCase().includes(q)) {
        all.push({ id: d.id, type: 'document', title: d.title, subtitle: d.docType, number: d.documentNumber })
      }
    }
    for (const c of capas) {
      if (c.title.toLowerCase().includes(q) || c.capaNumber.toLowerCase().includes(q)) {
        all.push({ id: c.id, type: 'capa', title: c.title, subtitle: c.capaType, number: c.capaNumber })
      }
    }
    for (const n of ncrs) {
      if (n.title.toLowerCase().includes(q) || n.ncrNumber.toLowerCase().includes(q)) {
        all.push({ id: n.id, type: n.isOosOot ? 'oos_oot' : 'ncr', title: n.title, subtitle: `${n.ncrType} · ${n.severity}`, number: n.ncrNumber })
      }
    }
    for (const d of deviations) {
      if (d.title.toLowerCase().includes(q) || d.devNumber.toLowerCase().includes(q)) {
        all.push({ id: d.id, type: 'deviation', title: d.title, subtitle: d.category, number: d.devNumber })
      }
    }
    for (const c of changeControls) {
      if (c.title.toLowerCase().includes(q) || c.ccNumber.toLowerCase().includes(q)) {
        all.push({ id: c.id, type: 'change_control', title: c.title, subtitle: c.category, number: c.ccNumber })
      }
    }
    for (const a of audits) {
      if (a.title.toLowerCase().includes(q) || a.auditNumber.toLowerCase().includes(q)) {
        all.push({ id: a.id, type: 'audit', title: a.title, subtitle: a.auditType, number: a.auditNumber })
      }
    }
    for (const r of risks) {
      if (r.title.toLowerCase().includes(q) || r.riskNumber.toLowerCase().includes(q)) {
        all.push({ id: r.id, type: 'risk', title: r.title, subtitle: `${r.category} · RPN ${r.rpn}`, number: r.riskNumber })
      }
    }
    for (const t of trainings) {
      if (t.title.toLowerCase().includes(q)) {
        all.push({ id: t.id, type: 'training', title: t.title, subtitle: t.trainingType, number: '' })
      }
    }
    for (const b of batchRecords) {
      if (b.lotNumber.toLowerCase().includes(q) || b.productName.toLowerCase().includes(q) || (b.productCode || '').toLowerCase().includes(q)) {
        all.push({ id: b.id, type: 'batch_record', title: `${b.lotNumber} — ${b.productName}`, subtitle: b.status, number: b.lotNumber })
      }
    }
    for (const s of suppliers) {
      if (s.name.toLowerCase().includes(q) || s.supplierCode.toLowerCase().includes(q)) {
        all.push({ id: s.id, type: 'supplier', title: s.name, subtitle: s.category, number: s.supplierCode })
      }
    }
    return all.slice(0, 50)
  }, [query, documents, capas, ncrs, deviations, changeControls, audits, risks, trainings, batchRecords, suppliers])

  const handleSelect = (r: SearchResult) => {
    const sectionMap: Record<string, ActiveSection> = {
      document: 'documents', capa: 'capa', ncr: 'ncr', oos_oot: 'oos-oot',
      deviation: 'deviations', change_control: 'change-control', audit: 'audits',
      risk: 'risks', training: 'training', batch_record: 'batch-records',
      supplier: 'suppliers', form_instance: 'forms',
    }
    onNavigate(sectionMap[r.type] || 'dashboard')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Search className="h-5 w-5" /> Recherche globale</DialogTitle>
        </DialogHeader>
        <Input ref={inputRef} placeholder="Rechercher dans tous les modules…" value={query} onChange={e => setQuery(e.target.value)} className="text-base" />
        <div className="max-h-96 overflow-y-auto">
          {query.length < 2 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Saisissez au moins 2 caractères pour rechercher</p>
          ) : results.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Aucun résultat pour "{query}"</p>
          ) : (
            <div className="space-y-1">
              {results.map(r => {
                const Icon = MODULE_ICONS[r.type] || FileText
                return (
                  <button
                    key={`${r.type}-${r.id}`}
                    onClick={() => handleSelect(r)}
                    className="w-full flex items-center gap-3 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-left"
                  >
                    <Icon className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{r.title}</div>
                      <div className="text-xs text-muted-foreground">{r.subtitle}</div>
                    </div>
                    <Badge variant="outline" className="text-xs">{MODULE_LABELS[r.type] || r.type}</Badge>
                    {r.number && <Badge variant="secondary" className="font-mono text-xs">{r.number}</Badge>}
                  </button>
                )
              })}
              {results.length === 50 && <p className="text-xs text-muted-foreground text-center py-2">50 résultats affichés (limité)</p>}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
