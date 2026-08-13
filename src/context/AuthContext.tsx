import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/services/supabase'
import { getAgencySession, signOutAgency } from '@/services/agencyAuth.service'
import type { ResponseAgency } from '@/types/responseAgency'

export type UserRole = 'citizen' | 'lgu' | 'ngo' | 'volunteer' | 'admin' | 'agency'

export interface Profile {
  id: string
  full_name: string | null
  role: UserRole
  barangay: string | null
  municipality: string | null
  phone: string | null
}

interface AuthContextValue {
  user: User | null
  profile: Profile | null
  agency: ResponseAgency | null
  role: UserRole | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [agency, setAgency] = useState<ResponseAgency | null>(() => getAgencySession())
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data ?? null)
  }

  useEffect(() => {
    // Check if logged in as response agency first
    const activeAgency = getAgencySession()
    if (activeAgency) {
      setAgency(activeAgency)
      setProfile({
        id: activeAgency.id,
        full_name: activeAgency.name,
        role: 'agency',
        barangay: null,
        municipality: null,
        phone: activeAgency.contacts?.[0]?.value || null,
      })
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(async ({ data }) => {
      const u = data.session?.user ?? null
      setUser(u)
      if (u) await fetchProfile(u.id)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      const u = session?.user ?? null
      setUser(u)

      if (u) {
        if (event !== 'TOKEN_REFRESHED') {
          await fetchProfile(u.id)
        }
      } else {
        // If not agency, clear profile
        if (!getAgencySession()) {
          setProfile(null)
        }
      }
      setLoading(false)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    signOutAgency()
    setAgency(null)
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  const refreshProfile = async () => {
    const activeAgency = getAgencySession()
    if (activeAgency) {
      setAgency(activeAgency)
      setProfile({
        id: activeAgency.id,
        full_name: activeAgency.name,
        role: 'agency',
        barangay: null,
        municipality: null,
        phone: activeAgency.contacts?.[0]?.value || null,
      })
      return
    }
    if (user) await fetchProfile(user.id)
  }

  const computedRole: UserRole | null = agency ? 'agency' : profile?.role ?? null

  return (
    <AuthContext.Provider value={{ user, profile, agency, role: computedRole, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
