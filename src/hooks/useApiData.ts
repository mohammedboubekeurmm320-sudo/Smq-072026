'use client'

import { useState, useEffect, useCallback } from 'react'

// Generic hook for fetching data from API with loading/error states
export function useApiData<T>(fetcher: () => Promise<T>, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const d = await fetcher()
      setData(d)
    } catch (e: any) {
      setError(e.message || 'Erreur')
    } finally {
      setLoading(false)
    }
  }, deps)

  useEffect(() => { refetch() }, [refetch])

  return { data, loading, error, refetch, setData }
}
