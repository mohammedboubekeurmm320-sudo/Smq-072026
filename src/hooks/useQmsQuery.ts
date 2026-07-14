'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client'
import { getEntityConfig } from '@/lib/qms-entity-map'

// ── Types ──────────────────────────────────────────────────────────────────
interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  total: number
  page: number
  limit: number
}

interface SingleResponse<T> {
  success: boolean
  data: T
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

  // Build query string
  const qs = new URLSearchParams()
  if (params.page) qs.set('page', String(params.page))
  if (params.limit) qs.set('limit', String(params.limit))
  if (params.sort) qs.set('sort', params.sort)
  if (params.order) qs.set('order', params.order)
  if (params.status) qs.set('status', params.status)
  if (params.q) qs.set('q', params.q)
  Object.entries(params).forEach(([k, v]) => {
    if (!['page', 'limit', 'sort', 'order', 'status', 'q'].includes(k) && v !== undefined && v !== '') {
      qs.set(k, String(v))
    }
  })
  const queryString = qs.toString()
  const url = queryString ? `${basePath}?${queryString}` : basePath

  // LIST query
  const listQuery = useQuery({
    queryKey: ['qms', entitySlug, params],
    queryFn: () => apiGet<PaginatedResponse<T>>(url),
    select: (res) => ({ items: res.data, total: res.total, page: res.page, limit: res.limit }),
  })

  // GET by ID
  const getById = (id: string) =>
    apiGet<SingleResponse<T>>(`${basePath}/${id}`).then(r => r.data)

  // CREATE mutation
  const createMutation = useMutation({
    mutationFn: (data: Partial<T>) => apiPost<SingleResponse<T>>(basePath, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qms', entitySlug] })
    },
  })

  // UPDATE mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<T> }) =>
      apiPut<SingleResponse<T>>(`${basePath}/${id}`, data),
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
    staleTime: 30_000, // 30 seconds
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
    queryFn: () => apiGet<any>(`/api/audit${queryString ? `?${queryString}` : ''}`),
    staleTime: 15_000,
  })
}

// ── Notifications ──────────────────────────────────────────────────────────
export function useNotifications(limit: number = 20) {
  return useQuery({
    queryKey: ['notifications', limit],
    queryFn: () => apiGet<any>(`/api/qms/notifications?limit=${limit}&sort=createdAt&order=desc`),
    staleTime: 10_000,
  })
}

// ── React Query Provider ───────────────────────────────────────────────────
// Add this to the root layout