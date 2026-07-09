'use client'

import { create } from 'zustand'
import type { SessionUser } from '@/lib/types'

interface AuthState {
  user: SessionUser | null
  loading: boolean
  setUser: (u: SessionUser | null) => void
  setLoading: (b: boolean) => void
  fetchUser: () => Promise<void>
  logout: () => Promise<void>
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: true,
  setUser: (u) => set({ user: u }),
  setLoading: (b) => set({ loading: b }),
  fetchUser: async () => {
    try {
      const r = await fetch('/api/auth')
      const d = await r.json()
      set({ user: d.user || null, loading: false })
    } catch {
      set({ loading: false })
    }
  },
  logout: async () => {
    await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout' }) })
    set({ user: null })
  }
}))
