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

// Champs spécifiques par entité
const ENTITY_FIELDS: Record<string, { name: string; label: string; type: 'text' | 'textarea' | 'select' | 'date'; required?: boolean; options?: string[] }[]> = {
  capas: [
    { name: 'title', label: 'Titre du CAPA', type: 'text', required: true },
    { name: 'description', label: 'Description', type: 'textarea', required: true },
    { name: 'capa_type', label: 'Type CAPA', type: 'select', options: ['Corrective Action', 'Preventive Action'] },
    { name: 'priority', label: 'Priorité', type: 'select', options: ['Low', 'Medium', 'High', 'Critical'] },
    { name: 'severity', label: 'Sévérité', type: 'select', options: ['Minor', 'Major', 'Critical'] },
    { name: 'due_date', label: 'Date d\'échéance', type: 'date' },
    { name: 'assigned_to', label: 'Assigné à (email)', type: 'text' },
    { name: 'source', label: 'Source (NCR, Audit, etc.)', type: 'text' },
  ],
  non_conformances: [
    { name: 'title', label: 'Titre de la non-conformité', type: 'text', required: true },
    { name: 'description', label: 'Description', type: 'textarea', required: true },
    { name: 'ncr_type', label: 'Type NC', type: 'select', options: ['Product', 'Process', 'Documentation', 'Supplier', 'Customer Complaint'] },
    { name: 'severity', label: 'Sévérité', type: 'select', options: ['Minor', 'Major', 'Critical'] },
    { name: 'disposition', label: 'Disposition', type: 'select', options: ['Use As Is', 'Rework', 'Scrap', 'Return to Supplier'] },
    { name: 'due_date', label: 'Date d\'échéance', type: 'date' },
    { name: 'assigned_to', label: 'Assigné à (email)', type: 'text' },
  ],
  deviations: [
    { name: 'title', label: 'Titre de la déviation', type: 'text', required: true },
    { name: 'description', label: 'Description', type: 'textarea', required: true },
    { name: 'deviation_type', label: 'Type de déviation', type: 'select', options: ['Planned', 'Unplanned'] },
    { name: 'severity', label: 'Impact', type: 'select', options: ['Low', 'Medium', 'High', 'Critical'] },
    { name: 'due_date', label: 'Date d\'échéance', type: 'date' },
    { name: 'assigned_to', label: 'Assigné à (email)', type: 'text' },
  ],
  change_controls: [
    { name: 'title', label: 'Titre du changement', type: 'text', required: true },
    { name: 'description', label: 'Description du changement', type: 'textarea', required: true },
    { name: 'change_type', label: 'Type de changement', type: 'select', options: ['Major', 'Minor', 'Administrative'] },
    { name: 'priority', label: 'Priorité', type: 'select', options: ['Low', 'Medium', 'High'] },
    { name: 'due_date', label: 'Date cible', type: 'date' },
    { name: 'assigned_to', label: 'Responsable', type: 'text' },
  ],
  audits: [
    { name: 'title', label: 'Titre de l\'audit', type: 'text', required: true },
    { name: 'description', label: 'Objectif / Périmètre', type: 'textarea', required: true },
    { name: 'audit_type', label: 'Type d\'audit', type: 'select', options: ['Internal', 'External', 'Supplier'] },
    { name: 'status', label: 'Statut initial', type: 'select', options: ['Planned'] },
    { name: 'due_date', label: 'Date de l\'audit', type: 'date' },
    { name: 'assigned_to', label: 'Auditeur responsable', type: 'text' },
  ],
  risks: [
    { name: 'title', label: 'Titre du risque', type: 'text', required: true },
    { name: 'description', label: 'Description du risque', type: 'textarea', required: true },
    { name: 'severity', label: 'Sévérité', type: 'select', options: ['Negligible', 'Minor', 'Moderate', 'Major', 'Catastrophic'] },
    { name: 'probability', label: 'Probabilité', type: 'select', options: ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'] },
    { name: 'risk_level', label: 'Niveau de risque', type: 'select', options: ['Low', 'Medium', 'High', 'Critical'] },
    { name: 'mitigation_strategy', label: 'Stratégie d\'atténuation', type: 'textarea' },
  ],
  training: [
    { name: 'title', label: 'Titre de la formation', type: 'text', required: true },
    { name: 'description', label: 'Description', type: 'textarea' },
    { name: 'training_type', label: 'Type', type: 'select', options: ['Initial', 'Recurrent', 'Specialized'] },
    { name: 'status', label: 'Statut initial', type: 'select', options: ['Planned'] },
    { name: 'due_date', label: 'Date de la formation', type: 'date' },
    { name: 'assigned_to', label: 'Formateur', type: 'text' },
  ],
  suppliers: [
    { name: 'title', label: 'Nom du fournisseur', type: 'text', required: true },
    { name: 'description', label: 'Description / Produits', type: 'textarea' },
    { name: 'supplier_type', label: 'Type', type: 'select', options: ['Raw Material', 'Component', 'Service', 'Contract Manufacturer'] },
    { name: 'severity', label: 'Classification', type: 'select', options: ['Critical', 'Major', 'Minor'] },
    { name: 'assigned_to', label: 'Contact', type: 'text' },
  ],
  batch_records: [
    { name: 'title', label: 'Numéro de lot', type: 'text', required: true },
    { name: 'description', label: 'Description du produit', type: 'textarea' },
    { name: 'status', label: 'Statut initial', type: 'select', options: ['In Progress'] },
    { name: 'due_date', label: 'Date de fin prévue', type: 'date' },
    { name: 'assigned_to', label: 'Responsable', type: 'text' },
  ],
}

// Champs par défaut génériques
const DEFAULT_FIELDS = [
  { name: 'title', label: 'Titre', type: 'text' as const, required: true },
  { name: 'description', label: 'Description', type: 'textarea' as const, required: true },
  { name: 'priority', label: 'Priorité', type: 'select' as const, options: ['Low', 'Medium', 'High', 'Critical'] },
  { name: 'due_date', label: 'Date d\'échéance', type: 'date' as const },
  { name: 'assigned_to', label: 'Assigné à (email)', type: 'text' as const },
]

export default function EntityCreatePage() {
  const params = useParams()
  const router = useRouter()
  const entity = params.entity as string
  const entityConfig = getEntityConfig(entity)
  const { create, isCreating } = useQmsEntity(entity)
  const [form, setForm] = useState<Record<string, string>>({})
  const [error, setError] = useState('')

  if (!entityConfig) return <div className="p-6">Entité non reconnue</div>

  const fields = ENTITY_FIELDS[entity] || DEFAULT_FIELDS

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation basique
    const missing = fields
      .filter(f => f.required && !form[f.name]?.trim())
      .map(f => f.label)
    if (missing.length > 0) {
      setError(`Champs obligatoires : ${missing.join(', ')}`)
      return
    }

    try {
      const result = await create(form as any)
      if (result?.id) router.push(`/qms/${entity}/${result.id}`)
      else router.push(`/qms/${entity}`)
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
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            {fields.map(field => (
              <div key={field.name}>
                <Label className="text-sm font-medium">
                  {field.label}{field.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                {field.type === 'textarea' ? (
                  <textarea
                    value={form[field.name] || ''} onChange={e => setField(field.name, e.target.value)}
                    required={field.required} rows={3}
                    className="mt-1 w-full px-3 py-2 text-sm border rounded-md bg-background min-h-[80px]"
                    placeholder={`Entrez ${field.label.toLowerCase()}...`}
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
                    placeholder={`Entrez ${field.label.toLowerCase()}...`}
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