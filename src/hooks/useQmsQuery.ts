'use client'
// ============================================================
// useQmsQuery: Hook générique pour requêter les entités QMS
// Utilise TanStack Query (ou fetch natif en fallback)
// ============================================================

import { useState, useEffect, useCallback } from 'react'

interface UseQmsQueryOptions {
  entity: string
  id?: string
  filters?: Record<string, string>
  sort?: string
  order?: 'asc' | 'desc'
  limit?: number
  offset?: number
  select?: string
  enabled?: boolean
}

interface UseQmsQueryResult<T = any> {
  data: T[] | null
  record: T | null
  count: number
  loading: boolean
  error: string | null
  refetch: () => void
  setFilters: (filters: Record<string, string>) => void
  setPage: (page: number) => void
  page: number
  totalPages: number
}

export function useQmsQuery<T = any>(options: UseQmsQueryOptions): UseQmsQueryResult<T> {
  const {
    entity, id, filters: initialFilters = {}, sort, order, limit = 20, offset: initialOffset = 0,
    select, enabled = true,
  } = options

  const [data, setData] = useState<T[] | null>(null)
  const [record, setRecord] = useState<T | null>(null)
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFiltersState] = useState(initialFilters)
  const [offset, setOffset] = useState(initialOffset)
  const [page, setPage] = useState(1)

  const fetcher = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (sort) params.set('sort', sort)
      if (order) params.set('order', order)
      params.set('limit', String(limit))
      params.set('offset', String(offset))
      if (select) params.set('select', select)
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v) })

      const url = id
        ? `/api/qms/${entity}/${id}`
        : `/api/qms/${entity}?${params.toString()}`

      const res = await fetch(url)
      if (!res.ok) throw new Error(await res.text())
      const json = await res.json()

      if (id) {
        setRecord(json)
      } else {
        setData(json.data || json)
        setCount(json.count || 0)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [entity, id, JSON.stringify(filters), sort, order, limit, offset, enabled])

  useEffect(() => { fetcher() }, [fetcher])

  const setFilters = useCallback((newFilters: Record<string, string>) => {
    setFiltersState(newFilters)
    setOffset(0)
    setPage(1)
  }, [])

  const setPageHandler = useCallback((p: number) => {
    setPage(p)
    setOffset((p - 1) * limit)
  }, [limit])

  return {
    data, record, count, loading, error, refetch: fetcher,
    setFilters, setPage: setPageHandler, page,
    totalPages: Math.ceil(count / limit),
  }
}

// Hook pour les mutations (POST / PUT / DELETE)
export function useQmsMutation<T = any>() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const execute = async (
    entity: string,
    method: 'POST' | 'PUT' | 'DELETE',
    id: string | null,
    body?: Record<string, any>,
    options?: { hard?: boolean }
  ): Promise<T | null> => {
    setLoading(true)
    setError(null)
    try {
      let url = id ? `/api/qms/${entity}/${id}` : `/api/qms/${entity}`
      if (options?.hard) url += '?hard=true'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Erreur')
      }

      return res.status === 204 ? null : await res.json()
    } catch (err: any) {
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }

  return { execute, loading, error, setError }
}