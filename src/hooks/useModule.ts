'use client'

import { useState, useCallback, useEffect } from 'react'
import { api } from '@/lib/api-client'

// Generic hook for a module's CRUD operations via API
export function useModule(basePath: string) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const list = useCallback(async (params?: { status?: string; q?: string }) => {
    setLoading(true); setError(null)
    try {
      const m = api.module(basePath)
      const data = await m.list(params)
      setItems((data as any).items || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [basePath])

  const create = useCallback(async (data: any) => {
    const m = api.module(basePath)
    const r = await m.create(data)
    await list()
    return (r as any).item
  }, [basePath, list])

  const update = useCallback(async (id: string, patch: any) => {
    const m = api.module(basePath)
    const r = await m.update(id, patch)
    await list()
    return (r as any).item
  }, [basePath, list])

  const remove = useCallback(async (id: string) => {
    const m = api.module(basePath)
    await m.delete(id)
    await list()
  }, [basePath, list])

  useEffect(() => { list() }, [list])

  return { items, loading, error, create, update, remove, refetch: list, setItems }
}
