import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

async function run() {
  // Sign in as doctor (we don't have the password, so this is hard)
  // Let's use service role to just fetch a document id, then maybe we can't test RLS without auth token
}
run();
