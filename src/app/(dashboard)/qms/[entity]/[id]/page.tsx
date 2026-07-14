'use client'
// ============================================================
// Entity Detail Page: Affiche + modifie un enregistrement
// Route: /qms/[entity]/[id]
// ============================================================

import { useParams, useRouter } from 'next/navigation'
import { useQmsQuery, useQmsMutation } from '@/hooks/useQmsQuery'
import { useAuth } from '@/contexts/AuthContext'
import { useState, useEffect } from 'react'

const ENTITY_CONFIG: Record<string, { label: string; refCol: string }> = {
  documents: { label: 'Document', refCol: 'document_number' },
  capas: { label: 'CAPA', refCol: 'capa_number' },
  non_conformances: { label: 'Non-Conformite', refCol: 'ncr_number' },
  deviations: { label: 'Deviation', refCol: 'dev_number' },
  change_controls: { label: 'Change Control', refCol: 'cc_number' },
  audits: { label: 'Audit', refCol: 'audit_number' },
  training: { label: 'Formation', refCol: 'title' },
  risks: { label: 'Risque', refCol: 'risk_number' },
  suppliers: { label: 'Fournisseur', refCol: 'name' },
  batch_records: { label: 'Batch Record', refCol: 'batch_number' },
  form_instances: { label: 'Formulaire', refCol: 'reference_number' },
}

const HIDDEN_COLS = ['id', 'organization_id', 'created_at', 'updated_at', 'password_hash']

export default function EntityDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const entity = params.entity as string
  const id = params.id as string
  const config = ENTITY_CONFIG[entity]

  const { record, loading, error } = useQmsQuery({ entity, id, enabled: !!config && isAuthenticated })
  const { execute: updateRecord, loading: saving } = useQmsMutation()
  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState<Record<string, any>>({})

  useEffect(() => {
    if (record) setForm({ ...record })
  }, [record])

  if (!config) return <div className="p-6">Entite non reconnue</div>

  const handleSave = async () => {
    const { id: _id, created_at: _ca, updated_at: _ua, organization_id: _oi, ...body } = form
    const result = await updateRecord(entity, 'PUT', id, body)
    if (result) {
      setEditMode(false)
      window.location.reload()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (error || !record) {
    return <div className="p-6 text-red-500">Enregistrement non trouve: {error}</div>
  }

  const fields = Object.entries(record).filter(([key]) => !HIDDEN_COLS.includes(key))

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <button onClick={() => router.push(`/qms/${entity}`)} className="text-sm text-gray-500 hover:text-gray-700 mb-1">
            ← {config.label}s
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {record[config.refCol]}
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => editMode ? setEditMode(false) : setEditMode(true)}
            className={`px-4 py-2 text-sm rounded-lg border transition ${
              editMode ? 'bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600' : 'border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            {editMode ? 'Annuler' : 'Modifier'}
          </button>
          {editMode && (
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg disabled:opacity-50">
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {fields.map(([key, value]) => (
            <div key={key} className="flex px-6 py-4">
              <div className="w-1/3 text-sm font-medium text-gray-500 dark:text-gray-400 capitalize">
                {key.replace(/_/g, ' ')}
              </div>
              <div className="w-2/3">
                {editMode ? (
                  <input type="text" value={form[key] ?? ''} onChange={e => setForm({ ...form, [key]: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                ) : (
                  <span className="text-sm text-gray-900 dark:text-white">
                    {value === null ? '-' : typeof value === 'boolean' ? (value ? 'Oui' : 'Non') : String(value)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}