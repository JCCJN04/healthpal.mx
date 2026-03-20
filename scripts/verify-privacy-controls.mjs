#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SNAPSHOT_PATH = path.join(ROOT, "supabase", ".schema.snapshot.json");
const SCHEMA_SQL_PATH = path.join(ROOT, "supabase", "schema.sql");

function loadSnapshot() {
  if (!fs.existsSync(SNAPSHOT_PATH)) {
    return null;
  }

  const raw = fs.readFileSync(SNAPSHOT_PATH, "utf8").trim();
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function loadSchemaSql() {
  if (!fs.existsSync(SCHEMA_SQL_PATH)) {
    throw new Error(`Missing schema SQL: ${SCHEMA_SQL_PATH}`);
  }
  return fs.readFileSync(SCHEMA_SQL_PATH, "utf8");
}

function getTableBlock(schemaSql, tableName) {
  const escapedTable = tableName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `CREATE TABLE "public"\."${escapedTable}" \\((.*?)\\n\\);`,
    "s"
  );
  const match = schemaSql.match(pattern);
  return match ? match[1] : "";
}

function hasColumnInTable(schemaSql, tableName, columnName) {
  const block = getTableBlock(schemaSql, tableName);
  if (!block) return false;
  const escapedColumn = columnName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`"${escapedColumn}"\\s+`).test(block);
}

function hasPolicyInSchemaSql(schemaSql, tableName, policyName, checks = []) {
  const escapedTable = tableName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedPolicy = policyName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const policyRegex = new RegExp(
    `CREATE POLICY "${escapedPolicy}" ON "public"\."${escapedTable}"[\\s\\S]*?;`,
    "s"
  );

  const match = schemaSql.match(policyRegex);
  if (!match) {
    return { ok: false, reason: "policy missing" };
  }

  const payload = match[0];
  const normalizedPayload = payload.replace(/["'\s()]/g, "").toLowerCase();
  for (const needle of checks) {
    const normalizedNeedle = needle.replace(/["'\s()]/g, "").toLowerCase();
    if (!normalizedPayload.includes(normalizedNeedle)) {
      return { ok: false, reason: `missing fragment: ${needle}` };
    }
  }

  return { ok: true, reason: "ok" };
}

function hasFunctionSearchPathInSchemaSql(schemaSql, functionName) {
  const escapedName = functionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const fnPattern = new RegExp(
    `CREATE FUNCTION "public"\."${escapedName}"\\([\\s\\S]*?SET "search_path" TO 'public'`,
    "m"
  );
  const ok = fnPattern.test(schemaSql);
  return { ok, reason: ok ? "ok" : "search_path not pinned" };
}

function hasPolicy(policies, table, policyName, checks = []) {
  const p = policies.find(
    (x) => x.schemaname === "public" && x.tablename === table && x.policyname === policyName
  );
  if (!p) {
    return { ok: false, reason: "policy missing" };
  }

  const payload = `${p.qual || ""}\n${p.with_check || ""}`;
  for (const needle of checks) {
    if (!payload.includes(needle)) {
      return { ok: false, reason: `missing fragment: ${needle}` };
    }
  }

  return { ok: true, reason: "ok" };
}

function hasFunctionSearchPath(functions, name) {
  const fns = functions.filter((x) => x.schema === "public" && x.name === name);
  if (fns.length === 0) {
    return { ok: false, reason: "function missing" };
  }

  const ok = fns.every((f) => String(f.definition || "").includes("SET search_path TO 'public'"));
  return { ok, reason: ok ? "ok" : "search_path not pinned" };
}

function hasColumn(columns, table, column) {
  return columns.some(
    (c) => c.table_schema === "public" && c.table_name === table && c.column_name === column
  );
}

function missingColumn(columns, table, column) {
  return !hasColumn(columns, table, column);
}

function main() {
  const snapshot = loadSnapshot();
  const usingSnapshot = Boolean(snapshot);
  const schemaSql = usingSnapshot ? null : loadSchemaSql();

  const policies = usingSnapshot && Array.isArray(snapshot.policies) ? snapshot.policies : [];
  const functions = usingSnapshot && Array.isArray(snapshot.functions) ? snapshot.functions : [];
  const columns = usingSnapshot && Array.isArray(snapshot.columns) ? snapshot.columns : [];
  const tables = usingSnapshot && Array.isArray(snapshot.tables) ? snapshot.tables : [];

  const checks = [];

  checks.push(
    usingSnapshot
      ? {
          name: "policy cp_insert hardened",
          ...hasPolicy(policies, "conversation_participants", "cp_insert", ["user_id = auth.uid()"]),
        }
      : {
          name: "policy cp_insert hardened",
          ...hasPolicyInSchemaSql(schemaSql, "conversation_participants", "cp_insert", [
            "\"user_id\" = \"auth\".\"uid\"()",
          ]),
        }
  );

  checks.push(
    usingSnapshot
      ? {
          name: "policy documents_select fixed",
          ...hasPolicy(policies, "documents", "documents_select", ["ds.document_id = documents.id"]),
        }
      : {
          name: "policy documents_select fixed",
          ...hasPolicyInSchemaSql(schemaSql, "documents", "documents_select", [
            "\"ds\".\"document_id\" = \"documents\".\"id\"",
          ]),
        }
  );

  const definerFns = [
    "get_folder_item_count",
    "get_public_doctor_by_slug",
    "get_public_specialties",
    "handle_new_message",
    "search_public_doctors",
  ];

  for (const fn of definerFns) {
    checks.push(
      usingSnapshot
        ? { name: `search_path pinned: ${fn}`, ...hasFunctionSearchPath(functions, fn) }
        : { name: `search_path pinned: ${fn}`, ...hasFunctionSearchPathInSchemaSql(schemaSql, fn) }
    );
  }

  const tableRequirements = ["encryption_key_registry", "sensitive_access_audit", "encryption_backfill_queue"];
  for (const t of tableRequirements) {
    const ok = usingSnapshot
      ? tables.some((x) => x.table_schema === "public" && x.table_name === t)
      : new RegExp(`CREATE TABLE "public"\."${t}" \\(`).test(schemaSql);
    checks.push({ name: `table exists: ${t}`, ok, reason: ok ? "ok" : "table missing" });
  }

  const encryptedColumns = [
    ["patient_notes", "body_enc"],
    ["appointment_notes", "note_enc"],
    ["appointments", "reason_enc"],
    ["appointments", "symptoms_enc"],
    ["patient_profiles", "allergies_enc"],
    ["documents", "file_path_enc"],
  ];

  for (const [table, column] of encryptedColumns) {
    const ok = usingSnapshot ? hasColumn(columns, table, column) : hasColumnInTable(schemaSql, table, column);
    checks.push({ name: `column exists: ${table}.${column}`, ok, reason: ok ? "ok" : "column missing" });
  }

  const plaintextColumnsRemoved = [
    ["patient_notes", "body"],
    ["appointment_notes", "note"],
    ["appointments", "reason"],
    ["appointments", "symptoms"],
    ["patient_profiles", "allergies"],
    ["patient_profiles", "chronic_conditions"],
    ["patient_profiles", "current_medications"],
    ["patient_profiles", "notes_for_doctor"],
    ["patient_profiles", "insurance_policy_number"],
    ["patient_profiles", "emergency_contact_name"],
    ["patient_profiles", "emergency_contact_phone"],
    ["documents", "file_path"],
    ["documents", "checksum"],
  ];

  for (const [table, column] of plaintextColumnsRemoved) {
    const ok = usingSnapshot ? missingColumn(columns, table, column) : !hasColumnInTable(schemaSql, table, column);
    checks.push({
      name: `column removed: ${table}.${column}`,
      ok,
      reason: ok ? "ok" : "plaintext column still present",
    });
  }

  const publicReadPolicies = usingSnapshot
    ? policies.filter((p) => p.cmd === "SELECT" && String(p.qual || "").trim().toLowerCase() === "true")
    : (schemaSql.match(/CREATE POLICY[\s\S]*?FOR SELECT[\s\S]*?USING \(true\);/g) || []);

  const failures = checks.filter((c) => !c.ok);

  console.log("Privacy Controls Verification");
  console.log(`Snapshot: ${usingSnapshot ? snapshot.generatedAt || "unknown" : "fallback-to-schema.sql"}`);
  console.log(`Project: ${usingSnapshot ? snapshot.projectRef || "unknown" : "unknown"}`);
  if (!usingSnapshot) {
    console.log("Info: using fallback validator against supabase/schema.sql (snapshot unavailable)");
  }
  console.log("");

  for (const c of checks) {
    console.log(`${c.ok ? "PASS" : "FAIL"} - ${c.name} (${c.reason})`);
  }

  console.log("");
  console.log(`Info: public SELECT policies with USING true = ${publicReadPolicies.length}`);

  if (publicReadPolicies.length > 12) {
    console.log("WARN - Public read policies are higher than expected threshold (12)");
  }

  if (failures.length > 0) {
    console.error("");
    console.error(`Verification failed with ${failures.length} issue(s).`);
    process.exit(1);
  }

  console.log("");
  console.log("Verification passed.");
}

try {
  main();
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}
