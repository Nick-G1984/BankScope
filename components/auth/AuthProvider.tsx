'use client'

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { getAuthClient, getAccessToken } from '@/lib/auth/client'
import type { UserProfile } from '@/lib/types'

interface AuthContextValue {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  accessToken: string | null
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  loading: true,
  accessToken: null,
  refreshProfile: async () => {},
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [accessToken, setAccessToken] = useState<string | null>(null)

  const fetchProfile = useCallback(async (token: string) => {
    try {
      const res = await fetch('/api/auth/profile', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setProfile(data.profile)
      }
    } catch {
      // Profile fetch failure is non-fatal
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    const token = await getAccessToken()
    if (token) await fetchProfile(token)
  }, [fetchProfile])

  useEffect(() => {
    const client = getAuthClient()

    // Load initial session
    client.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAccessToken(session?.access_token ?? null)
      if (session?.access_token) {
        fetchProfile(session.access_token).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = client.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
      setAccessToken(session?.access_token ?? null)
      if (session?.access_token) {
        await fetchProfile(session.access_token)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  const handleSignOut = useCallback(async () => {
    await getAuthClient().auth.signOut()
    setUser(null)
    setProfile(null)
    setAccessToken(null)
  }, [])

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      accessToken,
      refreshProfile,
      signOut: handleSignOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
