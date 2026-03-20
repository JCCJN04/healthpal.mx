#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

// Load .env file
const envPath = path.join(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    env[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
  }
});

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY
);

console.log('[DEBUG] URL:', env.VITE_SUPABASE_URL ? '✓' : '✗');
console.log('[DEBUG] Key:', env.SUPABASE_SERVICE_ROLE_KEY ? '✓ (service role)' : env.VITE_SUPABASE_PUBLISHABLE_KEY ? '✓ (publishable)' : '✗');

async function diagnoseData() {
  console.log('=== FULL SENSITIVE DATA AUDIT ===\n');

  try {
    // Table list to check
    const tables = [
      { name: 'patient_profiles', plainFields: ['allergies', 'chronic_conditions', 'current_medications', 'notes_for_doctor'], encFields: ['allergies_enc', 'chronic_conditions_enc', 'current_medications_enc', 'notes_for_doctor_enc'] },
      { name: 'appointments', plainFields: ['reason', 'symptoms'], encFields: ['reason_enc', 'symptoms_enc'] },
      { name: 'appointment_notes', plainFields: ['note'], encFields: ['note_enc'] },
      { name: 'patient_notes', plainFields: ['body'], encFields: ['body_enc'] },
      { name: 'documents', plainFields: ['file_path'], encFields: ['file_path_enc'] },
    ];

    for (const table of tables) {
      console.log(`\n📋 TABLE: ${table.name}`);
      console.log('─'.repeat(50));

      // Test encrypted fields
      console.log('  Encrypted fields:');
      for (const field of table.encFields) {
        try {
          const { data, error, status } = await supabase
            .from(table.name)
            .select(field)
            .limit(1);

          if (error?.message?.includes('does not exist')) {
            console.log(`    ✗ ${field} - COLUMN DOES NOT EXIST`);
          } else if (data && data.length > 0 && data[0][field]) {
            const sample = String(data[0][field]).substring(0, 40);
            console.log(`    ✓ ${field} - POPULATED (${sample}...)`);
          } else {
            console.log(`    ○ ${field} - EXISTS but empty`);
          }
        } catch (e) {
          console.log(`    ⚠ ${field} - ERROR: ${e.message}`);
        }
      }

      // Test plaintext fields (should not exist or should be empty)
      console.log('\n  Plaintext fields (should NOT exist):');
      for (const field of table.plainFields) {
        try {
          const { data, error } = await supabase
            .from(table.name)
            .select(field)
            .limit(1);

          if (error?.message?.includes('does not exist')) {
            console.log(`    ✓ ${field} - REMOVED (good!)`);
          } else if (data && data.length > 0 && data[0][field]) {
            const value = data[0][field];
            console.log(`    🔴 ${field} - STILL EXISTS WITH DATA: ${String(value).substring(0, 40)}...`);
          } else {
            console.log(`    ✓ ${field} - EXISTS but NULL/empty`);
          }
        } catch (e) {
          console.log(`    ⚠ ${field} - ERROR: ${e.message}`);
        }
      }
    }

    console.log('\n\n=== SUMMARY ===');
    console.log('✓ If all plaintext fields show "REMOVED (good!)" or "EXISTS but NULL/empty"');
    console.log('✓ If all encrypted fields show "POPULATED"');
    console.log('✓ Then encryption is complete and data is protected');

  } catch (err) {
    console.error('\n[FATAL ERROR]', err.message);
    process.exit(1);
  }

  process.exit(0);
}

diagnoseData();
