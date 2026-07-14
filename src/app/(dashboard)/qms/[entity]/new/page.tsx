'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQmsEntity } from '@/hooks/useQmsQuery'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { getEntityConfig } from '@/lib/qms-entity-map'

export default function EntityCreatePage() {
  const params = useParams()
  const router = useRouter()
  const entity = params.entity as string
  const entityConfig = getEntityConfig(entity)
  const { create, isCreating } = useQmsEntity(entity)
  const [form, setForm] = useState<Record<string, string>>({})
  const [error, setError] = useState('')

  if (!entityConfig) return <div className="p-6">Entité non reconnue</div>

  const COMMON_FIELDS = [
    { name: 'title', label: 'Titre', type: 'text', required: true },
    { name: 'description', label: 'Description', type: 'textarea', required: true },
    { name: 'priority', label: 'Priorité', type: 'select', options: ['Low', 'Medium', 'High', 'Critical'] },
    { name: 'severity', label: 'Sévérité', type: 'select', options: ['Minor', 'Major', 'Critical'] },
    { name: 'dueDate', label: 'Date d\'échéance', type: 'date' },
    { name: 'assignedTo', label: 'Assigné à', type: 'text' },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const result = await create(form as any)
      if (result?.id) router.push(`/qms/${entity}/${result.id}`)
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création')
    }
  }

  const setField = (key: string, value: string) => setForm({ ...form, [key]: value })

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <button onClick={() => router.push(`/qms/${entity}`)} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> {entityConfig.labelPlural}
        </button>
        <h1 className="text-2xl font-bold mt-1">Nouveau {entityConfig.label}</h1>
        <p className="text-sm text-muted-foreground">{entityConfig.description}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informations</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            {COMMON_FIELDS.map(field => (
              <div key={field.name}>
                <Label className="text-sm font-medium">{field.label}{field.required && ' *'}</Label>
                {field.type === 'textarea' ? (
                  <textarea
                    value={form[field.name] || ''} onChange={e => setField(field.name, e.target.value)}
                    required={field.required} rows={3}
                    className="mt-1 w-full px-3 py-2 text-sm border rounded-md bg-background min-h-[80px]"
                  />
                ) : field.type === 'select' && field.options ? (
                  <select
                    value={form[field.name] || ''} onChange={e => setField(field.name, e.target.value)}
                    className="mt-1 w-full px-3 py-2 text-sm border rounded-md bg-background"
                  >
                    <option value="">-- Sélectionner --</option>
                    {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <Input
                    type={field.type}
                    value={form[field.name] || ''} onChange={e => setField(field.name, e.target.value)}
                    required={field.required} className="mt-1"
                  />
                )}
              </div>
            ))}
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => router.push(`/qms/${entity}`)}>Annuler</Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Créer
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}