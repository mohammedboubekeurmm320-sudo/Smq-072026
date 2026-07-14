'use client'
// ============================================================
// AuthContext: Custom auth (remplace Supabase Auth)
// Gère login/logout/session/switch org
// ============================================================

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

interface User {
  id: string
  email: string
  full_name: string
  role: string
}

interface Membership {
  organization_id: string
  role: string
  organization: { id: string; name: string }
}

interface AuthContextType {
  user: User | null
  memberships: Membership[]
  currentOrgId: string | null
  currentOrgName: string | null
  loading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  switchOrg: (orgId: string) => Promise<void>
  refreshSession: () => Promise<void>
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null)
  const [currentOrgName, setCurrentOrgName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshSession = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/auth/session')
      if (res.status === 401) {
        setUser(null)
        setMemberships([])
        return
      }
      const data = await res.json()
      if (data.authenticated && data.profile) {
        const p = data.profile
        setUser({
          id: p.profile_id || p.id,
          email: p.email,
          full_name: p.full_name,
          role: p.org_role || 'member',
        })
        setMemberships(data.memberships || [])

        // Déterminer l'org courante
        const cookieOrg = document.cookie
          .split('; ')
          .find(c => c.startsWith('current_org_id='))
          ?.split('=')[1]

        const orgId = cookieOrg || p.organization_id || data.memberships?.[0]?.organization_id
        setCurrentOrgId(orgId)
        const org = data.memberships?.find((m: Membership) => m.organization_id === orgId)
        setCurrentOrgName(org?.organization?.name || p.organization_name || null)
      }
    } catch {
      setError('Erreur de session')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshSession()
  }, [refreshSession])

  const login = async (email: string, password: string) => {
    setError(null)
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Erreur de connexion')
    await refreshSession()
  }

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    setMemberships([])
    setCurrentOrgId(null)
    window.location.href = '/login'
  }

  const switchOrg = async (orgId: string) => {
    const res = await fetch('/api/auth/switch-org', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organizationId: orgId }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    setCurrentOrgId(orgId)
    const org = memberships.find(m => m.organization_id === orgId)
    setCurrentOrgName(org?.organization?.name || null)
    // Recharger la page pour rafraîchir les données
    window.location.reload()
  }

  return (
    <AuthContext.Provider
      value={{
        user, memberships, currentOrgId, currentOrgName,
        loading, error,
        login, logout, switchOrg, refreshSession,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export default AuthContext