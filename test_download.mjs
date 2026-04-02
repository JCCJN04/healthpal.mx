
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import 'dotenv/config';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, key);

async function test() {
  const { data, error } = await supabase.storage.from('documents').download('non-existent-path/file.pdf');
  console.log('Error:', error);
  console.log('JSON.stringify(Error):', JSON.stringify(error));
  console.log('Error.message:', error?.message);
}
test();
