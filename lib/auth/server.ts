/**
 * Server-side auth helpers.
 * Used in API routes to verify the user's JWT token.
 *
 * Pattern: client passes Authorization: Bearer <access_token> header.
 * We verify the token against Supabase using the admin client.
 */

import { createAdminClient } from '../db/client'
import type { User } from '@supabase/supabase-js'

export interface AuthResult {
  user: User
  userId: string
}

/**
 * Extract and verify the Bearer token from a Request.
 * Returns the authenticated user, or throws with a descriptive error.
 */
export async function requireAuth(request: Request): Promise<AuthResult> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthError('Missing or invalid Authorization header. Expected: Bearer <token>', 401)
  }

  const token = authHeader.slice(7).trim()
  if (!token) {
    throw new AuthError('Empty token', 401)
  }

  const db = createAdminClient()
  const { data: { user }, error } = await db.auth.getUser(token)

  if (error || !user) {
    throw new AuthError('Invalid or expired token. Please sign in again.', 401)
  }

  return { user, userId: user.id }
}

/** Try to get the user — returns null if not authenticated (no throw) */
export async function optionalAuth(request: Request): Promise<AuthResult | null> {
  try {
    return await requireAuth(request)
  } catch {
    return null
  }
}

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 401
  ) {
    super(message)
    this.name = 'AuthError'
  }
}
