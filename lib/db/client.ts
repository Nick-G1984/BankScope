import { createClient, SupabaseClient } from '@supabase/supabase-js'

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL. Add it to your .env.local file.\n' +
      'See docs/env-vars.md for setup instructions.'
    )
  }
  return url
}

function getAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_ANON_KEY. Add it to your .env.local file.\n' +
      'See docs/env-vars.md for setup instructions.'
    )
  }
  return key
}

// Lazy browser client — instantiated on first use, not at module load time.
// This prevents crashes during the Next.js build when env vars aren't present.
let _browserClient: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  if (!_browserClient) {
    _browserClient = createClient(getSupabaseUrl(), getAnonKey())
  }
  return _browserClient
}

// Convenience export (kept for any client-side usage)
export const supabase = {
  get client() {
    return getSupabaseClient()
  },
}

// Server-side admin client — uses service role key, bypasses RLS.
// Only call this in API routes, server components, or scripts — never in browser code.
export function createAdminClient(): SupabaseClient {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY. Add it to your .env.local file.\n' +
      'This key must never be exposed to the browser.\n' +
      'See docs/env-vars.md for setup instructions.'
    )
  }
  return createClient(getSupabaseUrl(), serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
