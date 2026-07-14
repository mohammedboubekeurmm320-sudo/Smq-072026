'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQmsEntity } from '@/hooks/useQmsQuery'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Pencil, Save, X, Trash2, Loader2 } from 'lucide-react'
import { getEntityConfig } from '@/lib/qms-entity-map'

const STATUS_COLORS: Record<string, string> = {
  Open: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
  'Under Investigation': 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  Investigation: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  Implementation: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
  'In Progress': 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
  'Pending Disposition': 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  'Pending QA Review': 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  'Effectiveness Check': 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400',
  Closed: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
  Completed: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
  Approved: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
  Effective: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
  Released: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
  Qualified: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
  Draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  'Under Review': 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  Active: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
  Rejected: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
  Planned: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  Archived: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
  Requested: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  'In Implementation': 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
  Mitigated: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  Conditional: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  'Under Evaluation': 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
}

const HIDDEN_COLS = new Set([
  'id', 'organization_id', 'organizationId', 'created_at', 'updated_at',
  'createdAt', 'updatedAt', 'password_hash', 'created_by',
])

export default function EntityDetailPage() {
  const params = useParams()
  const router = useRouter()
  const entity = params.entity as string
  const id = params.id as string
  const entityConfig = getEntityConfig(entity)
  const { getById, update, remove, isUpdating, isDeleting } = useQmsEntity(entity)

  const [record, setRecord] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState<Record<string, any>>({})

  useEffect(() => {
    if (!entityConfig || !id) return
    setLoading(true)
    setError('')
    getById(id)
      .then(data => { setRecord(data); setForm({ ...data }) })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [entity, id])

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

  const fmtDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) } catch { return '-' }
  }

  const fmtLabel = (key: string) =>
    key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())

  if (loading) {
    return <div className="space-y-3 max-w-4xl mx-auto p-6">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
  }

  if (error || !record) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <button onClick={() => router.push(`/qms/${entity}`)} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4">
          <ArrowLeft className="h-3 w-3" /> {entityConfig.labelPlural}
        </button>
        <div className="p-6 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
          {error || 'Enregistrement non trouvé'}
        </div>
      </div>
    )
  }

  const fields = Object.entries(record).filter(([key]) => !HIDDEN_COLS.has(key))
  const statusBadge = (status: string) => (
    <Badge variant="outline" className={`text-xs ${STATUS_COLORS[status] || 'bg-slate-100 text-slate-700'}`}>
      {status}
    </Badge>
  )

  return (
    <div className="max-w-4xl mx-auto space-y-6">
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
              <Button variant="outline" size="sm" onClick={() => { setEditMode(false); setForm({ ...record }) }}>
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

      {/* Fields */}
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
                    <Input
                      value={form[key] ?? ''} onChange={e => setForm({ ...form, [key]: e.target.value })}
                      className="h-8 text-sm"
                    />
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
    </div>
  )
}