#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { randomUUID, webcrypto } from "node:crypto";
import { Client } from "pg";

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

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {
    batchSize: 25,
    maxRows: 200,
    dryRun: false,
  };

  for (const arg of args) {
    if (arg === "--dry-run") {
      out.dryRun = true;
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

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed\n${result.stderr || result.stdout || ""}`);
  }
  return (result.stdout || "").trim();
}

function parsePgExports(dryRunOutput) {
  const exported = {};
  for (const line of dryRunOutput.split(/\r?\n/)) {
    const m = line.match(/^export\s+(PG[A-Z]+)="(.*)"$/);
    if (m) {
      exported[m[1]] = m[2];
    }
  }
  const required = ["PGHOST", "PGPORT", "PGUSER", "PGPASSWORD", "PGDATABASE"];
  const missing = required.filter((k) => !exported[k]);
  if (missing.length) {
    throw new Error(`No se pudieron leer credenciales PG desde Supabase CLI: ${missing.join(", ")}`);
  }
  return exported;
}

async function getPgClientFromLinkedProject() {
  const dryRunOutput = run("supabase", [
    "db",
    "dump",
    "--linked",
    "--schema",
    "public",
    "--dry-run",
  ]);

  const pg = parsePgExports(dryRunOutput);
  const client = new Client({
    host: pg.PGHOST,
    port: Number(pg.PGPORT),
    user: pg.PGUSER,
    password: pg.PGPASSWORD,
    database: pg.PGDATABASE,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  await client.connect();
  return client;
}

function qident(name) {
  return `"${String(name).replaceAll('"', '""')}"`;
}

async function sha256Bytes(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await webcrypto.subtle.digest("SHA-256", bytes);
  return Buffer.from(digest);
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
    ciphertext: Buffer.from(cipherBuffer),
    nonce: Buffer.from(iv),
  };
}

async function claimBatch(client, batchSize, workerId) {
  const sql = `
    WITH picked AS (
      SELECT id
      FROM public.encryption_backfill_queue
      WHERE status = 'pending'
      ORDER BY id
      LIMIT $1
      FOR UPDATE SKIP LOCKED
    )
    UPDATE public.encryption_backfill_queue q
    SET status = 'processing',
        attempts = q.attempts + 1,
        locked_by = $2::uuid,
        locked_at = now(),
        updated_at = now(),
        last_error = NULL
    FROM picked p
    WHERE q.id = p.id
    RETURNING q.id, q.target_table, q.target_id, q.field_name, q.attempts;
  `;

  const res = await client.query(sql, [batchSize, workerId]);
  return res.rows;
}

async function markQueueRow(client, id, { status, lastError = null }) {
  await client.query(
    `
      UPDATE public.encryption_backfill_queue
      SET status = $2,
          last_error = $3,
          locked_by = NULL,
          locked_at = NULL,
          updated_at = now()
      WHERE id = $1
    `,
    [id, status, lastError]
  );
}

async function fetchSourceRow(client, mapping, targetId) {
  const sql = `
    SELECT ${qident(mapping.idColumn)} AS id_value,
           ${qident(mapping.plainColumn)} AS plain_value,
           ${qident(mapping.encColumn)} AS enc_value
    FROM public.${qident(mapping.table)}
    WHERE ${qident(mapping.idColumn)} = $1::uuid
    LIMIT 1
  `;
  const res = await client.query(sql, [targetId]);
  return res.rows[0] || null;
}

async function applyEncryptedUpdate(client, mapping, targetId, payload) {
  const setParts = [
    `${qident(mapping.encColumn)} = $2`,
    `${qident(mapping.nonceColumn)} = $3`,
    `${qident(mapping.kidColumn)} = $4`,
    `${qident(mapping.verColumn)} = $5`,
  ];
  const values = [targetId, payload.enc, payload.nonce, payload.kid, payload.ver];

  if (mapping.hashColumn) {
    setParts.push(`${qident(mapping.hashColumn)} = $6`);
    values.push(payload.hash);
  }

  const sql = `
    UPDATE public.${qident(mapping.table)}
    SET ${setParts.join(", ")}
    WHERE ${qident(mapping.idColumn)} = $1::uuid
  `;

  await client.query(sql, values);
}

async function insertAudit(client, workerId, row, keyId, keyVersion) {
  await client.query(
    `
      INSERT INTO public.sensitive_access_audit
        (actor_id, action, target_table, target_id, reason, success, request_meta)
      VALUES
        ($1::uuid, 'encryption_backfill', $2, $3::uuid, 'phase2-backfill', true, $4::jsonb)
    `,
    [
      workerId,
      row.target_table,
      row.target_id,
      JSON.stringify({
        field: row.field_name,
        queue_id: row.id,
        key_id: keyId,
        key_ver: keyVersion,
      }),
    ]
  );
}

async function processRow({ client, row, aesKey, keyId, keyVersion, dryRun, workerId }) {
  const mapKey = `${row.target_table}.${row.field_name}`;
  const mapping = FIELD_MAP[mapKey];

  if (!mapping) {
    const msg = `Combinacion no soportada: ${mapKey}`;
    if (!dryRun) {
      await markQueueRow(client, row.id, { status: "error", lastError: msg.slice(0, 2000) });
    }
    return { status: "error", message: msg };
  }

  const source = await fetchSourceRow(client, mapping, row.target_id);
  if (!source) {
    const msg = `Origen no encontrado (${mapping.table}.${mapping.idColumn}=${row.target_id})`;
    if (!dryRun) {
      await markQueueRow(client, row.id, { status: "error", lastError: msg.slice(0, 2000) });
    }
    return { status: "error", message: msg };
  }

  if (source.enc_value) {
    if (!dryRun) {
      await markQueueRow(client, row.id, { status: "done" });
    }
    return { status: "skipped", message: "Ya cifrado" };
  }

  if (source.plain_value === null || source.plain_value === undefined || source.plain_value === "") {
    if (!dryRun) {
      await markQueueRow(client, row.id, { status: "done" });
    }
    return { status: "skipped", message: "Sin contenido a cifrar" };
  }

  if (dryRun) {
    return { status: "dry-run", message: "Listo para cifrar" };
  }

  const plaintext = String(source.plain_value);
  const encrypted = await encryptText(aesKey, plaintext);
  const hash = mapping.hashColumn ? await sha256Bytes(plaintext) : null;

  await applyEncryptedUpdate(client, mapping, row.target_id, {
    enc: encrypted.ciphertext,
    nonce: encrypted.nonce,
    kid: keyId,
    ver: keyVersion,
    hash,
  });

  await markQueueRow(client, row.id, { status: "done" });

  try {
    await insertAudit(client, workerId, row, keyId, keyVersion);
  } catch {
    // Do not fail backfill on audit insertion issues.
  }

  return { status: "done", message: "Cifrado aplicado" };
}

async function runDryMode(client, maxRows) {
  const res = await client.query(
    `
      SELECT id, target_table, target_id, field_name, attempts, status
      FROM public.encryption_backfill_queue
      WHERE status = 'pending'
      ORDER BY id
      LIMIT $1
    `,
    [maxRows]
  );

  let simulated = 0;
  for (const row of res.rows) {
    const result = await processRow({
      client,
      row,
      aesKey: null,
      keyId: "dry",
      keyVersion: 0,
      dryRun: true,
      workerId: randomUUID(),
    });

    simulated += 1;
    console.log(`DRY id=${row.id} ${row.target_table}.${row.field_name} -> ${result.status} (${result.message})`);
  }

  console.log(`Dry-run completado. Filas evaluadas: ${simulated}`);
}

async function main() {
  const opts = parseArgs();
  const workerId = randomUUID();

  const keyId = process.env.SENSITIVE_DATA_KEY_ID || "local-dev-k1";
  const keyVersion = Number(process.env.SENSITIVE_DATA_KEY_VER || "1");

  const client = await getPgClientFromLinkedProject();

  try {
    if (opts.dryRun) {
      await runDryMode(client, opts.maxRows);
      return;
    }

    const encKeyB64 = process.env.SENSITIVE_DATA_ENC_KEY_B64;
    if (!encKeyB64) {
      throw new Error("Falta SENSITIVE_DATA_ENC_KEY_B64 para ejecucion real");
    }

    const aesKey = await buildAesKey(Buffer.from(encKeyB64, "base64"));

    let processed = 0;
    let done = 0;
    let skipped = 0;
    let errors = 0;

    while (processed < opts.maxRows) {
      await client.query("BEGIN");
      const remaining = opts.maxRows - processed;
      const batchSize = Math.min(opts.batchSize, remaining);
      const batch = await claimBatch(client, batchSize, workerId);
      await client.query("COMMIT");

      if (batch.length === 0) {
        break;
      }

      for (const row of batch) {
        try {
          const result = await processRow({
            client,
            row,
            aesKey,
            keyId,
            keyVersion,
            dryRun: false,
            workerId,
          });

          processed += 1;
          if (result.status === "done") done += 1;
          else if (result.status === "skipped") skipped += 1;
          else errors += 1;

          console.log(`id=${row.id} ${row.target_table}.${row.field_name} -> ${result.status} (${result.message})`);
        } catch (error) {
          processed += 1;
          errors += 1;
          const msg = error instanceof Error ? error.message : String(error);
          await markQueueRow(client, row.id, { status: "error", lastError: msg.slice(0, 2000) });
          console.log(`id=${row.id} ${row.target_table}.${row.field_name} -> error (${msg})`);
        }
      }
    }

    console.log("\nBackfill summary");
    console.log(`- worker_id: ${workerId}`);
    console.log(`- processed: ${processed}`);
    console.log(`- done: ${done}`);
    console.log(`- skipped: ${skipped}`);
    console.log(`- errors: ${errors}`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
