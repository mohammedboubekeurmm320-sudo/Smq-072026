'use client'

import { createContext, useContext, useEffect, useState, type ReactNode, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api-client'
import { rolePermissions, type UserRole, type Permission, type OrgSettings, type SessionUser } from '@/types/qms'

interface AuthContextValue {
  profile: {
    id: string; email: string; fullName: string; role: UserRole
    department?: string | null; jobTitle?: string | null
    organizationId: string
  } | null
  organization: {
    id: string; name: string; slug: string
    settings: OrgSettings
  } | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  signup: (email: string, password: string, fullName: string, orgName: string, industry: any) => Promise<{ ok: boolean; error?: string }>
  logout: () => Promise<void>
  hasPermission: (perm: Permission) => boolean
  hasRole: (...roles: UserRole[]) => boolean
  refreshSession: () => Promise<void>
  user: SessionUser | null
  updateOrgSettings: (settings: Partial<OrgSettings>) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<AuthContextValue['profile']>(null)
  const [organization, setOrganization] = useState<AuthContextValue['organization']>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const refreshSession = useCallback(async () => {
    try {
      const data = await api.auth.session()
      if (data?.session) {
        setProfile(data.session.profile)
        setOrganization(data.session.organization)
      } else {
        setProfile(null)
        setOrganization(null)
      }
    } catch {
      setProfile(null)
      setOrganization(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshSession()
  }, [refreshSession])

  const login = async (email: string, password: string) => {
    try {
      await api.auth.login(email, password)
      await refreshSession()
      return { ok: true }
    } catch (e: any) {
      return { ok: false, error: e.message || 'Erreur' }
    }
  }

  const signup = async (email: string, password: string, fullName: string, orgName: string, industry: any) => {
    try {
      await api.auth.signup(email, password, fullName, orgName, industry)
      await refreshSession()
      return { ok: true }
    } catch (e: any) {
      return { ok: false, error: e.message || 'Erreur' }
    }
  }

  const logout = async () => {
    try { await api.auth.logout() } catch {}
    setProfile(null)
    setOrganization(null)
    router.push('/')
  }

  const hasPermission = (perm: Permission): boolean => {
    if (!profile) return false
    return (rolePermissions[profile.role] || []).includes(perm)
  }

  const hasRole = (...roles: UserRole[]): boolean => {
    if (!profile) return false
    return roles.includes(profile.role)
  }

  const updateOrgSettings = async (settings: Partial<OrgSettings>) => {
    if (!organization) return
    try {
      await api.organizations.update({ settings })
      await refreshSession()
    } catch (e: any) {
      console.error('updateOrgSettings error:', e)
    }
  }

  const user: SessionUser | null = profile && organization ? {
    id: profile.id, email: profile.email, fullName: profile.fullName,
    role: profile.role, department: profile.department, jobTitle: profile.jobTitle,
    organizationId: organization.id, organizationName: organization.name, organizationSlug: organization.slug,
    orgSettings: organization.settings,
    hasPermission,
  } : null

  return (
    <AuthContext.Provider value={{ profile, organization, loading, login, signup, logout, hasPermission, hasRole, refreshSession, user, updateOrgSettings }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
