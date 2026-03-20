#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const ENV_PATH = path.join(ROOT, ".env");

const TARGET_FIELDS = [
  { table: "patient_notes", plainColumn: "body", encColumn: "body_enc" },
  { table: "appointment_notes", plainColumn: "note", encColumn: "note_enc" },
  { table: "appointments", plainColumn: "reason", encColumn: "reason_enc" },
  { table: "appointments", plainColumn: "symptoms", encColumn: "symptoms_enc" },
  { table: "patient_profiles", plainColumn: "allergies", encColumn: "allergies_enc" },
  { table: "patient_profiles", plainColumn: "chronic_conditions", encColumn: "chronic_conditions_enc" },
  { table: "patient_profiles", plainColumn: "current_medications", encColumn: "current_medications_enc" },
  { table: "patient_profiles", plainColumn: "notes_for_doctor", encColumn: "notes_for_doctor_enc" },
  { table: "patient_profiles", plainColumn: "insurance_policy_number", encColumn: "insurance_policy_number_enc" },
  { table: "patient_profiles", plainColumn: "emergency_contact_name", encColumn: "emergency_contact_name_enc" },
  { table: "patient_profiles", plainColumn: "emergency_contact_phone", encColumn: "emergency_contact_phone_enc" },
  { table: "documents", plainColumn: "file_path", encColumn: "file_path_enc" },
  { table: "documents", plainColumn: "checksum", encColumn: "checksum_enc" },
];

function parseDotEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, "utf8");
  const env = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const idx = line.indexOf("=");
    if (idx <= 0) {
      continue;
    }
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim().replace(/^['\"]|['\"]$/g, "");
    env[key] = value;
  }

  return env;
}

async function countUnencryptedRows(supabase, table, plainColumn, encColumn) {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .not(plainColumn, "is", null)
    .neq(plainColumn, "")
    .is(encColumn, null);

  if (error) {
    throw new Error(`Conteo fallo en ${table}.${plainColumn}: ${error.message}`);
  }

  return count || 0;
}

function isMissingColumnError(error) {
  const message = String(error?.message || "").toLowerCase();
  return message.includes("column") && message.includes("does not exist");
}

async function columnExists(supabase, table, column) {
  const { error } = await supabase
    .from(table)
    .select(column)
    .limit(1);

  if (!error) {
    return true;
  }

  if (isMissingColumnError(error)) {
    return false;
  }

  throw new Error(`No se pudo validar columna ${table}.${column}: ${error.message}`);
}

async function countResidualPlaintextRows(supabase, table, plainColumn) {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .not(plainColumn, "is", null)
    .neq(plainColumn, "");

  if (error) {
    throw new Error(`Conteo plaintext residual fallo en ${table}.${plainColumn}: ${error.message}`);
  }

  return count || 0;
}

async function countQueueStatus(supabase, status) {
  const { count, error } = await supabase
    .from("encryption_backfill_queue")
    .select("id", { count: "exact", head: true })
    .eq("status", status);

  if (error) {
    throw new Error(`Conteo queue status=${status} fallo: ${error.message}`);
  }

  return count || 0;
}

async function main() {
  const env = {
    ...parseDotEnv(ENV_PATH),
    ...process.env,
  };

  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("Falta VITE_SUPABASE_URL o SUPABASE_URL");
  }
  if (!serviceRoleKey) {
    throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const fieldCounts = [];
  for (const field of TARGET_FIELDS) {
    const plainColumnPresent = await columnExists(
      supabase,
      field.table,
      field.plainColumn
    );

    if (!plainColumnPresent) {
      fieldCounts.push({
        table: field.table,
        plainColumn: field.plainColumn,
        encColumn: field.encColumn,
        uncovered: 0,
        residualPlaintext: 0,
        dropped: true,
      });
      continue;
    }

    const uncovered = await countUnencryptedRows(
      supabase,
      field.table,
      field.plainColumn,
      field.encColumn
    );
    const residualPlaintext = await countResidualPlaintextRows(
      supabase,
      field.table,
      field.plainColumn
    );
    fieldCounts.push({
      table: field.table,
      plainColumn: field.plainColumn,
      encColumn: field.encColumn,
      uncovered,
      residualPlaintext,
      dropped: false,
    });
  }

  const queue = {
    pending: await countQueueStatus(supabase, "pending"),
    processing: await countQueueStatus(supabase, "processing"),
    error: await countQueueStatus(supabase, "error"),
  };

  const totalUncovered = fieldCounts.reduce((acc, item) => acc + item.uncovered, 0);
  const totalResidualPlaintext = fieldCounts.reduce(
    (acc, item) => acc + item.residualPlaintext,
    0
  );

  const report = {
    generatedAt: new Date().toISOString(),
    totalUncovered,
    totalResidualPlaintext,
    queue,
    fields: fieldCounts,
  };

  console.log(JSON.stringify(report, null, 2));

  if (totalUncovered > 0 || totalResidualPlaintext > 0 || queue.error > 0) {
    process.exit(2);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
