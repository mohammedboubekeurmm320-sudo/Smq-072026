'use client'

import { useState, useMemo, type ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Search, Pencil, Trash2, ArrowRight, FileText } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useRecordWorkflow } from '@/hooks/useRecordWorkflow'
import { ElectronicSignatureModal } from './ElectronicSignatureModal'
import { RecordLinkPanel } from './RecordLinkPanel'

export interface FieldDef {
  name: string
  label: string
  type?: 'text' | 'number' | 'date' | 'textarea' | 'select' | 'badge'
  options?: { value: string; label: string }[]
  required?: boolean
  hideInList?: boolean
  hideInForm?: boolean
  badgeColors?: Record<string, string>
}

export interface ModuleConfig<T> {
  title: string
  subtitle: string
  recordTypeSlug: string  // for record_links
  icon: any
  fields: FieldDef[]
  numberPrefix: string
  numberField: string  // e.g. 'capaNumber'
  statusField?: string
  createPermission?: string
  editPermission?: string
  deletePermission?: string
  approvePermission?: string
  statusFilters?: { value: string; label: string }[]
  typeFilters?: { field: string; label: string; options: { value: string; label: string }[] }
  labelForRecord?: (r: T) => string  // for record_links display
  customDetailTabs?: (record: T) => { id: string; label: string; content: ReactNode }[]
  customFormFields?: (record: T | null, update: (patch: any) => void) => ReactNode
}

interface Props<T extends { id: string; organizationId: string }> {
  config: ModuleConfig<T>
  records: T[]
  onCreate: (data: Partial<T>) => T | Promise<T>
  onUpdate: (id: string, patch: Partial<T>) => void | Promise<void>
  onDelete: (id: string) => void | Promise<void>
  onTransition?: (id: string, target: string, signatureHash?: string) => { ok: boolean; error?: string } | Promise<{ ok: boolean; error?: string }>
}

export function ModuleShell<T extends { id: string; organizationId: string; [k: string]: any }>({
  config, records, onCreate, onUpdate, onDelete, onTransition,
}: Props<T>) {
  const { hasPermission, profile } = useAuth()
  const { getNextStatuses, canTransition, isESigRequired, isTerminal } = useRecordWorkflow()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [editing, setEditing] = useState<T | null>(null)
  const [viewing, setViewing] = useState<T | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [pendingTransition, setPendingTransition] = useState<{ id: string; target: string } | null>(null)

  const canCreate = !config.createPermission || hasPermission(config.createPermission as any)
  const canEdit = !config.editPermission || hasPermission(config.editPermission as any)
  const canDelete = !config.deletePermission || hasPermission(config.deletePermission as any)

  const filtered = useMemo(() => {
    let list = records
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(r =>
        Object.values(r).some(v => String(v || '').toLowerCase().includes(q))
      )
    }
    if (statusFilter !== 'ALL' && config.statusField) {
      list = list.filter(r => r[config.statusField!] === statusFilter)
    }
    if (typeFilter !== 'ALL' && config.typeFilters) {
      list = list.filter(r => r[config.typeFilters.field] === typeFilter)
    }
    return list
  }, [records, search, statusFilter, typeFilter, config.statusField, config.typeFilters])

  const handleAdvance = (record: T, target: string) => {
    if (!profile || !config.statusField) return
    const check = canTransition(config.recordTypeSlug, record[config.statusField], target, profile.role)
    if (!check.allowed) {
      alert(check.reason)
      return
    }
    if (check.requiresESignature) {
      setPendingTransition({ id: record.id, target })
    } else {
      onTransition?.(record.id, target)
      setViewing(null)
    }
  }

  const handleSigConfirm = (_pwd: string, hash: string) => {
    if (!pendingTransition) return
    onTransition?.(pendingTransition.id, pendingTransition.target, hash)
    setPendingTransition(null)
    setViewing(null)
  }

  const statusBadgeClass = (status: string) => {
    const map: Record<string, string> = {
      Open: 'bg-red-100 text-red-700 border-red-200',
      'Under Investigation': 'bg-amber-100 text-amber-700 border-amber-200',
      Investigation: 'bg-amber-100 text-amber-700 border-amber-200',
      Implementation: 'bg-blue-100 text-blue-700 border-blue-200',
      'In Progress': 'bg-blue-100 text-blue-700 border-blue-200',
      'Pending Disposition': 'bg-amber-100 text-amber-700 border-amber-200',
      'Pending QA Review': 'bg-amber-100 text-amber-700 border-amber-200',
      'Effectiveness Check': 'bg-violet-100 text-violet-700 border-violet-200',
      Closed: 'bg-green-100 text-green-700 border-green-200',
      Completed: 'bg-green-100 text-green-700 border-green-200',
      Approved: 'bg-green-100 text-green-700 border-green-200',
      Effective: 'bg-green-100 text-green-700 border-green-200',
      Released: 'bg-green-100 text-green-700 border-green-200',
      Qualified: 'bg-green-100 text-green-700 border-green-200',
      Mitigated: 'bg-blue-100 text-blue-700 border-blue-200',
      Accepted: 'bg-blue-100 text-blue-700 border-blue-200',
      Conditional: 'bg-amber-100 text-amber-700 border-amber-200',
      'Under Evaluation': 'bg-amber-100 text-amber-700 border-amber-200',
      Disqualified: 'bg-red-100 text-red-700 border-red-200',
      Rejected: 'bg-red-100 text-red-700 border-red-200',
      Obsolete: 'bg-red-100 text-red-700 border-red-200',
      Draft: 'bg-slate-100 text-slate-700 border-slate-200',
      'Under Review': 'bg-amber-100 text-amber-700 border-amber-200',
      Planned: 'bg-slate-100 text-slate-700 border-slate-200',
      Requested: 'bg-slate-100 text-slate-700 border-slate-200',
      Quarantine: 'bg-orange-100 text-orange-700 border-orange-200',
      Overdue: 'bg-red-100 text-red-700 border-red-200',
    }
    return map[status] || 'bg-slate-100 text-slate-700 border-slate-200'
  }

  const fmtDate = (d?: string | Date | null) => {
    if (!d) return '—'
    try { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) } catch { return '—' }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <config.icon className="h-6 w-6 text-emerald-600" />
            {config.title}
          </h1>
          <p className="text-sm text-muted-foreground">{config.subtitle}</p>
        </div>
        {canCreate && (
          <Button onClick={() => { setEditing(null); setShowForm(true) }}>
            <Plus className="h-4 w-4 mr-2" /> {config.title.includes('CAPA') ? 'Nouvelle CAPA' : 'Nouveau'}
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
            </div>
            {config.statusFilters && (
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48"><SelectValue placeholder="Statut" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tous statuts</SelectItem>
                  {config.statusFilters.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {config.typeFilters && (
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full md:w-48"><SelectValue placeholder={config.typeFilters.label} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tous</SelectItem>
                  {config.typeFilters.options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* List */}
      {filtered.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Aucun enregistrement</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map(r => (
            <Card key={r.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setViewing(r)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {config.numberField && (
                        <Badge variant="outline" className="font-mono text-xs">{r[config.numberField]}</Badge>
                      )}
                      {config.statusField && (
                        <Badge variant="outline" className={`text-xs ${statusBadgeClass(r[config.statusField])}`}>{r[config.statusField]}</Badge>
                      )}
                      {config.fields.filter(f => !f.hideInList && f.type === 'badge' && r[f.name]).slice(0, 3).map(f => (
                        <Badge key={f.name} variant="secondary" className="text-xs">{f.options?.find(o => o.value === r[f.name])?.label || r[f.name]}</Badge>
                      ))}
                    </div>
                    <h3 className="font-medium truncate">{r.title || r.name || r.productName || '—'}</h3>
                    {r.description && <p className="text-sm text-muted-foreground line-clamp-1">{r.description}</p>}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2 flex-wrap">
                      {config.fields.filter(f => !f.hideInList && f.type !== 'badge').slice(0, 4).map(f => (
                        r[f.name] ? <span key={f.name}>{f.label}: {f.type === 'date' ? fmtDate(r[f.name]) : String(r[f.name])}</span> : null
                      ))}
                      {r.dueDate && <span>Échéance: {fmtDate(r.dueDate)}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    {canEdit && <Button size="sm" variant="ghost" onClick={() => { setEditing(r); setShowForm(true) }}><Pencil className="h-4 w-4" /></Button>}
                    {canDelete && <Button size="sm" variant="ghost" onClick={() => { if (confirm('Supprimer ?')) onDelete(r.id) }}><Trash2 className="h-4 w-4 text-red-500" /></Button>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* View dialog */}
      {viewing && !showForm && (
        <ViewDialog
          record={viewing}
          config={config}
          onClose={() => setViewing(null)}
          onEdit={() => { setEditing(viewing); setViewing(null); setShowForm(true) }}
          onAdvance={handleAdvance}
          getNextStatuses={(status) => config.statusField ? getNextStatuses(config.recordTypeSlug, status) : []}
          isTerminal={(status) => isTerminal(config.recordTypeSlug, status)}
          isESigRequired={(target) => isESigRequired(config.recordTypeSlug, target)}
          canEdit={canEdit}
          statusBadgeClass={statusBadgeClass}
          fmtDate={fmtDate}
        />
      )}

      {/* Form dialog */}
      {showForm && (
        <FormDialog
          record={editing}
          config={config}
          onClose={() => setShowForm(false)}
          onSave={(data) => {
            if (editing) onUpdate(editing.id, data)
            else onCreate(data)
            setShowForm(false)
          }}
          fmtDate={fmtDate}
        />
      )}

      {/* E-signature modal */}
      {pendingTransition && (
        <ElectronicSignatureModal
          open
          title="Confirmer la transition"
          description={`Vous êtes sur le point de passer le statut à "${pendingTransition.target}". Cette action nécessite votre signature électronique.`}
          onConfirm={handleSigConfirm}
          onCancel={() => setPendingTransition(null)}
        />
      )}
    </div>
  )
}

function ViewDialog<T extends { id: string; [k: string]: any }>({
  record, config, onClose, onEdit, onAdvance, getNextStatuses, isTerminal, isESigRequired, canEdit, statusBadgeClass, fmtDate,
}: any) {
  const nextStatuses = config.statusField ? getNextStatuses(record[config.statusField]) : []
  const label = config.labelForRecord ? config.labelForRecord(record) : (record[config.numberField] + ' — ' + (record.title || record.name || ''))
  const customTabs = config.customDetailTabs ? config.customDetailTabs(record) : []

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2 flex-wrap">
            <config.icon className="h-5 w-5" />
            {record.title || record.name || record.productName || 'Détail'}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2 flex-wrap mt-2">
            {config.numberField && <Badge variant="outline" className="font-mono">{record[config.numberField]}</Badge>}
            {config.statusField && <Badge variant="outline" className={statusBadgeClass(record[config.statusField])}>{record[config.statusField]}</Badge>}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            {customTabs.map((t: any) => <TabsTrigger key={t.id} value={t.id}>{t.label}</TabsTrigger>)}
            <TabsTrigger value="links">Liens</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {config.fields.map((f: FieldDef) => (
                <div key={f.name} className={f.type === 'textarea' ? 'col-span-2' : ''}>
                  <span className="text-muted-foreground">{f.label}:</span>{' '}
                  {f.type === 'date' ? fmtDate(record[f.name]) : f.type === 'badge' ? (
                    <Badge variant="secondary" className="ml-1 text-xs">{f.options?.find((o: any) => o.value === record[f.name])?.label || record[f.name] || '—'}</Badge>
                  ) : record[f.name] ? String(record[f.name]) : '—'}
                </div>
              ))}
              <div><span className="text-muted-foreground">Créé le:</span> {fmtDate(record.createdAt)}</div>
              <div><span className="text-muted-foreground">Mis à jour le:</span> {fmtDate(record.updatedAt)}</div>
            </div>

            {nextStatuses.length > 0 && (
              <div className="mt-4 p-3 border rounded-lg bg-slate-50 dark:bg-slate-900">
                <div className="text-sm font-medium mb-2 flex items-center gap-2"><ArrowRight className="h-4 w-4" /> Transitions disponibles</div>
                <div className="flex flex-wrap gap-2">
                  {nextStatuses.map((s: string) => (
                    <Button key={s} size="sm" variant="outline" onClick={() => onAdvance(record, s)}>
                      {s}
                      {isESigRequired(s) && <Badge variant="secondary" className="ml-1 text-xs">E-sig</Badge>}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {config.statusField && isTerminal(record[config.statusField]) && (
              <div className="mt-4 p-3 border rounded-lg bg-green-50 text-green-700 text-sm">
                Statut terminal atteint — aucune transition possible
              </div>
            )}
          </TabsContent>

          {customTabs.map((t: any) => (
            <TabsContent key={t.id} value={t.id} className="mt-4">{t.content}</TabsContent>
          ))}

          <TabsContent value="links" className="mt-4">
            <RecordLinkPanel recordId={record.id} recordType={config.recordTypeSlug} recordLabel={label} />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          {canEdit && <Button onClick={onEdit}><Pencil className="h-4 w-4 mr-2" /> Modifier</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function FormDialog<T extends { [k: string]: any }>({
  record, config, onClose, onSave, fmtDate,
}: any) {
  const [form, setForm] = useState<Record<string, any>>(() => {
    const init: Record<string, any> = {}
    for (const f of config.fields) {
      init[f.name] = record?.[f.name] ?? (f.type === 'date' ? '' : f.type === 'number' ? '' : '')
    }
    init.status = record?.status || config.statusFilters?.[0]?.value || 'Open'
    return init
  })
  const [error, setError] = useState('')

  const update = (patch: any) => setForm((f: any) => ({ ...f, ...patch }))

  const handleSave = () => {
    setError('')
    for (const f of config.fields) {
      if (f.required && !form[f.name]) {
        setError(`${f.label} requis`)
        return
      }
    }
    onSave(form)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{record ? 'Modifier' : 'Créer'} — {config.title}</DialogTitle>
          <DialogDescription>Renseignez les informations de l'enregistrement</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          {config.fields.filter((f: FieldDef) => !f.hideInForm).map((f: FieldDef) => (
            <div key={f.name} className={f.type === 'textarea' ? '' : 'grid grid-cols-2 gap-3'}>
              <div className={f.type === 'textarea' ? '' : ''}>
                <label className="text-sm font-medium">{f.label}{f.required && ' *'}</label>
                {f.type === 'textarea' ? (
                  <textarea
                    className="mt-1 w-full px-3 py-2 border rounded-md bg-background text-sm min-h-[80px]"
                    value={form[f.name] || ''}
                    onChange={e => update({ [f.name]: e.target.value })}
                  />
                ) : f.type === 'select' ? (
                  <Select value={form[f.name]} onValueChange={v => update({ [f.name]: v })}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {f.options?.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : f.type === 'date' ? (
                  <Input type="date" className="mt-1" value={form[f.name] ? String(form[f.name]).split('T')[0] : ''} onChange={e => update({ [f.name]: e.target.value })} />
                ) : f.type === 'number' ? (
                  <Input type="number" className="mt-1" value={form[f.name] || ''} onChange={e => update({ [f.name]: e.target.value === '' ? '' : Number(e.target.value) })} />
                ) : (
                  <Input className="mt-1" value={form[f.name] || ''} onChange={e => update({ [f.name]: e.target.value })} />
                )}
              </div>
            </div>
          ))}
          {config.customFormFields && config.customFormFields(record, update)}
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSave}>{record ? 'Mettre à jour' : 'Créer'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
