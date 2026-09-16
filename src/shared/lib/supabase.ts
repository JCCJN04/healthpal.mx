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

// Global memory lock to completely bypass buggy navigator.locks in gotrue-js
let globalLock: Promise<void> = Promise.resolve()
// gotrue-js LockFunc signature: (name: string, acquireTimeout: number, acquire: () => Promise<R>) => Promise<R>
const memoryLock = async <R>(
  _name: string,
  _acquireTimeout: number,
  acquire: () => Promise<R>,
): Promise<R> => {
  const previous = globalLock
  let release: () => void
  globalLock = new Promise((res) => {
    release = res
  })
  try {
    await previous
    return await acquire()
  } finally {
    release!()
  }
}

// Create client using publishable key (safe for browser with RLS enabled)
export const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storage: window.localStorage,
    storageKey: 'healthpal_auth',
    // Bypass navigator.locks completely to prevent infinite hangs
    lock: memoryLock,
  },
})

// End of file
