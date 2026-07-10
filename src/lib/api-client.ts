// Client-side API helper — all calls go through fetch() to the API routes
// credentials: 'include' is required for cookies to be sent in cross-origin/proxy environments

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
// Specific API helpers
// ============================================================================
export const api = {
  auth: {
    login: (email: string, password: string) => apiPost('/api/auth/login', { email, password }),
    logout: () => apiPost('/api/auth/logout'),
    session: () => apiGet('/api/auth/session'),
    signup: (email: string, password: string, fullName: string, orgName: string, industry: string) =>
      apiPost('/api/auth/signup', { email, password, fullName, orgName, industry }),
  },
  organizations: {
    get: () => apiGet('/api/organizations'),
    update: (data: any) => apiPut('/api/organizations', data),
  },
  profiles: {
    list: () => apiGet('/api/profiles'),
    create: (data: any) => apiPost('/api/profiles', data),
    update: (id: string, data: any) => apiPut(`/api/profiles/${id}`, data),
    delete: (id: string) => apiDelete(`/api/profiles/${id}`),
  },
  dashboard: () => apiGet('/api/dashboard'),
  documents: {
    list: (params?: { status?: string; type?: string; q?: string }) => {
      const qs = new URLSearchParams()
      if (params?.status) qs.set('status', params.status)
      if (params?.type) qs.set('type', params.type)
      if (params?.q) qs.set('q', params.q)
      return apiGet(`/api/documents?${qs}`)
    },
    get: (id: string) => apiGet(`/api/documents/${id}`),
    create: (data: any) => apiPost('/api/documents', data),
    update: (id: string, data: any) => apiPut(`/api/documents/${id}`, data),
    delete: (id: string) => apiDelete(`/api/documents/${id}`),
  },
  // Generic module CRUD factory
  module: (basePath: string) => ({
    list: (params?: { status?: string; q?: string }) => {
      const qs = new URLSearchParams()
      if (params?.status) qs.set('status', params.status)
      if (params?.q) qs.set('q', params.q)
      return apiGet(`${basePath}?${qs}`)
    },
    get: (id: string) => apiGet(`${basePath}/${id}`),
    create: (data: any) => apiPost(basePath, data),
    update: (id: string, data: any) => apiPut(`${basePath}/${id}`, data),
    delete: (id: string) => apiDelete(`${basePath}/${id}`),
  }),
  capas: () => api.module('/api/capas'),
  ncrs: () => api.module('/api/ncrs'),
  deviations: () => api.module('/api/deviations'),
  changeControls: () => api.module('/api/change-controls'),
  audits: () => api.module('/api/audits'),
  risks: () => api.module('/api/risks'),
  training: () => api.module('/api/training'),
  batchRecords: () => api.module('/api/batch-records'),
  suppliers: () => api.module('/api/suppliers'),
  recordLinks: {
    list: (recordId?: string, recordType?: string) => {
      const qs = new URLSearchParams()
      if (recordId && recordType) { qs.set('recordId', recordId); qs.set('recordType', recordType) }
      return apiGet(`/api/record-links?${qs}`)
    },
    create: (data: any) => apiPost('/api/record-links', data),
    delete: (id: string) => apiDelete(`/api/record-links?id=${id}`),
  },
  auditTrail: {
    list: (params?: { action?: string; tableName?: string; userId?: string; limit?: number }) => {
      const qs = new URLSearchParams()
      if (params?.action) qs.set('action', params.action)
      if (params?.tableName) qs.set('tableName', params.tableName)
      if (params?.userId) qs.set('userId', params.userId)
      if (params?.limit) qs.set('limit', String(params.limit))
      return apiGet(`/api/audit-trail?${qs}`)
    },
  },
  recordTypes: {
    list: () => apiGet('/api/record-types'),
    create: (data: any) => apiPost('/api/record-types', data),
    delete: (id: string) => apiDelete(`/api/record-types/${id}`),
  },
  scheduledReports: {
    list: () => apiGet('/api/scheduled-reports'),
    create: (data: any) => apiPost('/api/scheduled-reports', data),
    update: (id: string, data: any) => apiPut(`/api/scheduled-reports/${id}`, data),
    delete: (id: string) => apiDelete(`/api/scheduled-reports/${id}`),
  },
}
