'use client'
// ============================================================
// Entity Create Page: Formulaire de creation generique
// Route: /qms/[entity]/new
// ============================================================

import { useParams, useRouter } from 'next/navigation'
import { useQmsMutation } from '@/hooks/useQmsQuery'
import { useState } from 'react'

const ENTITY_CONFIG: Record<string, { label: string; requiredFields: string[] }> = {
  capas: { label: 'CAPA', requiredFields: ['title', 'description', 'priority', 'due_date'] },
  non_conformances: { label: 'Non-Conformite', requiredFields: ['title', 'description', 'severity', 'due_date'] },
  deviations: { label: 'Deviation', requiredFields: ['title', 'description', 'severity'] },
  change_controls: { label: 'Change Control', requiredFields: ['title', 'description', 'priority'] },
  audits: { label: 'Audit', requiredFields: ['title', 'audit_type', 'scheduled_date'] },
  training: { label: 'Formation', requiredFields: ['title', 'training_type', 'due_date'] },
  risks: { label: 'Risque', requiredFields: ['title', 'risk_level', 'category'] },
  suppliers: { label: 'Fournisseur', requiredFields: ['name', 'supplier_type'] },
  documents: { label: 'Document', requiredFields: ['title', 'document_number', 'doc_type'] },
}

const FIELD_TYPES: Record<string, string> = {
  title: 'text', description: 'textarea', priority: 'select', severity: 'select',
  risk_level: 'select', doc_type: 'select', audit_type: 'select', training_type: 'select',
  supplier_type: 'select', due_date: 'date', scheduled_date: 'date', assigned_to: 'text',
  capa_number: 'text', ncr_number: 'text', dev_number: 'text', cc_number: 'text',
  audit_number: 'text', risk_number: 'text', batch_number: 'text', document_number: 'text',
}

const SELECT_OPTIONS: Record<string, string[]> = {
  priority: ['Low', 'Medium', 'High', 'Critical'],
  severity: ['Minor', 'Major', 'Critical'],
  risk_level: ['Low', 'Medium', 'High', 'Critical'],
  doc_type: ['SOP', 'POL', 'WI', 'FORM', 'REG', 'DL', 'OOS', 'Other'],
  audit_type: ['Internal', 'External', 'Supplier', 'Regulatory'],
  training_type: ['Initial', 'Recurrent', 'Update', 'Compliance'],
  supplier_type: ['Raw_Material', 'Component', 'Service', 'Contract_Manufacturer'],
}

export default function EntityCreatePage() {
  const params = useParams()
  const router = useRouter()
  const entity = params.entity as string
  const config = ENTITY_CONFIG[entity]
  const { execute, loading, error } = useQmsMutation()
  const [form, setForm] = useState<Record<string, string>>({})

  if (!config) return <div className="p-6">Entite non reconnue</div>

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = await execute(entity, 'POST', null, form)
    if (result?.id) router.push(`/qms/${entity}/${result.id}`)
  }

  const setField = (key: string, value: string) => setForm({ ...form, [key]: value })

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <button onClick={() => router.push(`/qms/${entity}`)} className="text-sm text-gray-500 hover:text-gray-700 mb-1">
        ← {config.label}s
      </button>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Nouveau {config.label}</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 space-y-4">
        {config.requiredFields.map(field => {
          const type = FIELD_TYPES[field] || 'text'
          const options = SELECT_OPTIONS[field]
          return (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 capitalize">
                {field.replace(/_/g, ' ')} *
              </label>
              {type === 'textarea' ? (
                <textarea value={form[field] || ''} onChange={e => setField(field, e.target.value)} required rows={4}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
              ) : options ? (
                <select value={form[field] || ''} onChange={e => setField(field, e.target.value)} required
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                  <option value="">-- Selectionner --</option>
                  {options.map(o => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
                </select>
              ) : (
                <input type={type} value={form[field] || ''} onChange={e => setField(field, e.target.value)} required
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
              )}
            </div>
          )
        })}
        <div className="flex gap-3 pt-4">
          <button type="button" onClick={() => router.push(`/qms/${entity}`)}
            className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">Annuler</button>
          <button type="submit" disabled={loading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50">
            {loading ? 'Creation...' : 'Creer'}
          </button>
        </div>
      </form>
    </div>
  )
}