import { createClient } from '@supabase/supabase-js'
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
    // Disable autoRefreshToken to prevent the background timer from acquiring navigator.locks
    // and causing permanent deadlocks. AuthContext handles inactivity logouts (15 min),
    // and getSession() automatically refreshes expired tokens on page load anyway.
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storage: window.localStorage,
    storageKey: 'healthpal_auth',
  },
})

// End of file
