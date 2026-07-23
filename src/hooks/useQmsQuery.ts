'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'
import { getEntityConfig } from '@/lib/qms-entity-map'

// ── Types ──────────────────────────────────────────────────────────────────
interface ListResponse<T> {
  items: T[]
  count: number
}

interface QueryParams {
  page?: number
  limit?: number
  sort?: string
  order?: 'asc' | 'desc'
  status?: string
  q?: string
  [key: string]: any
}

// ── Generic Entity CRUD Hook ───────────────────────────────────────────────
export function useQmsEntity<T = any>(entitySlug: string, params: QueryParams = {}) {
  const queryClient = useQueryClient()
  const config = getEntityConfig(entitySlug)
  const basePath = `/api/qms/${entitySlug}`

  // Build query string — convert page to offset
  const limit = params.limit || 20
  const offset = ((params.page || 1) - 1) * limit

  const qs = new URLSearchParams()
  qs.set('limit', String(limit))
  qs.set('offset', String(offset))
  if (params.sort) qs.set('sort', params.sort)
  if (params.order) qs.set('order', params.order)
  if (params.status) qs.set('status', params.status)
  if (params.q) qs.set('title', `ilike:${params.q}`)
  Object.entries(params).forEach(([k, v]) => {
    if (!['page', 'limit', 'sort', 'order', 'status', 'q'].includes(k) && v !== undefined && v !== '') {
      qs.set(k, String(v))
    }
  })
  const queryString = qs.toString()
  const url = `${basePath}?${queryString}`

  // LIST query
  const listQuery = useQuery({
    queryKey: ['qms', entitySlug, params],
    queryFn: () => apiGet<ListResponse<T>>(url),
    select: (res) => ({
      items: res.items || [],
      total: res.count || 0,
      page: params.page || 1,
      totalPages: Math.ceil((res.count || 0) / limit),
    }),
  })

  // GET by ID
  const getById = (id: string) =>
    apiGet<T>(`${basePath}/${id}`)

  // CREATE mutation
  const createMutation = useMutation({
    mutationFn: (data: Partial<T>) => apiPost<T>(basePath, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qms', entitySlug] })
    },
  })

  // UPDATE mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<T> }) =>
      apiPut<T>(`${basePath}/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qms', entitySlug] })
    },
  })

  // DELETE mutation (soft delete via API)
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`${basePath}/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qms', entitySlug] })
    },
  })

  return {
    config,
    // List
    items: listQuery.data?.items ?? [],
    total: listQuery.data?.total ?? 0,
    page: listQuery.data?.page ?? 1,
    totalPages: listQuery.data?.totalPages ?? 1,
    isLoading: listQuery.isLoading,
    isError: listQuery.isError,
    error: listQuery.error,
    refetch: listQuery.refetch,
    // CRUD
    getById,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}

// ── Dashboard KPIs ─────────────────────────────────────────────────────────
export function useDashboardKpis() {
  return useQuery({
    queryKey: ['dashboard', 'kpis'],
    queryFn: () => apiGet<any>('/api/dashboard?view=kpi'),
    staleTime: 30_000,
  })
}

// ── Upcoming Deadlines ─────────────────────────────────────────────────────
export function useDeadlines(days: number = 14) {
  return useQuery({
    queryKey: ['dashboard', 'deadlines', days],
    queryFn: () => apiGet<any>(`/api/dashboard?view=deadlines&days=${days}`),
    staleTime: 60_000,
  })
}

// ── Audit Trail ────────────────────────────────────────────────────────────
export function useAuditTrail(params: { entity?: string; recordId?: string; limit?: number } = {}) {
  const qs = new URLSearchParams()
  if (params.entity) qs.set('entity', params.entity)
  if (params.recordId) qs.set('recordId', params.recordId)
  if (params.limit) qs.set('limit', String(params.limit))
  const queryString = qs.toString()

  return useQuery({
    queryKey: ['audit-trail', params],
    queryFn: () => apiGet<any>(`/api/audit-trail${queryString ? `?${queryString}` : ''}`),
    staleTime: 15_000,
  })
}

// ── Notifications ──────────────────────────────────────────────────────────
export function useNotifications(limit: number = 20) {
  return useQuery({
    queryKey: ['notifications', limit],
    // IMPORTANT: la colonne PostgreSQL est `created_at` (snake_case).
    // L'API fait aussi la conversion camelCase → snake_case côté serveur,
    // mais on envoie directement le bon nom pour éviter toute ambiguïté.
    queryFn: () => apiGet<any>(`/api/qms/notifications?limit=${limit}&sort=created_at&order=desc`),
    staleTime: 10_000,
  })
}