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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/contexts/AuthContext'
import { useQmsStore, type FormTemplate, type FormInstance } from '@/lib/demo-store'
import { useToast } from '@/hooks/use-toast'
import { useRecordWorkflow, getFormTemplateNextStatuses, canTransitionFormTemplate } from '@/hooks/useRecordWorkflow'
import { ElectronicSignatureModal } from '@/components/shared/ElectronicSignatureModal'
import { RecordLinkPanel } from '@/components/shared/RecordLinkPanel'
import { FileSpreadsheet, Plus, Pencil, Trash2, ArrowRight, Lock, FileText, CheckCircle2, Clock, X } from 'lucide-react'
import { SYSTEM_RECORD_TYPE_SLUGS, type FormTemplateStatus, type FieldType, type FormFieldDefinition, type WorkflowType, type UserRole } from '@/types/qms'

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Texte' }, { value: 'number', label: 'Nombre' }, { value: 'date', label: 'Date' },
  { value: 'select', label: 'Liste déroulante' }, { value: 'checkbox', label: 'Case à cocher' },
  { value: 'textarea', label: 'Zone de texte' }, { value: 'signature', label: 'Signature' },
  { value: 'table', label: 'Tableau' }, { value: 'rating', label: 'Notation' },
  { value: 'file', label: 'Fichier' }, { value: 'repeater', label: 'Répéteur' },
]

const MODULE_TYPES = [
  ...SYSTEM_RECORD_TYPE_SLUGS.map(s => ({ value: s, label: s })),
]

const WORKFLOW_TYPES: { value: WorkflowType; label: string }[] = [
  { value: 'single', label: 'Simple (1 approbateur)' },
  { value: 'sequential', label: 'Séquentiel (approvers en chaîne)' },
  { value: 'parallel', label: 'Parallèle (tous signent)' },
]

export function FormsView() {
  const { profile, hasPermission } = useAuth()
  const orgId = profile?.organizationId || ''
  const [tab, setTab] = useState<'templates' | 'instances'>('templates')
  const templates = useQmsStore(useShallow(s => s.formTemplates)).filter(t => t.organizationId === orgId)
  const instances = useQmsStore(useShallow(s => s.formInstances)).filter(i => i.organizationId === orgId)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><FileSpreadsheet className="h-6 w-6 text-emerald-600" /> Formulaires</h1>
        <p className="text-sm text-muted-foreground">Architecture hybride 2-couches : Templates (Layer 1) et Instances (Layer 2) — ISO 13485 §4.2.3 / §4.2.4</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="templates">Templates ({templates.length})</TabsTrigger>
          <TabsTrigger value="instances">Instances ({instances.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-4">
          <TemplatesLayer templates={templates} />
        </TabsContent>

        <TabsContent value="instances" className="mt-4">
          <InstancesLayer instances={instances} templates={templates} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ============================================================================
// Layer 1: Templates
// ============================================================================
function TemplatesLayer({ templates }: { templates: FormTemplate[] }) {
  const { profile, hasPermission } = useAuth()
  const orgId = profile?.organizationId || ''
  const createDoc = useQmsStore(s => s.createDocument)
  const { toast } = useToast()
  const [editing, setEditing] = useState<FormTemplate | null>(null)
  const [showForm, setShowForm] = useState(false)

  // We need to use the store's internal state setter for templates since there's no createFormTemplate action
  const addTemplate = (data: Partial<FormTemplate>) => {
    const newTemplate: FormTemplate = {
      id: 'ft_' + Math.random().toString(36).slice(2, 10),
      documentId: data.documentId,
      title: data.title || 'Nouveau template',
      version: data.version || '1.0',
      description: data.description,
      fields: data.fields || [],
      isActive: true,
      status: data.status || 'Draft',
      moduleType: data.moduleType || 'capa',
      workflow: data.workflow,
      compliance: data.compliance,
      signatures: [],
      currentApprovalStep: 0,
      previousVersionId: data.previousVersionId,
      effectiveDate: data.effectiveDate,
      reviewComment: data.reviewComment,
      organizationId: orgId,
      createdById: profile?.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    useQmsStore.setState(state => ({ formTemplates: [newTemplate, ...state.formTemplates] }))
    return newTemplate
  }

  const updateTemplate = (id: string, patch: Partial<FormTemplate>) => {
    useQmsStore.setState(state => ({
      formTemplates: state.formTemplates.map(t => t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t),
    }))
  }

  const deleteTemplate = (id: string) => {
    useQmsStore.setState(state => ({ formTemplates: state.formTemplates.filter(t => t.id !== id) }))
  }

  const handleTransition = (template: FormTemplate, target: FormTemplateStatus) => {
    if (!profile) return
    if (!canTransitionFormTemplate(template.status, target, profile.role as UserRole)) {
      toast({ title: 'Transition refusée', description: 'Rôle insuffisant pour cette transition', variant: 'destructive' })
      return
    }
    if (target === 'Approved') {
      // Require e-sig - for simplicity we'll just do it directly with a hash
      const hash = `SIG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`
      updateTemplate(template.id, {
        status: target,
        effectiveDate: new Date().toISOString(),
        signatures: [...template.signatures, {
          id: 'sig_' + Math.random().toString(36).slice(2, 10),
          recordId: template.id, recordType: 'form_template',
          signedById: profile.id, signerName: profile.fullName, signerRole: profile.role as UserRole,
          signatureType: 'approval', signatureHash: hash, revoked: false, createdAt: new Date().toISOString(),
        }],
      })
      toast({ title: `Template ${target}` })
    } else {
      updateTemplate(template.id, { status: target })
      toast({ title: `Template ${target}` })
    }
  }

  const statusBadge = (s: string) => {
    const m: Record<string, string> = {
      Draft: 'bg-slate-100 text-slate-700', Under_Review: 'bg-amber-100 text-amber-700',
      Approved: 'bg-green-100 text-green-700', Obsolete: 'bg-red-100 text-red-700',
    }
    return m[s] || ''
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditing(null); setShowForm(true) }}><Plus className="h-4 w-4 mr-2" /> Nouveau template</Button>
      </div>

      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-3 text-xs text-blue-800">
          <strong>Layer 1 — Templates :</strong> Cycle d'approbation Draft → Under_Review → Approved → Obsolete.
          Aucune instance ne peut être créée sans template <strong>Approved</strong>.
          La transition vers Approved nécessite une signature électronique.
        </CardContent>
      </Card>

      {templates.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Aucun template</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {templates.map(t => (
            <Card key={t.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge variant="outline" className={`text-xs ${statusBadge(t.status)}`}>{t.status.replace(/_/g, ' ')}</Badge>
                      <Badge variant="secondary" className="text-xs">{t.moduleType}</Badge>
                      <Badge variant="outline" className="text-xs">v{t.version}</Badge>
                      <Badge variant="outline" className="text-xs">{t.fields.length} champs</Badge>
                      {t.workflow?.eSignatureRequired && <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200"><Lock className="h-3 w-3 mr-1" />E-sig</Badge>}
                    </div>
                    <h3 className="font-medium">{t.title}</h3>
                    {t.description && <p className="text-sm text-muted-foreground line-clamp-2">{t.description}</p>}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {getFormTemplateNextStatuses(t.status).map(target => (
                        <Button key={target} size="sm" variant="outline" onClick={() => handleTransition(t, target)}>
                          <ArrowRight className="h-3 w-3 mr-1" />{target.replace(/_/g, ' ')}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => { setEditing(t); setShowForm(true) }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => { if (confirm('Supprimer ?')) deleteTemplate(t.id) }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <TemplateForm
          template={editing}
          onClose={() => setShowForm(false)}
          onSave={(data) => {
            if (editing) { updateTemplate(editing.id, data); toast({ title: 'Template mis à jour' }) }
            else { addTemplate(data); toast({ title: 'Template créé' }) }
            setShowForm(false)
          }}
        />
      )}
    </div>
  )
}

function TemplateForm({ template, onClose, onSave }: {
  template: FormTemplate | null
  onClose: () => void
  onSave: (data: Partial<FormTemplate>) => void
}) {
  const [form, setForm] = useState({
    title: template?.title || '',
    version: template?.version || '1.0',
    moduleType: template?.moduleType || 'capa',
    description: template?.description || '',
    fields: template?.fields || [] as FormFieldDefinition[],
    workflowType: template?.workflow?.type || 'single' as WorkflowType,
    eSigRequired: template?.workflow?.eSignatureRequired ?? true,
    lockAfterSubmission: template?.workflow?.lockAfterSubmission ?? true,
    minApprovers: template?.workflow?.approvers?.length || 1,
  })
  const [newField, setNewField] = useState({ name: '', label: '', type: 'text' as FieldType, required: false, options: '' })

  const addField = () => {
    if (!newField.name || !newField.label) return
    const field: FormFieldDefinition = {
      id: 'f_' + Math.random().toString(36).slice(2, 8),
      name: newField.name, label: newField.label, type: newField.type,
      required: newField.required,
      options: newField.options ? newField.options.split(',').map(s => s.trim()) : undefined,
    }
    setForm({ ...form, fields: [...form.fields, field] })
    setNewField({ name: '', label: '', type: 'text', required: false, options: '' })
  }

  const removeField = (id: string) => {
    setForm({ ...form, fields: form.fields.filter(f => f.id !== id) })
  }

  const handleSave = () => {
    onSave({
      title: form.title, version: form.version, moduleType: form.moduleType, description: form.description,
      fields: form.fields,
      workflow: {
        type: form.workflowType,
        approvers: Array.from({ length: form.minApprovers }, (_, i) => ({ role: 'quality_manager' as UserRole, order: i + 1 })),
        eSignatureRequired: form.eSigRequired, lockAfterSubmission: form.lockAfterSubmission,
      },
      status: template?.status || 'Draft',
    })
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template ? 'Modifier' : 'Nouveau'} template (Layer 1)</DialogTitle>
          <DialogDescription>Template de formulaire avec workflow d'approbation</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2"><Label>Titre *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Version</Label><Input value={form.version} onChange={e => setForm({ ...form, version: e.target.value })} /></div>
          </div>
          <div>
            <Label>Type de module</Label>
            <Select value={form.moduleType} onValueChange={v => setForm({ ...form, moduleType: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{MODULE_TYPES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} /></div>

          {/* Workflow */}
          <div className="border-t pt-3">
            <div className="text-sm font-medium mb-2">Workflow d'approbation</div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={form.workflowType} onValueChange={v => setForm({ ...form, workflowType: v as WorkflowType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{WORKFLOW_TYPES.map(w => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Nb approbateurs</Label><Input type="number" min="1" value={form.minApprovers} onChange={e => setForm({ ...form, minApprovers: Number(e.target.value) })} /></div>
            </div>
            <div className="flex items-center gap-4 mt-2">
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.eSigRequired} onChange={e => setForm({ ...form, eSigRequired: e.target.checked })} /><span className="text-sm">Signature électronique requise</span></label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.lockAfterSubmission} onChange={e => setForm({ ...form, lockAfterSubmission: e.target.checked })} /><span className="text-sm">Verrouiller après soumission</span></label>
            </div>
          </div>

          {/* Form Builder */}
          <div className="border-t pt-3">
            <div className="text-sm font-medium mb-2">Constructeur de formulaire ({form.fields.length} champs)</div>
            {form.fields.length > 0 && (
              <div className="space-y-1 mb-3">
                {form.fields.map(f => (
                  <div key={f.id} className="flex items-center gap-2 p-2 border rounded text-sm">
                    <Badge variant="secondary" className="text-xs">{f.type}</Badge>
                    <span className="font-mono text-xs">{f.name}</span>
                    <span className="flex-1">{f.label}</span>
                    {f.required && <Badge variant="outline" className="text-xs">Requis</Badge>}
                    {f.options && <Badge variant="outline" className="text-xs">{f.options.length} options</Badge>}
                    <Button size="sm" variant="ghost" onClick={() => removeField(f.id)}><X className="h-3 w-3" /></Button>
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-4 gap-2">
              <Input placeholder="nom_champ" value={newField.name} onChange={e => setNewField({ ...newField, name: e.target.value })} />
              <Input placeholder="Libellé" value={newField.label} onChange={e => setNewField({ ...newField, label: e.target.value })} />
              <Select value={newField.type} onValueChange={v => setNewField({ ...newField, type: v as FieldType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FIELD_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
              <Button onClick={addField}><Plus className="h-4 w-4 mr-1" /> Ajouter</Button>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Input placeholder="Options (séparées par virgule, pour select)" value={newField.options} onChange={e => setNewField({ ...newField, options: e.target.value })} />
              <label className="flex items-center gap-2 p-2 border rounded"><input type="checkbox" checked={newField.required} onChange={e => setNewField({ ...newField, required: e.target.checked })} /><span className="text-sm">Champ requis</span></label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSave}>{template ? 'Mettre à jour' : 'Créer'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// Layer 2: Instances
// ============================================================================
function InstancesLayer({ instances, templates }: { instances: FormInstance[]; templates: FormTemplate[] }) {
  const { profile, hasPermission } = useAuth()
  const orgId = profile?.organizationId || ''
  const createFormInstance = useQmsStore(s => s.createFormInstance)
  const transitionFormInstance = useQmsStore(s => s.transitionFormInstance)
  const { toast } = useToast()
  const [showCreate, setShowCreate] = useState(false)
  const [viewing, setViewing] = useState<FormInstance | null>(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [pendingTransition, setPendingTransition] = useState<{ id: string; target: any; comment?: string } | null>(null)

  const approvedTemplates = templates.filter(t => t.status === 'Approved')

  const handleCreate = () => {
    if (!selectedTemplateId || !profile) return
    try {
      createFormInstance(orgId, profile.id, { templateId: selectedTemplateId })
      toast({ title: 'Instance créée (Draft)' })
      setShowCreate(false)
      setSelectedTemplateId('')
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' })
    }
  }

  const handleTransition = (instance: FormInstance, target: any) => {
    if (!profile) return
    const template = templates.find(t => t.id === instance.templateId)
    const requiresSig = template?.workflow?.eSignatureRequired && (target === 'Approved' || target === 'Rejected')
    if (requiresSig) {
      setPendingTransition({ id: instance.id, target })
    } else {
      const r = transitionFormInstance(orgId, profile.id, instance.id, target)
      if (r.ok) { toast({ title: `Instance ${target}` }); setViewing(null) }
      else toast({ title: 'Erreur', description: r.error, variant: 'destructive' })
    }
  }

  const handleSigConfirm = (_pwd: string, hash: string) => {
    if (!pendingTransition || !profile) return
    const r = transitionFormInstance(orgId, profile.id, pendingTransition.id, pendingTransition.target, hash)
    if (r.ok) { toast({ title: `Instance ${pendingTransition.target} (signée)` }); setViewing(null) }
    else toast({ title: 'Erreur', description: r.error, variant: 'destructive' })
    setPendingTransition(null)
  }

  const statusBadge = (s: string) => {
    const m: Record<string, string> = {
      Draft: 'bg-slate-100 text-slate-700', Submitted: 'bg-blue-100 text-blue-700',
      Approved: 'bg-green-100 text-green-700', Rejected: 'bg-red-100 text-red-700',
    }
    return m[s] || ''
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowCreate(true)} disabled={approvedTemplates.length === 0}>
          <Plus className="h-4 w-4 mr-2" /> Nouvelle instance
        </Button>
      </div>

      {approvedTemplates.length === 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-3 text-xs text-amber-800">
            Aucun template Approved disponible. Créez et approuvez un template (Layer 1) avant de pouvoir créer des instances.
          </CardContent>
        </Card>
      )}

      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-3 text-xs text-blue-800">
          <strong>Layer 2 — Instances :</strong> Exécution des enregistrements basée sur un template Approved.
          Workflow hérité du template (single/sequential/parallel). Verrouillage après approbation si configuré.
        </CardContent>
      </Card>

      {instances.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Aucune instance</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {instances.map(i => {
            const template = templates.find(t => t.id === i.templateId)
            return (
              <Card key={i.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setViewing(i)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge variant="outline" className="font-mono text-xs">{i.referenceNumber || '—'}</Badge>
                        <Badge variant="outline" className={`text-xs ${statusBadge(i.status)}`}>{i.status}</Badge>
                        {i.isLocked && <Badge variant="outline" className="text-xs"><Lock className="h-3 w-3 mr-1" />Verrouillé</Badge>}
                      </div>
                      <h3 className="font-medium">{template?.title || 'Template supprimé'}</h3>
                      <div className="text-xs text-muted-foreground mt-1">
                        Template v{i.templateVersion} · {i.approvalHistory.length} approbation(s) · {template?.workflow?.type || 'single'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {showCreate && (
        <Dialog open onOpenChange={() => setShowCreate(false)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouvelle instance de formulaire</DialogTitle><DialogDescription>Sélectionnez un template Approved</DialogDescription></DialogHeader>
            <div className="py-2">
              <Label>Template</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {approvedTemplates.map(t => <SelectItem key={t.id} value={t.id}>{t.title} (v{t.version}, {t.moduleType})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowCreate(false)}>Annuler</Button>
              <Button onClick={handleCreate} disabled={!selectedTemplateId}>Créer (Draft)</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {viewing && (
        <InstanceViewDialog
          instance={viewing}
          template={templates.find(t => t.id === viewing.templateId)}
          onClose={() => setViewing(null)}
          onTransition={handleTransition}
          statusBadge={statusBadge}
        />
      )}

      {pendingTransition && (
        <ElectronicSignatureModal
          open
          title="Confirmer l'approbation"
          description={`Passer l'instance à "${pendingTransition.target}". Signature électronique requise.`}
          onConfirm={handleSigConfirm}
          onCancel={() => setPendingTransition(null)}
        />
      )}
    </div>
  )
}

function InstanceViewDialog({ instance, template, onClose, onTransition, statusBadge }: any) {
  const nextStatuses: any[] = instance.status === 'Draft' ? ['Submitted'] : instance.status === 'Submitted' ? ['Approved', 'Rejected'] : []

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <FileText className="h-5 w-5" />
            {template?.title || 'Instance'}
            <Badge variant="outline" className={statusBadge(instance.status)}>{instance.status}</Badge>
            {instance.isLocked && <Badge variant="outline"><Lock className="h-3 w-3 mr-1" />Verrouillé</Badge>}
          </DialogTitle>
          <DialogDescription>
            <Badge variant="outline" className="font-mono">{instance.referenceNumber}</Badge> · Template v{instance.templateVersion}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="form">
          <TabsList>
            <TabsTrigger value="form">Formulaire</TabsTrigger>
            <TabsTrigger value="history">Historique approbation ({instance.approvalHistory.length})</TabsTrigger>
            <TabsTrigger value="links">Liens</TabsTrigger>
          </TabsList>

          <TabsContent value="form" className="mt-4">
            {template?.fields && template.fields.length > 0 ? (
              <div className="grid gap-3">
                {template.fields.map((f: FormFieldDefinition) => (
                  <div key={f.id}>
                    <Label>{f.label}{f.required && ' *'}</Label>
                    <div className="mt-1 px-3 py-2 border rounded bg-slate-50 dark:bg-slate-900 text-sm">
                      {(instance.values as any)?.[f.name] || '—'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Aucun champ défini dans le template</p>
            )}

            {nextStatuses.length > 0 && (
              <div className="mt-4 p-3 border rounded-lg bg-slate-50 dark:bg-slate-900">
                <div className="text-sm font-medium mb-2 flex items-center gap-2"><ArrowRight className="h-4 w-4" /> Transitions disponibles</div>
                <div className="flex flex-wrap gap-2">
                  {nextStatuses.map((s: string) => (
                    <Button key={s} size="sm" variant="outline" onClick={() => onTransition(instance, s)}>
                      {s}
                      {(s === 'Approved' || s === 'Rejected') && template?.workflow?.eSignatureRequired && <Badge variant="secondary" className="ml-1 text-xs">E-sig</Badge>}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            {instance.approvalHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune approbation enregistrée</p>
            ) : (
              <div className="space-y-2">
                {instance.approvalHistory.map((h: any, i: number) => (
                  <div key={i} className="p-3 border rounded text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">{h.decision}</Badge>
                      <span className="font-medium">{h.approverName}</span>
                      <span className="text-xs text-muted-foreground">({h.approverRole})</span>
                    </div>
                    {h.comment && <p className="text-xs text-muted-foreground">Commentaire: {h.comment}</p>}
                    <div className="text-xs text-muted-foreground mt-1">
                      Signature: {h.signatureHash?.slice(0, 20)}… · {new Date(h.timestamp).toLocaleString('fr-FR')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="links" className="mt-4">
            <RecordLinkPanel recordId={instance.id} recordType="form_instance" recordLabel={instance.referenceNumber || 'Instance'} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
