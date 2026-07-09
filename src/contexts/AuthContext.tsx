'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useQmsStore, type Profile, type Organization } from '@/lib/demo-store'
import { rolePermissions, type Permission, type UserRole, type SessionUser, type OrgSettings, type IndustryType } from '@/types/qms'

interface AuthContextValue {
  profile: Profile | null
  organization: Organization | null
  session: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  signup: (email: string, password: string, fullName: string, orgName: string, industry: IndustryType) => Promise<{ ok: boolean; error?: string }>
  logout: () => void
  hasPermission: (perm: Permission) => boolean
  hasRole: (...roles: UserRole[]) => boolean
  refreshSession: () => void
  user: SessionUser | null
  updateOrgSettings: (settings: Partial<OrgSettings>) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)
const SESSION_KEY = 'qms_demo_session'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const store = useQmsStore

  useEffect(() => {
    let cancelled = false
    const timeout = setTimeout(() => { if (!cancelled) { console.warn('[auth] init timeout - forcing loading=false'); setLoading(false) } }, 8000)
    ;(async () => {
      try {
        await store.getState().init()
        if (cancelled) return
        const savedSession = typeof window !== 'undefined' ? localStorage.getItem(SESSION_KEY) : null
        if (savedSession) {
          const p = store.getState().getProfileFromSession(savedSession)
          const o = store.getState().getOrganizationFromSession(savedSession)
          if (p && o) {
            setSession(savedSession); setProfile(p); setOrganization(o)
          } else {
            localStorage.removeItem(SESSION_KEY)
          }
        }
        setLoading(false)
        clearTimeout(timeout)
      } catch (e) {
        console.error('[auth] init error:', e)
        setLoading(false)
        clearTimeout(timeout)
      }
    })()
    return () => { cancelled = true; clearTimeout(timeout) }
  }, [])

  const login = async (email: string, password: string) => {
    const r = await store.getState().login(email, password)
    if (!r.ok || !r.session || !r.profile || !r.organization) {
      return { ok: false, error: r.error || 'Erreur' }
    }
    localStorage.setItem(SESSION_KEY, r.session)
    setSession(r.session); setProfile(r.profile); setOrganization(r.organization)
    return { ok: true }
  }

  const signup = async (email: string, password: string, fullName: string, orgName: string, industry: IndustryType) => {
    const r = await store.getState().signup(email, password, fullName, orgName, industry)
    if (!r.ok || !r.session || !r.profile || !r.organization) {
      return { ok: false, error: r.error || 'Erreur' }
    }
    localStorage.setItem(SESSION_KEY, r.session)
    setSession(r.session); setProfile(r.profile); setOrganization(r.organization)
    return { ok: true }
  }

  const logout = () => {
    if (session) store.getState().logout(session)
    localStorage.removeItem(SESSION_KEY)
    setSession(null); setProfile(null); setOrganization(null)
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

  const refreshSession = () => {
    if (!session) return
    const p = store.getState().getProfileFromSession(session)
    const o = store.getState().getOrganizationFromSession(session)
    setProfile(p); setOrganization(o)
  }

  const updateOrgSettings = (settings: Partial<OrgSettings>) => {
    if (!organization) return
    store.getState().updateOrgSettings(organization.id, settings)
    const updated = store.getState().organizations.find(o => o.id === organization.id) || null
    setOrganization(updated)
  }

  const user: SessionUser | null = profile && organization ? {
    id: profile.id, email: profile.email, fullName: profile.fullName,
    role: profile.role, department: profile.department, jobTitle: profile.jobTitle,
    organizationId: organization.id, organizationName: organization.name, organizationSlug: organization.slug,
    orgSettings: organization.settings,
    hasPermission,
  } : null

  return (
    <AuthContext.Provider value={{ profile, organization, session, loading, login, signup, logout, hasPermission, hasRole, refreshSession, user, updateOrgSettings }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
