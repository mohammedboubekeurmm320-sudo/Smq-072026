// Client-side API helper — all calls go through fetch() to the API routes
// All API responses must follow { success: boolean, data: T, error?: string }

export async function apiGet<T = any>(path: string): Promise<T> {
  const r = await fetch(path, { credentials: 'include' })
  const d = await r.json()
  if (!r.ok || !d.success) throw new Error(d.error || `HTTP ${r.status}`)
  return d.data as T
}

export async function apiPost<T = any>(path: string, body?: any): Promise<T> {
  const r = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: 'include',
  })
  const d = await r.json()
  if (!r.ok || !d.success) throw new Error(d.error || `HTTP ${r.status}`)
  return d.data as T
}

export async function apiPut<T = any>(path: string, body: any): Promise<T> {
  const r = await fetch(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'include',
  })
  const d = await r.json()
  if (!r.ok || !d.success) throw new Error(d.error || `HTTP ${r.status}`)
  return d.data as T
}

export async function apiDelete<T = any>(path: string): Promise<T> {
  const r = await fetch(path, { method: 'DELETE', credentials: 'include' })
  const d = await r.json()
  if (!r.ok || !d.success) throw new Error(d.error || `HTTP ${r.status}`)
  return d.data as T
}

// ============================================================================
// Module factory — used by useModule hook for typed CRUD on any entity
// ============================================================================

interface ModuleApi {
  list: (params?: { status?: string; q?: string; sort?: string; order?: string; limit?: number; offset?: number }) => Promise<{ items: any[]; count: number }>
  getById: (id: string) => Promise<any>
  create: (data: any) => Promise<{ item: any }>
  update: (id: string, patch: any) => Promise<{ item: any }>
  delete: (id: string) => Promise<void>
  transition: (id: string, newStatus: string, eSigPassword?: string, eSigHash?: string) => Promise<any>
}

export const api = {
  module(basePath: string): ModuleApi {
    const entity = basePath.replace(/^\//, '')
    return {
      list: async (params) => {
        const sp = new URLSearchParams()
        if (params?.status) sp.set('status', params.status)
        if (params?.q) sp.set('q', params.q)
        if (params?.sort) sp.set('sort', params.sort)
        if (params?.order) sp.set('order', params.order)
        if (params?.limit) sp.set('limit', String(params.limit))
        if (params?.offset) sp.set('offset', String(params.offset))
        const qs = sp.toString()
        return apiGet(`/api/qms/${entity}${qs ? `?${qs}` : ''}`)
      },
      getById: (id) => apiGet(`/api/qms/${entity}/${id}`),
      create: (data) => {
        const item = apiPost(`/api/qms/${entity}`, data)
        return item.then((d: any) => ({ item: d }))
      },
      update: (id, patch) => {
        const item = apiPut(`/api/qms/${entity}/${id}`, patch)
        return item.then((d: any) => ({ item: d }))
      },
      delete: (id) => apiDelete(`/api/qms/${entity}/${id}`),
      transition: (id, newStatus, eSigPassword, eSigHash) =>
        apiPost(`/api/qms/${entity}/${id}/transition`, { newStatus, eSigPassword, eSigHash }),
    }
  },
}