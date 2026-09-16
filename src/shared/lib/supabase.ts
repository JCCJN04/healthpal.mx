import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/shared/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    'Missing Supabase credentials. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are set in your .env file.',
  )
}

// Clear any stale locks from gotrue-js polyfill that cause infinite hangs
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    const lockKeys = ['supabase.auth.lock', 'healthpal_auth-lock']
    lockKeys.forEach((k) => window.localStorage.removeItem(k))
  }
} catch (e) {
  // Ignore errors if localStorage is inaccessible
}

// No-op lock function to bypass all lock contention and deadlocks on visibility changes / multi-query operations
const lockNoOp = async <R>(
  _name: string,
  _acquireTimeout: number,
  fn: () => Promise<R>,
): Promise<R> => {
  return await fn()
}

// Create client using publishable key (safe for browser with RLS enabled)
export const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storage: window.localStorage,
    storageKey: 'healthpal_auth',
    // Bypass navigator.locks and sequential memory locks completely to prevent infinite hangs
    lock: lockNoOp,
  },
})

// End of file
