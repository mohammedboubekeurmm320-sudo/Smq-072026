'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQmsEntity, useAuditTrail } from '@/hooks/useQmsQuery'
import { useRecordWorkflow } from '@/hooks/useRecordWorkflow'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { ElectronicSignatureModal } from '@/components/shared/ElectronicSignatureModal'
import { ArrowLeft, Pencil, Save, X, Trash2, Loader2, ChevronRight, Check, Lock, History, Link2, FileText } from 'lucide-react'
import { getEntityConfig } from '@/lib/qms-entity-map'
import { getStatusColor } from '@/lib/status-colors'
import { getRecordTypeFromSlug } from '@/lib/status-flows'
import { useAuth } from '@/contexts/AuthContext'
import { apiGet, apiPost, apiDelete } from '@/lib/api-client'
import { RECORD_LINK_TYPES, type RecordLinkType } from '@/types/qms'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

const HIDDEN_COLS = new Set([
  'id', 'organization_id', 'organizationId', 'created_at', 'updated_at',
  'createdAt', 'updatedAt', 'password_hash', 'created_by', 'signature_hash',
  'signed_at', 'signed_by', 'transition_reason',
])

export default function EntityDetailPage() {
  const params = useParams()
  const router = useRouter()
  const entity = params.entity as string
  const id = params.id as string
  const entityConfig = getEntityConfig(entity)
  const { profile } = useAuth()
  const { getById, update, remove, isUpdating, isDeleting } = useQmsEntity(entity)
  const auditTrail = useAuditTrail({ entity: entityConfig?.table, recordId: id, limit: 50 })

  const [record, setRecord] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState<Record<string, any>>({})

  // Workflow state
  const [showESigModal, setShowESigModal] = useState(false)
  const [pendingTransition, setPendingTransition] = useState<string | null>(null)

  // Record links state
  const [links, setLinks] = useState<any[]>([])
  const [linksLoading, setLinksLoading] = useState(false)
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [linkForm, setLinkForm] = useState({ targetType: '', targetId: '', linkType: 'related' as RecordLinkType, description: '' })
  const [availableTargets, setAvailableTargets] = useState<{ id: string; label: string }[]>([])

  // Workflow hook — always called (hooks can't be conditional)
  const currentStatus = record?.status || 'Open'
  const workflow = useRecordWorkflow(entity, id, currentStatus)

  useEffect(() => {
    if (!entityConfig || !id) return
    setLoading(true)
    setError('')
    getById(id)
      .then(data => { setRecord(data); setForm({ ...data }) })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [entity, id])

  // Load record links
  useEffect(() => {
    if (!id || !entityConfig) return
    const recordType = getRecordTypeFromSlug(entity)
    setLinksLoading(true)
    apiGet<any[]>(`/api/qms/record_links?source_record_type=${recordType}&limit=100`)
      .then((res: any) => {
        const all = (res.items || res || []) as any[]
        setLinks(all.filter((l: any) =>
          (l.source_record_id === id && l.source_record_type === recordType) ||
          (l.target_record_id === id && l.target_record_type === recordType)
        ))
      })
      .catch(() => setLinks([]))
      .finally(() => setLinksLoading(false))
  }, [id, entity])

  if (!entityConfig) return <div className="p-6">Entité non reconnue : {entity}</div>

  const handleSave = async () => {
    try {
      const { id: _id, created_at: _ca, updated_at: _ua, created_by: _cb, ...body } = form
      await update(id, body)
      setEditMode(false)
      const refreshed = await getById(id)
      setRecord(refreshed)
      setForm({ ...refreshed })
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Supprimer cet enregistrement ?')) return
    try {
      await remove(id)
      router.push(`/qms/${entity}`)
    } catch (err: any) {
      setError(err.message)
    }
  }

  // Workflow: initiate transition
  const handleTransitionClick = (targetStatus: string) => {
    const check = workflow.checkTransition(targetStatus)
    if (!check.allowed) {
      setError(check.reason || 'Transition non autorisée')
      return
    }
    if (check.requiresESignature) {
      setPendingTransition(targetStatus)
      setShowESigModal(true)
    } else {
      performTransition(targetStatus)
    }
  }

  const performTransition = async (targetStatus: string, signatureHash?: string) => {
    try {
      await workflow.performTransition(targetStatus, signatureHash)
      const refreshed = await getById(id)
      setRecord(refreshed)
      setForm({ ...refreshed })
      setError('')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setShowESigModal(false)
      setPendingTransition(null)
    }
  }

  // Record links: load targets for selected type
  const handleLinkTypeChange = async (targetType: string) => {
    setLinkForm({ ...linkForm, targetType, targetId: '' })
    if (!targetType) { setAvailableTargets([]); return }
    try {
      const res = await apiGet<any>(`/api/qms/${targetType}?limit=100`)
      const items = res.items || []
      const cfg = getEntityConfig(targetType)
      setAvailableTargets(items.map((r: any) => ({
        id: r.id,
        label: `${r[cfg?.numberField || 'title'] || r.title || r.id} — ${r.title || ''}`.slice(0, 80),
      })))
    } catch { setAvailableTargets([]) }
  }

  const handleCreateLink = async () => {
    if (!linkForm.targetType || !linkForm.targetId) return
    const recordType = getRecordTypeFromSlug(entity)
    try {
      await apiPost('/api/qms/record_links', {
        source_record_id: id,
        source_record_type: recordType,
        target_record_id: linkForm.targetId,
        target_record_type: linkForm.targetType,
        link_type: linkForm.linkType,
        description: linkForm.description || undefined,
      })
      setShowLinkDialog(false)
      setLinkForm({ targetType: '', targetId: '', linkType: 'related', description: '' })
      // Reload links
      const res = await apiGet<any>(`/api/qms/record_links?limit=100`)
      const all = (res.items || res || []) as any[]
      setLinks(all.filter((l: any) =>
        (l.source_record_id === id && l.source_record_type === recordType) ||
        (l.target_record_id === id && l.target_record_type === recordType)
      ))
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleDeleteLink = async (linkId: string) => {
    try {
      await apiDelete(`/api/qms/record_links/${linkId}?hard=true`)
      setLinks(prev => prev.filter(l => l.id !== linkId))
    } catch { /* ignore */ }
  }

  const fmtDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) } catch { return '-' }
  }

  const fmtLabel = (key: string) =>
    key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())

  if (loading) {
    return <div className="space-y-3 max-w-5xl mx-auto p-6">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
  }

  if (error && !record) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <button onClick={() => router.push(`/qms/${entity}`)} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4">
          <ArrowLeft className="h-3 w-3" /> {entityConfig.labelPlural}
        </button>
        <div className="p-6 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
          {error}
        </div>
      </div>
    )
  }

  const fields = Object.entries(record).filter(([key]) => !HIDDEN_COLS.has(key))
  const statusBadge = (status: string) => (
    <Badge variant="outline" className={`text-xs ${getStatusColor(status)}`}>
      {status}
    </Badge>
  )

  const nextStatuses = workflow.getNextStatuses()
  const flowSteps = workflow.getFlowSteps()

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <button onClick={() => router.push(`/qms/${entity}`)} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> {entityConfig.labelPlural}
          </button>
          <h1 className="text-2xl font-bold mt-1">
            {record[entityConfig.numberField] || record.title || record.name || entityConfig.label}
          </h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {entityConfig.statusField && record[entityConfig.statusField] && statusBadge(record[entityConfig.statusField])}
            <span className="text-xs text-muted-foreground">
              Créé le {fmtDate(record.created_at || record.createdAt)}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {!editMode ? (
            <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
              <Pencil className="h-4 w-4 mr-2" /> Modifier
            </Button>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => { setEditMode(false); setForm({ ...record }); setError('') }}>
                <X className="h-4 w-4 mr-2" /> Annuler
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isUpdating}>
                {isUpdating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Sauvegarder
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={handleDelete} disabled={isDeleting}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {error && record && (
        <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview" className="gap-1.5"><FileText className="h-4 w-4" /> Vue d&apos;ensemble</TabsTrigger>
          <TabsTrigger value="workflow" className="gap-1.5"><ChevronRight className="h-4 w-4" /> Workflow</TabsTrigger>
          <TabsTrigger value="links" className="gap-1.5"><Link2 className="h-4 w-4" /> Liens <Badge variant="secondary" className="ml-1 text-xs">{links.length}</Badge></TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5"><History className="h-4 w-4" /> Piste d&apos;audit</TabsTrigger>
        </TabsList>

        {/* ─── Overview Tab ─── */}
        <TabsContent value="overview">
          <Card>
            <CardHeader><CardTitle className="text-lg">Détails</CardTitle></CardHeader>
            <CardContent>
              <div className="divide-y">
                {fields.map(([key, value]) => (
                  <div key={key} className="flex py-3 gap-4">
                    <div className="w-1/3 text-sm font-medium text-muted-foreground shrink-0">
                      {fmtLabel(key)}
                    </div>
                    <div className="w-2/3 min-w-0">
                      {editMode ? (
                        key === 'description' || (typeof value === 'string' && value.length > 100) ? (
                          <Textarea value={form[key] ?? ''} onChange={e => setForm({ ...form, [key]: e.target.value })} rows={3} className="text-sm" />
                        ) : (
                          <Input value={form[key] ?? ''} onChange={e => setForm({ ...form, [key]: e.target.value })} className="h-8 text-sm" />
                        )
                      ) : (
                        key === 'status' || key === entityConfig.statusField ? (
                          statusBadge(String(value))
                        ) : value === null || value === undefined ? (
                          <span className="text-muted-foreground">—</span>
                        ) : typeof value === 'boolean' ? (
                          <span>{value ? 'Oui' : 'Non'}</span>
                        ) : String(value).length > 200 ? (
                          <p className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-md">{String(value)}</p>
                        ) : (
                          <span className="text-sm">{String(value)}</span>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Workflow Tab ─── */}
        <TabsContent value="workflow">
          <div className="space-y-6">
            {/* Flow visualization */}
            <Card>
              <CardHeader><CardTitle className="text-lg">Cycle de vie</CardTitle></CardHeader>
              <CardContent>
                {flowSteps.length > 0 ? (
                  <div className="flex items-center gap-1 flex-wrap">
                    {flowSteps.map((step, idx) => (
                      <div key={step.status} className="flex items-center gap-1">
                        <div className={`
                          px-3 py-1.5 rounded-full text-xs font-medium border
                          ${step.isCurrent
                            ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/20'
                            : step.isCompleted
                              ? 'border-green-300 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400'
                              : 'border-muted bg-muted/50 text-muted-foreground'
                          }
                        `}>
                          {step.isCompleted && <Check className="h-3 w-3 inline mr-1" />}
                          {step.isTerminal && step.requiresESig && <Lock className="h-3 w-3 inline mr-1" />}
                          {step.status}
                        </div>
                        {idx < flowSteps.length - 1 && (
                          <ChevronRight className="h-3 w-3 text-muted-foreground mx-0.5" />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Aucun workflow défini pour cette entité</p>
                )}
              </CardContent>
            </Card>

            {/* Available transitions */}
            {nextStatuses.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-lg">Transitions disponibles</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {nextStatuses.map(target => {
                      const check = workflow.checkTransition(target)
                      const needsESig = check?.requiresESignature
                      return (
                        <Button
                          key={target}
                          variant={needsESig ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleTransitionClick(target)}
                          disabled={workflow.isTransitioning}
                          className="gap-1.5"
                        >
                          {needsESig && <Lock className="h-3 w-3" />}
                          {check?.allowed ? `Passer à "${target}"` : target}
                          {workflow.isTransitioning && <Loader2 className="h-3 w-3 animate-spin" />}
                        </Button>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {workflow.isTerminal() && (
              <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                Cet enregistrement est dans un état terminal. Aucune transition supplémentaire n&apos;est possible.
              </div>
            )}
          </div>
        </TabsContent>

        {/* ─── Links Tab ─── */}
        <TabsContent value="links">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Enregistrements liés</CardTitle>
                <Button size="sm" variant="outline" onClick={() => setShowLinkDialog(true)}>
                  <Link2 className="h-4 w-4 mr-1" /> Lier un enregistrement
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {linksLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : links.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun enregistrement lié</p>
              ) : (
                <div className="space-y-2">
                  {links.map((l: any) => {
                    const outgoing = l.source_record_id === id
                    const otherType = outgoing ? l.target_record_type : l.source_record_type
                    const otherId = outgoing ? l.target_record_id : l.source_record_id
                    const linkTypeDef = RECORD_LINK_TYPES.find(r => r.value === l.link_type)
                    return (
                      <div key={l.id} className="flex items-center gap-2 p-3 border rounded-lg text-sm hover:bg-muted/30 transition-colors">
                        <Badge variant="outline" className="text-xs shrink-0">{linkTypeDef?.label || l.link_type}</Badge>
                        <span className="text-xs text-muted-foreground">{outgoing ? '→' : '←'}</span>
                        <Badge variant="secondary" className="text-xs">{otherType}</Badge>
                        <button
                          onClick={() => router.push(`/qms/${otherType === 'capa' ? 'capas' : otherType === 'ncr' ? 'ncrs' : otherType === 'change_control' ? 'change-controls' : otherType === 'batch_record' ? 'batch-records' : otherType + 's'}/${otherId}`)}
                          className="text-sm hover:underline truncate flex-1"
                        >
                          {otherId.slice(0, 12)}…
                        </button>
                        {l.description && <span className="text-xs text-muted-foreground truncate max-w-48">{l.description}</span>}
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteLink(l.id)} className="shrink-0">
                          <Trash2 className="h-3 w-3 text-red-500" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Audit Tab ─── */}
        <TabsContent value="audit">
          <Card>
            <CardHeader><CardTitle className="text-lg">Piste d&apos;audit</CardTitle></CardHeader>
            <CardContent>
              {auditTrail.isLoading ? (
                <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
              ) : !auditTrail.data || (Array.isArray(auditTrail.data) && auditTrail.data.length === 0) ? (
                <p className="text-sm text-muted-foreground">Aucune entrée d&apos;audit</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {(Array.isArray(auditTrail.data) ? auditTrail.data : []).map((entry: any, idx: number) => (
                    <div key={entry.id || idx} className="flex items-start gap-3 p-3 border rounded-lg text-sm">
                      <Badge variant={entry.audit_action === 'CREATE' ? 'default' : entry.audit_action === 'DELETE' ? 'destructive' : 'outline'} className="text-xs shrink-0 mt-0.5">
                        {entry.audit_action || entry.auditAction || 'UPDATE'}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{entry.user_email || entry.userEmail || 'Système'}</span>
                          <span className="text-xs text-muted-foreground">{fmtDate(entry.created_at || entry.createdAt)}</span>
                        </div>
                        {/* Diff display */}
                        {entry.old_values && entry.new_values && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {Object.entries(entry.new_values as Record<string, any>)
                              .filter(([k]) => (entry.old_values as Record<string, any>)[k] !== (entry.new_values as Record<string, any>)[k])
                              .map(([k, v]) => (
                                <div key={k} className="flex gap-1 mt-0.5">
                                  <span className="font-medium">{fmtLabel(k)}:</span>
                                  <span className="line-through text-red-500">{String((entry.old_values as Record<string, any>)[k] ?? '')}</span>
                                  <span>→</span>
                                  <span className="text-green-600">{String(v ?? '')}</span>
                                </div>
                              ))
                            }
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* E-Signature Modal */}
      {showESigModal && pendingTransition && (
        <ElectronicSignatureModal
          open={showESigModal}
          title={`Transition : ${record.status} → ${pendingTransition}`}
          description={`Vous êtes sur le point de changer le statut vers "${pendingTransition}". Cette action nécessite une signature électronique 21 CFR Part 11.`}
          onConfirm={(_password, signatureHash) => performTransition(pendingTransition!, signatureHash)}
          onCancel={() => { setShowESigModal(false); setPendingTransition(null) }}
        />
      )}

      {/* Create Link Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Link2 className="h-5 w-5" /> Lier un enregistrement</DialogTitle>
            <DialogDescription>Source : {entityConfig.label} — {record[entityConfig.numberField] || record.title}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-sm">Type de lien</Label>
              <Select value={linkForm.linkType} onValueChange={(v) => setLinkForm({ ...linkForm, linkType: v as RecordLinkType })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RECORD_LINK_TYPES.map(lt => <SelectItem key={lt.value} value={lt.value}>{lt.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Type d&apos;enregistrement cible</Label>
              <Select value={linkForm.targetType} onValueChange={handleLinkTypeChange}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                <SelectContent>
                  {['capas', 'ncrs', 'deviations', 'change_controls', 'audits', 'risks', 'training', 'batch_records', 'suppliers', 'documents'].map(slug => {
                    const cfg = getEntityConfig(slug)
                    return <SelectItem key={slug} value={slug}>{cfg?.label || slug}</SelectItem>
                  })}
                </SelectContent>
              </Select>
            </div>
            {linkForm.targetType && (
              <div>
                <Label className="text-sm">Enregistrement cible</Label>
                <Select value={linkForm.targetId} onValueChange={(v) => setLinkForm({ ...linkForm, targetId: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                  <SelectContent>
                    {availableTargets.map(r => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label className="text-sm">Description (optionnel)</Label>
              <Textarea value={linkForm.description} onChange={e => setLinkForm({ ...linkForm, description: e.target.value })} rows={2} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowLinkDialog(false)}>Annuler</Button>
            <Button onClick={handleCreateLink} disabled={!linkForm.targetId}>Créer le lien</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}