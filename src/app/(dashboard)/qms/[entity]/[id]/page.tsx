'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQmsEntity } from '@/hooks/useQmsQuery'
import { useAuth } from '@/contexts/AuthContext'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Pencil, Save, X, Trash2, Loader2 } from 'lucide-react'
import { getEntityConfig } from '@/lib/qms-entity-map'

const STATUS_COLORS: Record<string, string> = {
  Open: 'bg-red-100 text-red-700', 'Under Investigation': 'bg-amber-100 text-amber-700',
  Investigation: 'bg-amber-100 text-amber-700', Implementation: 'bg-blue-100 text-blue-700',
  'In Progress': 'bg-blue-100 text-blue-700', 'Effectiveness Check': 'bg-violet-100 text-violet-700',
  Closed: 'bg-green-100 text-green-700', Completed: 'bg-green-100 text-green-700',
  Approved: 'bg-green-100 text-green-700', Effective: 'bg-green-100 text-green-700',
  Draft: 'bg-slate-100 text-slate-700', 'Under Review': 'bg-amber-100 text-amber-700',
  Active: 'bg-blue-100 text-blue-700', Rejected: 'bg-red-100 text-red-700',
}

const HIDDEN_COLS = new Set(['id', 'organization_id', 'organizationId', 'created_at', 'updated_at', 'createdAt', 'updatedAt', 'password_hash'])

export default function EntityDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { isAuthenticated } = useAuth()
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
    if (!entityConfig || !id || !isAuthenticated) return
    setLoading(true)
    getById(id)
      .then(data => { setRecord(data); setForm({ ...data }) })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [entity, id, isAuthenticated])

  if (!entityConfig) return <div className="p-6">Entité non reconnue : {entity}</div>

  const handleSave = async () => {
    try {
      const { id: _id, createdAt: _ca, updatedAt: _ua, organizationId: _oi, ...body } = form
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
    await remove(id)
    router.push(`/qms/${entity}`)
  }

  const fmtDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) } catch { return '-' }
  }

  if (loading) {
    return <div className="space-y-3 max-w-4xl mx-auto p-6">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
  }

  if (error || !record) {
    return <div className="p-6 text-red-500">Enregistrement non trouvé : {error}</div>
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
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => router.push(`/qms/${entity}`)} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> {entityConfig.labelPlural}
          </button>
          <h1 className="text-2xl font-bold mt-1">
            {record[entityConfig.numberField] || record.title || record.name || entityConfig.label}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            {entityConfig.statusField && record[entityConfig.statusField] && statusBadge(record[entityConfig.statusField])}
            <span className="text-xs text-muted-foreground">
              Créé le {fmtDate(record.createdAt || record.created_at)}
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
          <Button variant="outline" size="sm" className="text-red-600" onClick={handleDelete} disabled={isDeleting}>
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
              <div key={key} className="flex py-3">
                <div className="w-1/3 text-sm font-medium text-muted-foreground">
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                </div>
                <div className="w-2/3">
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
                    ) : String(value).length > 100 ? (
                      <p className="text-sm whitespace-pre-wrap">{String(value)}</p>
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