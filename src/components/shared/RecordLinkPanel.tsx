'use client'
import { useShallow } from 'zustand/react/shallow'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { useAuth } from '@/contexts/AuthContext'
import { useQmsStore, type RecordLink } from '@/lib/demo-store'
import { RECORD_LINK_TYPES, type RecordLinkType } from '@/types/qms'
import { Plus, Trash2, Link2, ArrowRight } from 'lucide-react'

interface Props {
  recordId: string
  recordType: string
  recordLabel: string  // human-readable label of current record
}

const MODULE_LIST = [
  { slug: 'capa', label: 'CAPA' },
  { slug: 'ncr', label: 'Non-Conformité' },
  { slug: 'deviation', label: 'Déviation' },
  { slug: 'change_control', label: 'Contrôle des Changements' },
  { slug: 'audit', label: 'Audit' },
  { slug: 'risk', label: 'Risque' },
  { slug: 'training', label: 'Formation' },
  { slug: 'batch_record', label: 'Dossier de Lot' },
  { slug: 'supplier', label: 'Fournisseur' },
  { slug: 'oos_oot', label: 'OOS/OOT' },
  { slug: 'document', label: 'Document' },
]

export function RecordLinkPanel({ recordId, recordType, recordLabel }: Props) {
  const { profile } = useAuth()
  const orgId = profile?.organizationId || ''
  const links = useQmsStore(useShallow(s => s.recordLinks)).filter(l => l.organizationId === orgId && (
    (l.sourceRecordId === recordId && l.sourceRecordType === recordType) ||
    (l.targetRecordId === recordId && l.targetRecordType === recordType)
  ))
  const createLink = useQmsStore(s => s.createRecordLink)
  const deleteLink = useQmsStore(s => s.deleteRecordLink)
  const [showForm, setShowForm] = useState(false)

  // Available records for linking (across all modules)
  const getAvailableRecords = (targetType: string) => {
    const s = useQmsStore.getState()
    switch (targetType) {
      case 'capa': return s.listCapas(orgId).map(r => ({ id: r.id, label: r.capaNumber + ' — ' + r.title, type: 'capa' }))
      case 'ncr': return s.listNcrs(orgId).map(r => ({ id: r.id, label: r.ncrNumber + ' — ' + r.title, type: 'ncr' }))
      case 'deviation': return s.listDeviations(orgId).map(r => ({ id: r.id, label: r.devNumber + ' — ' + r.title, type: 'deviation' }))
      case 'change_control': return s.listChangeControls(orgId).map(r => ({ id: r.id, label: r.ccNumber + ' — ' + r.title, type: 'change_control' }))
      case 'audit': return s.listAudits(orgId).map(r => ({ id: r.id, label: r.auditNumber + ' — ' + r.title, type: 'audit' }))
      case 'risk': return s.listRisks(orgId).map(r => ({ id: r.id, label: r.riskNumber + ' — ' + r.title, type: 'risk' }))
      case 'training': return s.listTrainings(orgId).map(r => ({ id: r.id, label: r.title + ' — ' + (r.assignedToId || ''), type: 'training' }))
      case 'batch_record': return s.listBatchRecords(orgId).map(r => ({ id: r.id, label: r.lotNumber + ' — ' + r.productName, type: 'batch_record' }))
      case 'supplier': return s.listSuppliers(orgId).map(r => ({ id: r.id, label: r.supplierCode + ' — ' + r.name, type: 'supplier' }))
      case 'document': return s.listDocuments(orgId).map(r => ({ id: r.id, label: r.documentNumber + ' — ' + r.title, type: 'document' }))
      default: return []
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><Link2 className="h-4 w-4" /> Enregistrements liés</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1" /> Lier
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {links.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun enregistrement lié</p>
        ) : (
          <div className="space-y-2">
            {links.map(l => {
              const outgoing = l.sourceRecordId === recordId && l.sourceRecordType === recordType
              const otherId = outgoing ? l.targetRecordId : l.sourceRecordId
              const otherType = outgoing ? l.targetRecordType : l.sourceRecordType
              const linkTypeDef = RECORD_LINK_TYPES.find(r => r.value === l.linkType)
              return (
                <div key={l.id} className="flex items-center gap-2 p-2 border rounded text-sm">
                  <Badge variant="outline" className="text-xs">{linkTypeDef?.label || l.linkType}</Badge>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">{outgoing ? '→' : '←'}</span>
                      <Badge variant="secondary" className="text-xs">{otherType}</Badge>
                      <span className="truncate">{otherId.slice(0, 12)}…</span>
                    </div>
                    {l.description && <p className="text-xs text-muted-foreground mt-0.5">{l.description}</p>}
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => deleteLink(orgId, profile?.id || '', l.id)}>
                    <Trash2 className="h-3 w-3 text-red-500" />
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>

      {showForm && (
        <CreateLinkDialog
          recordId={recordId}
          recordType={recordType}
          recordLabel={recordLabel}
          getAvailableRecords={getAvailableRecords}
          onClose={() => setShowForm(false)}
          onCreate={(payload) => {
            const r = createLink(orgId, profile?.id || '', payload)
            if (r.ok) setShowForm(false)
            return r
          }}
        />
      )}
    </Card>
  )
}

function CreateLinkDialog({ recordId, recordType, recordLabel, getAvailableRecords, onClose, onCreate }: {
  recordId: string
  recordType: string
  recordLabel: string
  getAvailableRecords: (type: string) => { id: string; label: string; type: string }[]
  onClose: () => void
  onCreate: (payload: any) => { ok: boolean; error?: string }
}) {
  const [targetType, setTargetType] = useState('')
  const [targetId, setTargetId] = useState('')
  const [linkType, setLinkType] = useState<RecordLinkType>('related')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')

  const available = useMemo(() => targetType ? getAvailableRecords(targetType) : [], [targetType, getAvailableRecords])

  const handleCreate = () => {
    setError('')
    if (!targetType || !targetId) { setError('Type et enregistrement cible requis'); return }
    const r = onCreate({
      sourceRecordId: recordId, sourceRecordType: recordType,
      targetRecordId: targetId, targetRecordType: targetType,
      linkType, description: description || undefined,
    })
    if (!r.ok) setError(r.error || 'Erreur')
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Link2 className="h-5 w-5" /> Lier un enregistrement</DialogTitle>
          <DialogDescription>Source: <Badge variant="outline" className="ml-1">{recordType}</Badge> {recordLabel}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label>Type de lien</Label>
            <Select value={linkType} onValueChange={(v) => setLinkType(v as RecordLinkType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {RECORD_LINK_TYPES.map(lt => <SelectItem key={lt.value} value={lt.value}>{lt.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Type d'enregistrement cible</Label>
            <Select value={targetType} onValueChange={(v) => { setTargetType(v); setTargetId('') }}>
              <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
              <SelectContent>
                {MODULE_LIST.map(m => <SelectItem key={m.slug} value={m.slug}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {targetType && (
            <div>
              <Label>Enregistrement cible</Label>
              <Select value={targetId} onValueChange={setTargetId}>
                <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                <SelectContent>
                  {available.map(r => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Description (optionnel)</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} />
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={handleCreate}><Plus className="h-4 w-4 mr-1" /> Créer le lien</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
