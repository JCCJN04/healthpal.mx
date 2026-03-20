#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { randomUUID, webcrypto } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const ENV_PATH = path.join(ROOT, ".env");

const FIELD_MAP = {
  "patient_notes.body": {
    table: "patient_notes",
    idColumn: "id",
    plainColumn: "body",
    encColumn: "body_enc",
    nonceColumn: "body_nonce",
    kidColumn: "body_kid",
    verColumn: "body_ver",
    hashColumn: "body_hash",
  },
  "appointment_notes.note": {
    table: "appointment_notes",
    idColumn: "id",
    plainColumn: "note",
    encColumn: "note_enc",
    nonceColumn: "note_nonce",
    kidColumn: "note_kid",
    verColumn: "note_ver",
    hashColumn: "note_hash",
  },
  "appointments.reason": {
    table: "appointments",
    idColumn: "id",
    plainColumn: "reason",
    encColumn: "reason_enc",
    nonceColumn: "reason_nonce",
    kidColumn: "reason_kid",
    verColumn: "reason_ver",
  },
  "appointments.symptoms": {
    table: "appointments",
    idColumn: "id",
    plainColumn: "symptoms",
    encColumn: "symptoms_enc",
    nonceColumn: "symptoms_nonce",
    kidColumn: "symptoms_kid",
    verColumn: "symptoms_ver",
  },
  "patient_profiles.allergies": {
    table: "patient_profiles",
    idColumn: "patient_id",
    plainColumn: "allergies",
    encColumn: "allergies_enc",
    nonceColumn: "allergies_nonce",
    kidColumn: "allergies_kid",
    verColumn: "allergies_ver",
  },
  "patient_profiles.chronic_conditions": {
    table: "patient_profiles",
    idColumn: "patient_id",
    plainColumn: "chronic_conditions",
    encColumn: "chronic_conditions_enc",
    nonceColumn: "chronic_conditions_nonce",
    kidColumn: "chronic_conditions_kid",
    verColumn: "chronic_conditions_ver",
  },
  "patient_profiles.current_medications": {
    table: "patient_profiles",
    idColumn: "patient_id",
    plainColumn: "current_medications",
    encColumn: "current_medications_enc",
    nonceColumn: "current_medications_nonce",
    kidColumn: "current_medications_kid",
    verColumn: "current_medications_ver",
  },
  "patient_profiles.notes_for_doctor": {
    table: "patient_profiles",
    idColumn: "patient_id",
    plainColumn: "notes_for_doctor",
    encColumn: "notes_for_doctor_enc",
    nonceColumn: "notes_for_doctor_nonce",
    kidColumn: "notes_for_doctor_kid",
    verColumn: "notes_for_doctor_ver",
  },
  "patient_profiles.insurance_policy_number": {
    table: "patient_profiles",
    idColumn: "patient_id",
    plainColumn: "insurance_policy_number",
    encColumn: "insurance_policy_number_enc",
    nonceColumn: "insurance_policy_number_nonce",
    kidColumn: "insurance_policy_number_kid",
    verColumn: "insurance_policy_number_ver",
  },
  "patient_profiles.emergency_contact_name": {
    table: "patient_profiles",
    idColumn: "patient_id",
    plainColumn: "emergency_contact_name",
    encColumn: "emergency_contact_name_enc",
    nonceColumn: "emergency_contact_name_nonce",
    kidColumn: "emergency_contact_name_kid",
    verColumn: "emergency_contact_name_ver",
  },
  "patient_profiles.emergency_contact_phone": {
    table: "patient_profiles",
    idColumn: "patient_id",
    plainColumn: "emergency_contact_phone",
    encColumn: "emergency_contact_phone_enc",
    nonceColumn: "emergency_contact_phone_nonce",
    kidColumn: "emergency_contact_phone_kid",
    verColumn: "emergency_contact_phone_ver",
  },
  "documents.file_path": {
    table: "documents",
    idColumn: "id",
    plainColumn: "file_path",
    encColumn: "file_path_enc",
    nonceColumn: "file_path_nonce",
    kidColumn: "file_path_kid",
    verColumn: "file_path_ver",
  },
  "documents.checksum": {
    table: "documents",
    idColumn: "id",
    plainColumn: "checksum",
    encColumn: "checksum_enc",
    nonceColumn: "checksum_nonce",
    kidColumn: "checksum_kid",
    verColumn: "checksum_ver",
  },
};

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

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {
    batchSize: 25,
    maxRows: 200,
    dryRun: false,
    allowLegacyServiceKey: false,
  };

  for (const arg of args) {
    if (arg === "--dry-run") {
      out.dryRun = true;
      continue;
    }
    if (arg === "--allow-legacy-service-key") {
      out.allowLegacyServiceKey = true;
      continue;
    }
    if (arg.startsWith("--batch=")) {
      out.batchSize = Number(arg.split("=")[1]);
      continue;
    }
    if (arg.startsWith("--max=")) {
      out.maxRows = Number(arg.split("=")[1]);
      continue;
    }
  }

  if (!Number.isInteger(out.batchSize) || out.batchSize <= 0) {
    throw new Error("--batch debe ser un entero positivo");
  }
  if (!Number.isInteger(out.maxRows) || out.maxRows <= 0) {
    throw new Error("--max debe ser un entero positivo");
  }

  return out;
}

function validateServiceRoleKey(rawKey, { allowLegacy = false } = {}) {
  if (!rawKey) {
    throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY");
  }

  const key = String(rawKey).trim();

  // Supabase masks secret keys in some CLI outputs using middle-dot characters.
  if (key.includes("·")) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY esta enmascarada. Copia la sb_secret completa desde el Dashboard de Supabase."
    );
  }

  // Legacy JWT keys (eyJ...) are no longer accepted when legacy API keys are disabled.
  if (key.startsWith("eyJ")) {
    if (allowLegacy) {
      return key;
    }
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY es legacy (JWT). Usa una key moderna sb_secret_ desde el Dashboard de Supabase."
    );
  }

  if (!key.startsWith("sb_secret_")) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY invalida. Debe iniciar con sb_secret_.");
  }

  return key;
}

function toByteaHex(bytes) {
  return `\\x${Buffer.from(bytes).toString("hex")}`;
}

async function sha256Bytes(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await webcrypto.subtle.digest("SHA-256", bytes);
  return new Uint8Array(digest);
}

async function buildAesKey(keyBytes) {
  if (keyBytes.length !== 32) {
    throw new Error("SENSITIVE_DATA_ENC_KEY_B64 debe decodificar a 32 bytes (AES-256)");
  }
  return webcrypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, ["encrypt"]);
}

async function encryptText(aesKey, plaintext) {
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const payload = new TextEncoder().encode(plaintext);
  const cipherBuffer = await webcrypto.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, payload);
  return {
    ciphertext: new Uint8Array(cipherBuffer),
    nonce: iv,
  };
}

async function markQueueRow(supabase, rowId, payload) {
  const { error } = await supabase
    .from("encryption_backfill_queue")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", rowId);

  if (error) {
    throw new Error(`No se pudo actualizar queue id=${rowId}: ${error.message}`);
  }
}

async function claimBatch(supabase, batchSize, workerId) {
  const claimed = [];

  const { data: candidates, error: readError } = await supabase
    .from("encryption_backfill_queue")
    .select("id,target_table,target_id,field_name,attempts,status")
    .eq("status", "pending")
    .order("id", { ascending: true })
    .limit(batchSize * 4);

  if (readError) {
    throw new Error(`No se pudo leer queue pending: ${readError.message}`);
  }

  for (const candidate of candidates || []) {
    if (claimed.length >= batchSize) {
      break;
    }

    const nextAttempts = Number(candidate.attempts || 0) + 1;
    const now = new Date().toISOString();
    const { data: updated, error: updateError } = await supabase
      .from("encryption_backfill_queue")
      .update({
        status: "processing",
        attempts: nextAttempts,
        locked_by: workerId,
        locked_at: now,
        updated_at: now,
        last_error: null,
      })
      .eq("id", candidate.id)
      .eq("status", "pending")
      .select("id,target_table,target_id,field_name,attempts,status")
      .limit(1);

    if (updateError) {
      continue;
    }

    if (updated && updated.length === 1) {
      claimed.push(updated[0]);
    }
  }

  return claimed;
}

async function processRow({ supabase, row, aesKey, keyId, keyVersion, dryRun }) {
  const mapKey = `${row.target_table}.${row.field_name}`;
  const mapping = FIELD_MAP[mapKey];

  if (!mapping) {
    const msg = `Combinacion no soportada: ${mapKey}`;
    if (!dryRun) {
      await markQueueRow(supabase, row.id, {
        status: "error",
        last_error: msg.slice(0, 2000),
        locked_by: null,
        locked_at: null,
      });
    }
    return { status: "error", message: msg };
  }

  const selectColumns = [mapping.idColumn, mapping.plainColumn, mapping.encColumn].join(",");
  const { data: source, error: sourceError } = await supabase
    .from(mapping.table)
    .select(selectColumns)
    .eq(mapping.idColumn, row.target_id)
    .maybeSingle();

  if (sourceError) {
    const msg = `Error leyendo origen ${mapping.table}.${mapping.idColumn}=${row.target_id}: ${sourceError.message}`;
    if (!dryRun) {
      await markQueueRow(supabase, row.id, {
        status: "error",
        last_error: msg.slice(0, 2000),
        locked_by: null,
        locked_at: null,
      });
    }
    return { status: "error", message: msg };
  }

  if (!source) {
    const msg = `Origen no encontrado (${mapping.table}.${mapping.idColumn}=${row.target_id})`;
    if (!dryRun) {
      await markQueueRow(supabase, row.id, {
        status: "error",
        last_error: msg,
        locked_by: null,
        locked_at: null,
      });
    }
    return { status: "error", message: msg };
  }

  const existingCipher = source[mapping.encColumn];
  const plaintext = source[mapping.plainColumn];

  if (existingCipher) {
    if (!dryRun) {
      await markQueueRow(supabase, row.id, {
        status: "done",
        last_error: null,
        locked_by: null,
        locked_at: null,
      });
    }
    return { status: "skipped", message: "Ya cifrado" };
  }

  if (plaintext === null || plaintext === undefined || plaintext === "") {
    if (!dryRun) {
      await markQueueRow(supabase, row.id, {
        status: "done",
        last_error: null,
        locked_by: null,
        locked_at: null,
      });
    }
    return { status: "skipped", message: "Sin contenido a cifrar" };
  }

  const plaintextString = String(plaintext);
  const encrypted = await encryptText(aesKey, plaintextString);

  const updatePayload = {
    [mapping.encColumn]: toByteaHex(encrypted.ciphertext),
    [mapping.nonceColumn]: toByteaHex(encrypted.nonce),
    [mapping.kidColumn]: keyId,
    [mapping.verColumn]: keyVersion,
  };

  if (mapping.hashColumn) {
    updatePayload[mapping.hashColumn] = toByteaHex(await sha256Bytes(plaintextString));
  }

  if (!dryRun) {
    const { error: updateError } = await supabase
      .from(mapping.table)
      .update(updatePayload)
      .eq(mapping.idColumn, row.target_id);

    if (updateError) {
      const msg = `Error escribiendo cifrado en ${mapping.table}: ${updateError.message}`;
      await markQueueRow(supabase, row.id, {
        status: "error",
        last_error: msg.slice(0, 2000),
        locked_by: null,
        locked_at: null,
      });
      return { status: "error", message: msg };
    }

    await markQueueRow(supabase, row.id, {
      status: "done",
      last_error: null,
      locked_by: null,
      locked_at: null,
    });

    const auditPayload = {
      actor_id: row.locked_by || randomUUID(),
      action: "encryption_backfill",
      target_table: mapping.table,
      target_id: row.target_id,
      reason: "phase2-backfill",
      success: true,
      request_meta: {
        field: row.field_name,
        queue_id: row.id,
        key_id: keyId,
        key_ver: keyVersion,
      },
    };

    // Best-effort audit trail (do not fail batch if this insert fails).
    await supabase.from("sensitive_access_audit").insert(auditPayload);
  }

  return { status: dryRun ? "dry-run" : "done", message: "Cifrado aplicado" };
}

async function runDryMode({ supabase, maxRows, aesKey, keyId, keyVersion }) {
  const { data: rows, error } = await supabase
    .from("encryption_backfill_queue")
    .select("id,target_table,target_id,field_name,attempts,status")
    .eq("status", "pending")
    .order("id", { ascending: true })
    .limit(maxRows);

  if (error) {
    throw new Error(`No se pudo leer queue pending: ${error.message}`);
  }

  let simulated = 0;
  for (const row of rows || []) {
    const result = await processRow({
      supabase,
      row,
      aesKey,
      keyId,
      keyVersion,
      dryRun: true,
    });
    simulated += 1;
    console.log(`DRY id=${row.id} ${row.target_table}.${row.field_name} -> ${result.status} (${result.message})`);
  }

  console.log(`Dry-run completado. Filas evaluadas: ${simulated}`);
}

async function main() {
  const opts = parseArgs();
  const localEnv = parseDotEnv(ENV_PATH);
  const mergedEnv = {
    ...localEnv,
    ...process.env,
  };

  const supabaseUrl = mergedEnv.VITE_SUPABASE_URL || mergedEnv.SUPABASE_URL;
  const serviceRoleKey = mergedEnv.SUPABASE_SERVICE_ROLE_KEY;
  const allowLegacyServiceKey = String(
    mergedEnv.SUPABASE_ALLOW_LEGACY_SERVICE_KEY || ""
  ).toLowerCase();
  const encKeyB64 = mergedEnv.SENSITIVE_DATA_ENC_KEY_B64;
  const keyId = mergedEnv.SENSITIVE_DATA_KEY_ID || "local-dev-k1";
  const keyVersion = Number(mergedEnv.SENSITIVE_DATA_KEY_VER || "1");

  if (!supabaseUrl) {
    throw new Error("Falta VITE_SUPABASE_URL o SUPABASE_URL");
  }
  const validatedServiceRoleKey = validateServiceRoleKey(serviceRoleKey, {
    allowLegacy:
      opts.allowLegacyServiceKey ||
      allowLegacyServiceKey === "1" ||
      allowLegacyServiceKey === "true" ||
      allowLegacyServiceKey === "yes",
  });
  if (!encKeyB64) {
    throw new Error("Falta SENSITIVE_DATA_ENC_KEY_B64 (base64 de 32 bytes)");
  }

  const encKey = Buffer.from(encKeyB64, "base64");
  const aesKey = await buildAesKey(encKey);

  const supabase = createClient(supabaseUrl, validatedServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  if (opts.dryRun) {
    await runDryMode({
      supabase,
      maxRows: opts.maxRows,
      aesKey,
      keyId,
      keyVersion,
    });
    return;
  }

  const workerId = randomUUID();
  let processed = 0;
  let done = 0;
  let skipped = 0;
  let errors = 0;

  while (processed < opts.maxRows) {
    const remaining = opts.maxRows - processed;
    const batchSize = Math.min(opts.batchSize, remaining);
    const batch = await claimBatch(supabase, batchSize, workerId);

    if (batch.length === 0) {
      break;
    }

    for (const row of batch) {
      const result = await processRow({
        supabase,
        row: { ...row, locked_by: workerId },
        aesKey,
        keyId,
        keyVersion,
        dryRun: false,
      });

      processed += 1;
      if (result.status === "done") {
        done += 1;
      } else if (result.status === "skipped") {
        skipped += 1;
      } else {
        errors += 1;
      }

      console.log(`id=${row.id} ${row.target_table}.${row.field_name} -> ${result.status} (${result.message})`);
    }
  }

  console.log("\nBackfill summary");
  console.log(`- worker_id: ${workerId}`);
  console.log(`- processed: ${processed}`);
  console.log(`- done: ${done}`);
  console.log(`- skipped: ${skipped}`);
  console.log(`- errors: ${errors}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
