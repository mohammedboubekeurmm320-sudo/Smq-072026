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