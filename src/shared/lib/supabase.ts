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
export const supabase = createClient<Database>(
  supabaseUrl,
  supabasePublishableKey,
  // Bypass TypeScript strict checking to provide a custom lock implementation
  // that prevents navigator.locks deadlocks which cause infinite loading spinners.
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storage: window.localStorage,
      storageKey: 'healthpal_auth',
      // Provide dummy lock to disable navigator.locks deadlock completely
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      lock: (_name: string, acquire: () => Promise<any>) => acquire(),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any,
)

// End of file
