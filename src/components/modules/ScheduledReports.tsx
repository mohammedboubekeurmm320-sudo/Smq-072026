'use client'

import { useShallow } from 'zustand/react/shallow'
import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { useAuth } from '@/contexts/AuthContext'
import { useQmsStore } from '@/lib/demo-store'
import { useToast } from '@/hooks/use-toast'
import { CalendarClock, Plus, Trash2, Play, Pause, Edit, Clock, CheckCircle2, AlertCircle } from 'lucide-react'

const REPORT_TYPES = [
  { value: 'management_review', label: 'Revue de Direction' },
  { value: 'capa_summary', label: 'Synthèse CAPA' },
  { value: 'audit_summary', label: 'Synthèse Audits' },
  { value: 'compliance_overview', label: 'Vue Conformité' },
  { value: 'training_status', label: 'Statut Formations' },
  { value: 'risk_profile', label: 'Profil de Risques' },
]
const FORMATS = [{ value: 'pdf', label: 'PDF' }, { value: 'csv', label: 'CSV' }, { value: 'html', label: 'HTML' }]
const FREQUENCIES = [
  { value: 'daily', label: 'Quotidien' }, { value: 'weekly', label: 'Hebdomadaire' },
  { value: 'monthly', label: 'Mensuel' }, { value: 'quarterly', label: 'Trimestriel' },
]

export function ScheduledReportsView() {
  const { profile } = useAuth()
  const orgId = profile?.organizationId || ''
  const reports = useQmsStore(useShallow(s => s.scheduledReports)).filter(r => r.organizationId === orgId)
  const { toast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)

  const addReport = (data: any) => {
    const newReport = {
      id: 'sr_' + Math.random().toString(36).slice(2, 10),
      name: data.name, reportType: data.reportType, format: data.format,
      frequency: data.frequency, recipientsJson: JSON.stringify(data.recipients),
      filtersJson: JSON.stringify(data.filters || {}),
      status: 'active', organizationId: orgId,
      lastRunAt: null, nextRunAt: computeNextRun(data.frequency), lastResult: null,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }
    useQmsStore.setState(state => ({ scheduledReports: [newReport, ...state.scheduledReports] }))
  }

  const updateReport = (id: string, patch: any) => {
    useQmsStore.setState(state => ({
      scheduledReports: state.scheduledReports.map(r => r.id === id ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r),
    }))
  }

  const deleteReport = (id: string) => {
    useQmsStore.setState(state => ({ scheduledReports: state.scheduledReports.filter(r => r.id !== id) }))
  }

  const toggleReport = (r: any) => {
    const newStatus = r.status === 'active' ? 'paused' : 'active'
    updateReport(r.id, { status: newStatus })
    toast({ title: newStatus === 'active' ? 'Rapport repris' : 'Rapport mis en pause' })
  }

  const executeReport = (r: any) => {
    const result = `success: ${Math.floor(Math.random() * 100)} enregistrements`
    updateReport(r.id, {
      lastRunAt: new Date().toISOString(),
      nextRunAt: computeNextRun(r.frequency),
      lastResult: result,
    })
    toast({ title: 'Rapport exécuté', description: result })
  }

  const statusBadge = (s: string) => {
    const m: Record<string, string> = {
      active: 'bg-green-100 text-green-700 border-green-200',
      paused: 'bg-amber-100 text-amber-700 border-amber-200',
      completed: 'bg-blue-100 text-blue-700 border-blue-200',
      error: 'bg-red-100 text-red-700 border-red-200',
    }
    return m[s] || ''
  }

  const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><CalendarClock className="h-6 w-6 text-emerald-600" /> Rapports Planifiés</h1>
          <p className="text-sm text-muted-foreground">Génération automatique de rapports QMS (ISO 13485 §8.4)</p>
        </div>
        <Button onClick={() => { setEditing(null); setShowForm(true) }}><Plus className="h-4 w-4 mr-2" /> Nouveau rapport</Button>
      </div>

      {reports.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Aucun rapport planifié</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {reports.map(r => (
            <Card key={r.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-medium">{r.name}</h3>
                      <Badge variant="outline" className={`text-xs ${statusBadge(r.status)}`}>{r.status}</Badge>
                      <Badge variant="secondary" className="text-xs">{REPORT_TYPES.find(rt => rt.value === r.reportType)?.label || r.reportType}</Badge>
                      <Badge variant="outline" className="text-xs">{r.format.toUpperCase()}</Badge>
                      <Badge variant="outline" className="text-xs">{FREQUENCIES.find(f => f.value === r.frequency)?.label || r.frequency}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2 flex-wrap">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Dernière exécution: {fmtDate(r.lastRunAt)}</span>
                      <span className="flex items-center gap-1"><CalendarClock className="h-3 w-3" />Prochaine: {fmtDate(r.nextRunAt)}</span>
                    </div>
                    {r.lastResult && (
                      <div className="mt-2 text-xs">
                        <Badge variant="outline" className={r.lastResult.startsWith('success') ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}>
                          {r.lastResult.startsWith('success') ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <AlertCircle className="h-3 w-3 mr-1" />}
                          {r.lastResult}
                        </Badge>
                      </div>
                    )}
                    {(() => {
                      try {
                        const recipients = JSON.parse(r.recipientsJson || '[]')
                        if (recipients.length > 0) return <div className="mt-1 text-xs text-muted-foreground">Destinataires: {recipients.join(', ')}</div>
                      } catch {}
                      return null
                    })()}
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => executeReport(r)} title="Exécuter maintenant"><Play className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => toggleReport(r)} title={r.status === 'active' ? 'Mettre en pause' : 'Reprendre'}>
                      {r.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setEditing(r); setShowForm(true) }}><Edit className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => { if (confirm('Supprimer ?')) deleteReport(r.id) }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <ScheduledReportForm
          report={editing}
          onClose={() => setShowForm(false)}
          onSave={(data) => {
            if (editing) { updateReport(editing.id, data); toast({ title: 'Rapport mis à jour' }) }
            else { addReport(data); toast({ title: 'Rapport créé' }) }
            setShowForm(false)
          }}
        />
      )}
    </div>
  )
}

function ScheduledReportForm({ report, onClose, onSave }: any) {
  const [form, setForm] = useState({
    name: report?.name || '',
    reportType: report?.reportType || 'capa_summary',
    format: report?.format || 'pdf',
    frequency: report?.frequency || 'monthly',
    recipients: report ? (() => { try { return JSON.parse(report.recipientsJson || '[]') } catch { return [] } })() : [] as string[],
    newRecipient: '',
  })

  const handleSave = () => {
    if (!form.name) return
    onSave({ ...form, recipients: form.recipients })
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>{report ? 'Modifier' : 'Nouveau'} rapport planifié</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div><Label>Nom *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={form.reportType} onValueChange={v => setForm({ ...form, reportType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{REPORT_TYPES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Format</Label>
              <Select value={form.format} onValueChange={v => setForm({ ...form, format: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FORMATS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fréquence</Label>
              <Select value={form.frequency} onValueChange={v => setForm({ ...form, frequency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FREQUENCIES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Destinataires</Label>
            <div className="flex gap-2 mt-1">
              <Input type="email" placeholder="email@entreprise.fr" value={form.newRecipient} onChange={e => setForm({ ...form, newRecipient: e.target.value })} />
              <Button onClick={() => { if (form.newRecipient) { setForm({ ...form, recipients: [...form.recipients, form.newRecipient], newRecipient: '' }) } }}>Ajouter</Button>
            </div>
            {form.recipients.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {form.recipients.map((r: string, i: number) => (
                  <Badge key={i} variant="secondary" className="text-xs">{r} <button onClick={() => setForm({ ...form, recipients: form.recipients.filter((_: string, j: number) => j !== i) })} className="ml-1">×</button></Badge>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSave}>{report ? 'Mettre à jour' : 'Créer'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function computeNextRun(frequency: string): string {
  const now = new Date()
  switch (frequency) {
    case 'daily': return new Date(now.getTime() + 24 * 3600 * 1000).toISOString()
    case 'weekly': return new Date(now.getTime() + 7 * 24 * 3600 * 1000).toISOString()
    case 'monthly': return new Date(now.getTime() + 30 * 24 * 3600 * 1000).toISOString()
    case 'quarterly': return new Date(now.getTime() + 90 * 24 * 3600 * 1000).toISOString()
    default: return new Date(now.getTime() + 30 * 24 * 3600 * 1000).toISOString()
  }
}
