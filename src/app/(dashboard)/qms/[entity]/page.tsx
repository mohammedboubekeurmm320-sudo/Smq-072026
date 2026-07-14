'use client'
// ============================================================
// Entity List: Page générique pour toutes les entités QMS
// Route: /qms/[entity]
// ============================================================

import { useParams, useRouter } from 'next/navigation'
import { useQmsQuery, useQmsMutation } from '@/hooks/useQmsQuery'
import { useAuth } from '@/contexts/AuthContext'
import { useState } from 'react'

const ENTITY_CONFIG: Record<string, { label: string; refCol: string; statusCol?: string }> = {
  documents: { label: 'Documents', refCol: 'document_number', statusCol: 'status' },
  capas: { label: 'CAPA', refCol: 'capa_number', statusCol: 'status' },
  non_conformances: { label: 'Non-Conformites', refCol: 'ncr_number', statusCol: 'status' },
  deviations: { label: 'Deviations', refCol: 'dev_number', statusCol: 'status' },
  change_controls: { label: 'Change Controls', refCol: 'cc_number', statusCol: 'status' },
  audits: { label: 'Audits', refCol: 'audit_number', statusCol: 'status' },
  training: { label: 'Formations', refCol: 'title', statusCol: 'status' },
  risks: { label: 'Risques', refCol: 'risk_number', statusCol: 'status' },
  suppliers: { label: 'Fournisseurs', refCol: 'name', statusCol: 'status' },
  batch_records: { label: 'Batch Records', refCol: 'batch_number', statusCol: 'status' },
  form_templates: { label: 'Modeles de formulaire', refCol: 'title' },
  form_instances: { label: 'Formulaires', refCol: 'reference_number', statusCol: 'status' },
}

const STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  Open: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  'In_Progress': 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  Under_Review: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  Approved: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  Effective: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  Closed: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500',
  Rejected: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  Archived: 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500',
  Completed: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  Planned: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  Overdue: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  Under_Evaluation: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  Active: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  Inactive: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500',
}

export default function EntityListPage() {
  const params = useParams()
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const entity = params.entity as string
  const config = ENTITY_CONFIG[entity]
  const [statusFilter, setStatusFilter] = useState('')

  const { data, count, loading, error, setFilters, page, setPage, totalPages } = useQmsQuery({
    entity,
    filters: statusFilter ? { status: statusFilter } : undefined,
    sort: 'created_at',
    order: 'desc',
    limit: 20,
    enabled: !!config && isAuthenticated,
  })

  const { execute: deleteRecord, loading: deleting } = useQmsMutation()

  if (!config) return <div className="p-6">Entite non reconnue: {entity}</div>

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cet enregistrement ?')) return
    await deleteRecord(entity, 'DELETE', id)
    window.location.reload()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <button onClick={() => router.push('/dashboard')} className="text-sm text-gray-500 hover:text-gray-700 mb-1">
            ← Tableau de bord
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{config.label}</h1>
          <p className="text-sm text-gray-500">{count} enregistrement(s)</p>
        </div>
        <button
          onClick={() => router.push(`/qms/${entity}/new`)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + Nouveau
        </button>
      </div>

      {/* Filtres */}
      {config.statusCol && (
        <div className="flex gap-2 mb-4 flex-wrap">
          <button
            onClick={() => setStatusFilter('')}
            className={`px-3 py-1.5 text-xs rounded-full border transition ${
              !statusFilter ? 'bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900 dark:border-white' : 'border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            Tous
          </button>
          {['Draft', 'Open', 'In_Progress', 'Under_Review', 'Approved', 'Closed', 'Archived'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs rounded-full border transition ${
                statusFilter === s ? 'bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900 dark:border-white' : 'border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              {s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Tableau */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Reference</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Titre</th>
              {config.statusCol && (
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Statut</th>
              )}
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {(!data || data.length === 0) ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                  Aucun enregistrement
                </td>
              </tr>
            ) : (
              data.map((item: any) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                    onClick={() => router.push(`/qms/${entity}/${item.id}`)}>
                  <td className="px-4 py-3 text-sm font-mono font-medium text-gray-900 dark:text-white">
                    {item[config.refCol]}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate">
                    {item.title}
                  </td>
                  {config.statusCol && (
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[item[config.statusCol]] || 'bg-gray-100 text-gray-600'}`}>
                        {(item[config.statusCol] || '').replace(/_/g, ' ')}
                      </span>
                    </td>
                  )}
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {item.created_at ? new Date(item.created_at).toLocaleDateString('fr-FR') : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(item.id) }}
                      disabled={deleting}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      {deleting ? '...' : 'Supprimer'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-800">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-lg disabled:opacity-50"
            >
              Precedent
            </button>
            <span className="text-sm text-gray-500">Page {page} / {totalPages}</span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-lg disabled:opacity-50"
            >
              Suivant
            </button>
          </div>
        )}
      </div>
    </div>
  )
}