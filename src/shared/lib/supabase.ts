import {
  createClient,
  type UserResponse,
  type AuthError,
  type Session,
} from '@supabase/supabase-js'
import type { Database } from '@/shared/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    'Missing Supabase credentials. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are set in your .env file.',
  )
}

// Create client using publishable key (safe for browser with RLS enabled)
export const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    // For medical apps, storing session in sessionStorage is safer than localStorage
    // as it expires when the tab is closed.
    storage: window.sessionStorage,
    storageKey: 'healthpal_auth',
  },
})

// Optimize getUser to use local session instead of network request
// This prevents rate-limiting and hanging when called frequently by independent queries
const originalGetUser = supabase.auth.getUser.bind(supabase.auth)
supabase.auth.getUser = async (jwt?: string): Promise<UserResponse> => {
  if (jwt) return originalGetUser(jwt)
  try {
    const { data, error } = await Promise.race([
      supabase.auth.getSession(),
      new Promise<{ data: { session: Session | null }; error: AuthError | null }>((_, reject) =>
        setTimeout(() => reject(new Error('getSession timeout')), 2000),
      ),
    ])
    const user = data.session?.user ?? null
    if (user) {
      return { data: { user }, error: null }
    } else {
      return {
        data: { user: null },
        error: (error as AuthError) || new Error('User not found'),
      } as UserResponse
    }
  } catch (err: unknown) {
    return { data: { user: null }, error: err as AuthError }
  }
}
