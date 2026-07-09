'use client'

import { useShallow } from 'zustand/react/shallow'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { useAuth } from '@/contexts/AuthContext'
import { useQmsStore, type Document } from '@/lib/demo-store'
import { useToast } from '@/hooks/use-toast'
import { TRIGGER_TYPES, validateTriggerChain } from '@/lib/document-code-convention'
import { GitBranch, Plus, Trash2, AlertTriangle, Link2, ArrowRight, Zap, FileOutput, TrendingUp, FileText } from 'lucide-react'

const TRIGGER_ICONS: Record<string, any> = {
  prerequisite: AlertTriangle, references: Link2, activates: Zap,
  output: FileOutput, escalation: TrendingUp,
}

const TRIGGER_COLORS: Record<string, string> = {
  prerequisite: 'bg-amber-100 text-amber-700 border-amber-200',
  references: 'bg-blue-100 text-blue-700 border-blue-200',
  activates: 'bg-violet-100 text-violet-700 border-violet-200',
  output: 'bg-teal-100 text-teal-700 border-teal-200',
  escalation: 'bg-red-100 text-red-700 border-red-200',
}

const RELATIONSHIP_TYPES = [
  { value: 'parent_child', label: 'Parent → Enfant', desc: 'Hiérarchie documentaire' },
  { value: 'references', label: 'Référence', desc: 'Le document référence un autre' },
  { value: 'supersedes', label: 'Remplace', desc: 'Remplace une version antérieure' },
  { value: 'obsoletes', label: 'Obsolète', desc: 'Rend obsolète un autre document' },
  { value: 'amends', label: 'Amende', desc: 'Modifie partiellement un autre document' },
]

// ============================================================================
// Document Triggers Panel
// ============================================================================
export function DocumentTriggersPanel({ document, allDocuments }: { document: Document; allDocuments: Document[] }) {
  const { profile, hasPermission } = useAuth()
  const { toast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [newTrigger, setNewTrigger] = useState({
    targetDocumentId: '',
    triggerType: 'prerequisite' as string,
    description: '',
    isMandatory: false,
  })

  // Triggers where this document is the source
  const outgoingTriggers = (document as any).triggers || []
  // Triggers where this document is the target
  const incomingTriggers = (document as any).triggeredBy || []

  // For simplicity, we store triggers in a separate store collection
  // Since the demo store doesn't have a dedicated triggers array, we use a JSON field on the document
  const triggers: any[] = (document as any).triggersJson ? JSON.parse((document as any).triggersJson) : []

  const canEdit = hasPermission('documents.update' as any)

  const handleAdd = () => {
    if (!newTrigger.targetDocumentId) { toast({ title: 'Sélectionnez un document cible', variant: 'destructive' }); return }
    if (newTrigger.targetDocumentId === document.id) { toast({ title: 'Un document ne peut pas se déclencher lui-même', variant: 'destructive' }); return }

    const newTriggersList = [...triggers, {
      id: 'trig_' + Math.random().toString(36).slice(2, 8),
      sourceDocumentId: document.id,
      targetDocumentId: newTrigger.targetDocumentId,
      triggerType: newTrigger.triggerType,
      description: newTrigger.description,
      isMandatory: newTrigger.isMandatory,
    }]

    // Cycle detection
    const cycleCheck = validateTriggerChain(newTriggersList.map(t => ({ sourceDocumentId: t.sourceDocumentId, targetDocumentId: t.targetDocumentId })))
    if (!cycleCheck.valid) {
      toast({ title: 'Cycle détecté', description: `Cette création créerait une dépendance circulaire: ${cycleCheck.cycle?.join(' → ')}`, variant: 'destructive' })
      return
    }

    // Save to document
    useQmsStore.setState(state => ({
      documents: state.documents.map(d => d.id === document.id ? { ...d, triggersJson: JSON.stringify(newTriggersList) } as any : d),
    }))
    setNewTrigger({ targetDocumentId: '', triggerType: 'prerequisite', description: '', isMandatory: false })
    setShowForm(false)
    toast({ title: 'Trigger ajouté' })
  }

  const handleDelete = (triggerId: string) => {
    const newTriggersList = triggers.filter(t => t.id !== triggerId)
    useQmsStore.setState(state => ({
      documents: state.documents.map(d => d.id === document.id ? { ...d, triggersJson: JSON.stringify(newTriggersList) } as any : d),
    }))
    toast({ title: 'Trigger supprimé' })
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4" /> Triggers documentaires</CardTitle>
            <CardDescription className="text-xs">Dépendances entre documents (prérequis, références, escalade…)</CardDescription>
          </div>
          {canEdit && <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}><Plus className="h-4 w-4 mr-1" /> Ajouter</Button>}
        </div>
      </CardHeader>
      <CardContent>
        {triggers.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun trigger défini</p>
        ) : (
          <div className="space-y-2">
            {triggers.map(t => {
              const targetDoc = allDocuments.find(d => d.id === t.targetDocumentId)
              const Icon = TRIGGER_ICONS[t.triggerType] || Link2
              return (
                <div key={t.id} className="flex items-center gap-2 p-2 border rounded text-sm">
                  <Badge variant="outline" className={`text-xs ${TRIGGER_COLORS[t.triggerType] || ''}`}>
                    <Icon className="h-3 w-3 mr-1" />{t.triggerType}
                  </Badge>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{targetDoc?.title || 'Document supprimé'}</div>
                    <div className="text-xs text-muted-foreground">{targetDoc?.documentNumber}</div>
                  </div>
                  {t.isMandatory && <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">Obligatoire</Badge>}
                  {t.description && <span className="text-xs text-muted-foreground truncate max-w-xs">{t.description}</span>}
                  {canEdit && <Button size="sm" variant="ghost" onClick={() => handleDelete(t.id)}><Trash2 className="h-3 w-3 text-red-500" /></Button>}
                </div>
              )
            })}
          </div>
        )}

        {/* Cycle warning */}
        {triggers.length > 0 && (
          <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
            <AlertTriangle className="h-3 w-3 inline mr-1" />
            Détection de cycles activée — toute création de dépendance circulaire sera bloquée.
          </div>
        )}

        {showForm && (
          <div className="mt-3 p-3 border rounded space-y-2 bg-slate-50 dark:bg-slate-900">
            <div>
              <Label className="text-xs">Type de trigger</Label>
              <Select value={newTrigger.triggerType} onValueChange={v => setNewTrigger({ ...newTrigger, triggerType: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRIGGER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>
                    <div className="flex flex-col">
                      <span>{t.label}</span>
                      <span className="text-xs text-muted-foreground">{t.description}</span>
                    </div>
                  </SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Document cible</Label>
              <Select value={newTrigger.targetDocumentId} onValueChange={v => setNewTrigger({ ...newTrigger, targetDocumentId: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                <SelectContent>
                  {allDocuments.filter(d => d.id !== document.id).map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.documentNumber} — {d.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Description (optionnel)</Label>
              <Input value={newTrigger.description} onChange={e => setNewTrigger({ ...newTrigger, description: e.target.value })} className="mt-1" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={newTrigger.isMandatory} onChange={e => setNewTrigger({ ...newTrigger, isMandatory: e.target.checked })} />
              Trigger obligatoire (bloque la création si non satisfait)
            </label>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd}>Ajouter</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Annuler</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Document Relationships Panel
// ============================================================================
export function DocumentRelationshipsPanel({ document, allDocuments }: { document: Document; allDocuments: Document[] }) {
  const { profile, hasPermission } = useAuth()
  const { toast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [newRel, setNewRel] = useState({
    targetDocumentId: '',
    relationshipType: 'parent_child' as string,
  })

  const relationships: any[] = (document as any).relationshipsJson ? JSON.parse((document as any).relationshipsJson) : []
  const canEdit = hasPermission('documents.update' as any)

  const handleAdd = () => {
    if (!newRel.targetDocumentId) { toast({ title: 'Sélectionnez un document cible', variant: 'destructive' }); return }
    if (newRel.targetDocumentId === document.id) { toast({ title: 'Un document ne peut pas être en relation avec lui-même', variant: 'destructive' }); return }

    // Check for duplicates
    if (relationships.find(r => r.targetDocumentId === newRel.targetDocumentId && r.relationshipType === newRel.relationshipType)) {
      toast({ title: 'Cette relation existe déjà', variant: 'destructive' }); return
    }

    const newRels = [...relationships, {
      id: 'rel_' + Math.random().toString(36).slice(2, 8),
      parentDocumentId: newRel.relationshipType === 'parent_child' ? document.id : newRel.targetDocumentId,
      childDocumentId: newRel.relationshipType === 'parent_child' ? newRel.targetDocumentId : document.id,
      relationshipType: newRel.relationshipType,
    }]

    useQmsStore.setState(state => ({
      documents: state.documents.map(d => d.id === document.id ? { ...d, relationshipsJson: JSON.stringify(newRels) } as any : d),
    }))
    setNewRel({ targetDocumentId: '', relationshipType: 'parent_child' })
    setShowForm(false)
    toast({ title: 'Relation ajoutée' })
  }

  const handleDelete = (relId: string) => {
    const newRels = relationships.filter(r => r.id !== relId)
    useQmsStore.setState(state => ({
      documents: state.documents.map(d => d.id === document.id ? { ...d, relationshipsJson: JSON.stringify(newRels) } as any : d),
    }))
    toast({ title: 'Relation supprimée' })
  }

  const REL_COLORS: Record<string, string> = {
    parent_child: 'bg-purple-100 text-purple-700 border-purple-200',
    references: 'bg-blue-100 text-blue-700 border-blue-200',
    supersedes: 'bg-teal-100 text-teal-700 border-teal-200',
    obsoletes: 'bg-red-100 text-red-700 border-red-200',
    amends: 'bg-amber-100 text-amber-700 border-amber-200',
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2"><GitBranch className="h-4 w-4" /> Relations documentaires</CardTitle>
            <CardDescription className="text-xs">Hiérarchie et liens entre documents</CardDescription>
          </div>
          {canEdit && <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}><Plus className="h-4 w-4 mr-1" /> Ajouter</Button>}
        </div>
      </CardHeader>
      <CardContent>
        {relationships.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune relation définie</p>
        ) : (
          <div className="space-y-2">
            {relationships.map(r => {
              const isParent = r.parentDocumentId === document.id
              const otherDoc = allDocuments.find(d => d.id === (isParent ? r.childDocumentId : r.parentDocumentId))
              const relDef = RELATIONSHIP_TYPES.find(rt => rt.value === r.relationshipType)
              return (
                <div key={r.id} className="flex items-center gap-2 p-2 border rounded text-sm">
                  <Badge variant="outline" className={`text-xs ${REL_COLORS[r.relationshipType] || ''}`}>
                    {relDef?.label || r.relationshipType}
                  </Badge>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{otherDoc?.title || 'Document supprimé'}</div>
                    <div className="text-xs text-muted-foreground">{otherDoc?.documentNumber} · {isParent ? '(enfant)' : '(parent)'}</div>
                  </div>
                  {canEdit && <Button size="sm" variant="ghost" onClick={() => handleDelete(r.id)}><Trash2 className="h-3 w-3 text-red-500" /></Button>}
                </div>
              )
            })}
          </div>
        )}

        {showForm && (
          <div className="mt-3 p-3 border rounded space-y-2 bg-slate-50 dark:bg-slate-900">
            <div>
              <Label className="text-xs">Type de relation</Label>
              <Select value={newRel.relationshipType} onValueChange={v => setNewRel({ ...newRel, relationshipType: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RELATIONSHIP_TYPES.map(r => <SelectItem key={r.value} value={r.value}>
                    <div className="flex flex-col">
                      <span>{r.label}</span>
                      <span className="text-xs text-muted-foreground">{r.desc}</span>
                    </div>
                  </SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Document lié</Label>
              <Select value={newRel.targetDocumentId} onValueChange={v => setNewRel({ ...newRel, targetDocumentId: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                <SelectContent>
                  {allDocuments.filter(d => d.id !== document.id).map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.documentNumber} — {d.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd}>Ajouter</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Annuler</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
