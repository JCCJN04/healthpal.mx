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
    autoRefreshToken: true,
    detectSessionInUrl: false,
    // For medical apps, we still use localStorage but rely on the 15-minute inactivity
    // timeout in AuthContext to enforce session security. sessionStorage breaks
    // Supabase's navigator.locks cross-tab synchronization and causes permanent hangs.
    storage: window.localStorage,
    storageKey: 'healthpal_auth',
  },
})

// End of file
