/**
 * Browser-side auth helpers.
 * Uses the standard @supabase/supabase-js client with Supabase Auth.
 * Session is persisted automatically in localStorage.
 */

import { createClient, type SupabaseClient, type Session, type User } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

export function getAuthClient(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    _client = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }
  return _client
}

/** Get current session — null if not signed in */
export async function getSession(): Promise<Session | null> {
  const { data: { session } } = await getAuthClient().auth.getSession()
  return session
}

/** Get access token for API calls — null if not signed in */
export async function getAccessToken(): Promise<string | null> {
  const session = await getSession()
  return session?.access_token ?? null
}

/** Get the current user — null if not signed in */
export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession()
  return session?.user ?? null
}

export async function signIn(email: string, password: string) {
  return getAuthClient().auth.signInWithPassword({ email, password })
}

export async function signUp(email: string, password: string) {
  return getAuthClient().auth.signUp({ email, password })
}

export async function signOut() {
  return getAuthClient().auth.signOut()
}

/** Subscribe to auth state changes */
export function onAuthChange(callback: (user: User | null) => void) {
  return getAuthClient().auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null)
  })
}
