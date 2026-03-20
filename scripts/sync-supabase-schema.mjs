#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const ENV_PATH = path.join(ROOT, ".env");
const SUPABASE_SCHEMA_SQL = path.join(ROOT, "supabase", "schema.sql");
const SCHEMA_MD = path.join(ROOT, "schema.md");
const SNAPSHOT_JSON = path.join(ROOT, "supabase", ".schema.snapshot.json");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    ...options,
  });

  if (result.status !== 0) {
    const stderr = (result.stderr || "").trim();
    const stdout = (result.stdout || "").trim();
    const output = [stderr, stdout].filter(Boolean).join("\n");
    const safeArgs = args.map((arg) =>
      typeof arg === "string" && arg.startsWith("PGPASSWORD=") ? "PGPASSWORD=[REDACTED]" : arg
    );
    throw new Error(`${command} ${safeArgs.join(" ")} failed\n${output}`);
  }

  return (result.stdout || "").trim();
}

function parseDotEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(".env file is required to identify the target Supabase project.");
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

function getProjectRefFromUrl(supabaseUrl) {
  if (!supabaseUrl) {
    throw new Error("VITE_SUPABASE_URL is missing in .env.");
  }
  const match = supabaseUrl.match(/^https:\/\/([a-z0-9]+)\.supabase\.co\/?$/i);
  if (!match) {
    throw new Error("VITE_SUPABASE_URL has an unexpected format.");
  }
  return match[1];
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
  if (missing.length > 0) {
    throw new Error(`Could not read DB credentials from Supabase CLI dry-run output: missing ${missing.join(", ")}`);
  }

  return exported;
}

function dockerPgCommand(pg, toolArgs) {
  return [
    "run",
    "--rm",
    "-e", `PGHOST=${pg.PGHOST}`,
    "-e", `PGPORT=${pg.PGPORT}`,
    "-e", `PGUSER=${pg.PGUSER}`,
    "-e", `PGPASSWORD=${pg.PGPASSWORD}`,
    "-e", `PGDATABASE=${pg.PGDATABASE}`,
    "postgres:17-alpine",
    ...toolArgs,
  ];
}

function runPsqlJson(pg, sql) {
  const output = run("docker", dockerPgCommand(pg, [
    "psql",
    "-v", "ON_ERROR_STOP=1",
    "-A",
    "-t",
    "-c",
    sql,
  ]));

  const normalized = output.trim() || "[]";
  try {
    return JSON.parse(normalized);
  } catch {
    throw new Error(`Failed to parse JSON from SQL query output. Query: ${sql}`);
  }
}

function runPsqlJsonOrEmpty(pg, sql) {
  try {
    return runPsqlJson(pg, sql);
  } catch {
    return [];
  }
}

function getBucketsFromStorageCli() {
  try {
    const output = run("supabase", ["--experimental", "storage", "ls", "ss:///"], {
      env: process.env,
    });
    const lines = output
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter((s) => s && s.endsWith("/"));

    return lines.map((line) => {
      const name = line.slice(0, -1);
      return {
        id: name,
        name,
        public: null,
        file_size_limit: null,
        allowed_mime_types: [],
      };
    });
  } catch {
    return [];
  }
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function keyOf(item, keys) {
  return keys.map((k) => String(item?.[k] ?? "")).join("::");
}

function setDiff(oldItems, newItems, keyFields) {
  const oldMap = new Map(oldItems.map((i) => [keyOf(i, keyFields), i]));
  const newMap = new Map(newItems.map((i) => [keyOf(i, keyFields), i]));

  const added = [];
  const removed = [];

  for (const [k, v] of newMap.entries()) {
    if (!oldMap.has(k)) {
      added.push(v);
    }
  }

  for (const [k, v] of oldMap.entries()) {
    if (!newMap.has(k)) {
      removed.push(v);
    }
  }

  return { added, removed };
}

function tableSummary(tableName) {
  return `Primary records for ${tableName.replaceAll("_", " ")}.`;
}

function isSensitiveColumn(columnName) {
  return /(^|_)(patient_id|doctor_id|owner_id|user_id)$/i.test(columnName);
}

function markdownList(items) {
  if (!items.length) {
    return "- None\n";
  }
  return items.map((item) => `- ${item}`).join("\n") + "\n";
}

function markdownCodeBlock(sql) {
  return `\n\`\`\`sql\n${sql.trim()}\n\`\`\`\n`;
}

function generateMarkdown(snapshot) {
  const lines = [];
  const now = new Date().toISOString();

  const tables = safeArray(snapshot.tables);
  const columns = safeArray(snapshot.columns);
  const constraints = safeArray(snapshot.constraints);
  const fks = safeArray(snapshot.fks);
  const functions = safeArray(snapshot.functions);
  const policies = safeArray(snapshot.policies);
  const triggers = safeArray(snapshot.triggers);
  const views = safeArray(snapshot.views);
  const indexes = safeArray(snapshot.indexes);
  const buckets = safeArray(snapshot.buckets);
  const storagePolicies = safeArray(snapshot.storagePolicies);
  const rlsStatus = safeArray(snapshot.rlsStatus);

  const columnsByTable = new Map();
  for (const c of columns) {
    const key = `${c.table_schema}.${c.table_name}`;
    const arr = columnsByTable.get(key) || [];
    arr.push(c);
    columnsByTable.set(key, arr);
  }

  const constraintsByTable = new Map();
  for (const c of constraints) {
    const key = `${c.schema}.${c.table_name}`;
    const arr = constraintsByTable.get(key) || [];
    arr.push(c);
    constraintsByTable.set(key, arr);
  }

  const fksByTable = new Map();
  for (const fk of fks) {
    const key = `${fk.schema}.${fk.table_name}`;
    const arr = fksByTable.get(key) || [];
    arr.push(fk);
    fksByTable.set(key, arr);
  }

  lines.push("# Supabase Database Schema");
  lines.push("");
  lines.push(`Generated from live Supabase state on ${now}.`);
  lines.push("");
  lines.push("## Sync Metadata");
  lines.push("");
  lines.push(`- Source of truth: live Supabase project (${snapshot.projectRef})`);
  lines.push("- Extraction method: Supabase CLI dry-run credentials + Docker pg_dump/psql introspection");
  lines.push("- Data rows: excluded (schema only)");
  lines.push("");

  lines.push("## Security Review Flags");
  lines.push("");
  const publicSelectPolicies = policies
    .filter((p) => p.cmd === "SELECT" && String(p.qual || "").trim().toLowerCase() === "true")
    .map((p) => `${p.schemaname}.${p.tablename} -> ${p.policyname}`);

  const sensitiveFks = fks.filter((fk) => isSensitiveColumn(fk.column_name));

  lines.push("### Public Read Policies (RLS)");
  lines.push(markdownList(publicSelectPolicies));

  lines.push("### Sensitive Relations");
  lines.push(markdownList(
    sensitiveFks.map((fk) => `${fk.schema}.${fk.table_name}.${fk.column_name} -> ${fk.foreign_schema}.${fk.foreign_table}.${fk.foreign_column}`)
  ));

  lines.push("## Tables");
  lines.push("");
  for (const t of tables) {
    const tableKey = `${t.table_schema}.${t.table_name}`;
    const tableColumns = columnsByTable.get(tableKey) || [];
    const tableConstraints = constraintsByTable.get(tableKey) || [];
    const tableFks = fksByTable.get(tableKey) || [];
    const tableRls = rlsStatus.find((r) => r.schema === t.table_schema && r.table_name === t.table_name);

    lines.push(`### ${t.table_schema}.${t.table_name}`);
    lines.push("");
    lines.push(`- Description: ${tableSummary(t.table_name)}`);
    lines.push(`- RLS enabled: ${tableRls ? String(Boolean(tableRls.rls_enabled)) : "unknown"}`);
    lines.push(`- RLS forced: ${tableRls ? String(Boolean(tableRls.rls_forced)) : "unknown"}`);
    lines.push("");
    lines.push("#### Columns");
    lines.push("");
    lines.push("| Column | Type | Nullable | Default | Sensitive |" );
    lines.push("|---|---|---|---|---|");
    for (const c of tableColumns) {
      const type = c.data_type || c.udt_name;
      lines.push(`| ${c.column_name} | ${type} | ${c.is_nullable} | ${String(c.column_default || "").replaceAll("|", "\\|")} | ${isSensitiveColumn(c.column_name) ? "yes" : "no"} |`);
    }
    lines.push("");

    lines.push("#### Constraints");
    lines.push("");
    if (tableConstraints.length === 0) {
      lines.push("- None");
    } else {
      for (const c of tableConstraints) {
        lines.push(`- ${c.constraint_name} (${c.contype}): ${c.definition}`);
      }
    }
    lines.push("");

    lines.push("#### Relationships (FK)");
    lines.push("");
    if (tableFks.length === 0) {
      lines.push("- None");
    } else {
      for (const fk of tableFks) {
        const sensitive = isSensitiveColumn(fk.column_name) ? " [SENSITIVE]" : "";
        lines.push(`- ${fk.column_name} -> ${fk.foreign_schema}.${fk.foreign_table}.${fk.foreign_column}${sensitive}`);
      }
    }
    lines.push("");
  }

  lines.push("## Functions (RPC)");
  lines.push("");
  if (functions.length === 0) {
    lines.push("- None");
  } else {
    for (const fn of functions) {
      lines.push(`### ${fn.schema}.${fn.name}(${fn.args})`);
      lines.push("");
      lines.push(`- Returns: ${fn.returns}`);
      lines.push(`- Language: ${fn.language}`);
      lines.push(`- Security definer: ${String(Boolean(fn.security_definer))}`);
      lines.push(markdownCodeBlock(fn.definition));
    }
  }

  lines.push("## Policies (RLS)");
  lines.push("");
  if (policies.length === 0) {
    lines.push("- None");
  } else {
    lines.push("| Schema | Table | Policy | Command | Roles | Using | With Check |" );
    lines.push("|---|---|---|---|---|---|---|");
    for (const p of policies) {
      lines.push(`| ${p.schemaname} | ${p.tablename} | ${p.policyname} | ${p.cmd} | ${(p.roles || []).join(",")} | ${String(p.qual || "").replaceAll("|", "\\|")} | ${String(p.with_check || "").replaceAll("|", "\\|")} |`);
    }
  }
  lines.push("");

  lines.push("## Triggers");
  lines.push("");
  if (triggers.length === 0) {
    lines.push("- None");
  } else {
    lines.push("| Schema | Table | Trigger | Timing | Event | Statement |" );
    lines.push("|---|---|---|---|---|---|");
    for (const tr of triggers) {
      lines.push(`| ${tr.schema} | ${tr.table_name} | ${tr.trigger_name} | ${tr.action_timing} | ${tr.event_manipulation} | ${String(tr.action_statement || "").replaceAll("|", "\\|")} |`);
    }
  }
  lines.push("");

  lines.push("## Views");
  lines.push("");
  if (views.length === 0) {
    lines.push("- None");
  } else {
    for (const v of views) {
      lines.push(`### ${v.schema}.${v.view_name}`);
      lines.push(markdownCodeBlock(v.view_definition || "-- definition unavailable"));
    }
  }

  lines.push("## Indexes");
  lines.push("");
  if (indexes.length === 0) {
    lines.push("- None");
  } else {
    lines.push("| Schema | Table | Index | Definition |" );
    lines.push("|---|---|---|---|");
    for (const idx of indexes) {
      lines.push(`| ${idx.schema} | ${idx.table_name} | ${idx.indexname} | ${String(idx.indexdef || "").replaceAll("|", "\\|")} |`);
    }
  }
  lines.push("");

  lines.push("## Storage");
  lines.push("");
  lines.push("### Buckets");
  lines.push("");
  if (buckets.length === 0) {
    lines.push("- None");
  } else {
    lines.push("| ID | Name | Public | File Size Limit | Allowed Mime Types |" );
    lines.push("|---|---|---|---|---|");
    for (const b of buckets) {
      const mimes = Array.isArray(b.allowed_mime_types) ? b.allowed_mime_types.join(", ") : "";
      lines.push(`| ${b.id} | ${b.name} | ${String(Boolean(b.public))} | ${b.file_size_limit ?? ""} | ${mimes} |`);
    }
  }
  lines.push("");

  lines.push("### Storage Policies (storage.objects)");
  lines.push("");
  if (storagePolicies.length === 0) {
    lines.push("- None");
  } else {
    for (const p of storagePolicies) {
      lines.push(`- ${p.policyname} (${p.cmd})`);
      if (p.qual) {
        lines.push(`  - USING: ${p.qual}`);
      }
      if (p.with_check) {
        lines.push(`  - WITH CHECK: ${p.with_check}`);
      }
    }
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n") + "\n";
}

function main() {
  const env = parseDotEnv(ENV_PATH);
  const projectRefFromEnv = getProjectRefFromUrl(env.VITE_SUPABASE_URL);

  const linkedRefPath = path.join(ROOT, "supabase", ".temp", "project-ref");
  if (!fs.existsSync(linkedRefPath)) {
    throw new Error("supabase/.temp/project-ref is missing. Run `supabase link --project-ref <ref>` first.");
  }
  const linkedRef = fs.readFileSync(linkedRefPath, "utf8").trim();

  if (linkedRef !== projectRefFromEnv) {
    throw new Error(`Linked project (${linkedRef}) does not match .env URL project (${projectRefFromEnv}).`);
  }

  const dryRunOutput = run("supabase", [
    "db",
    "dump",
    "--linked",
    "--schema",
    "public,auth,storage",
    "--dry-run",
  ]);

  const pg = parsePgExports(dryRunOutput);

  const schemaSql = run("docker", dockerPgCommand(pg, [
    "pg_dump",
    "--schema-only",
    "--quote-all-identifier",
    "--role",
    "postgres",
    "--schema=public",
    "--schema=auth",
    "--schema=storage",
  ]));

  fs.writeFileSync(SUPABASE_SCHEMA_SQL, `${schemaSql}\n`, "utf8");

  const snapshot = {
    generatedAt: new Date().toISOString(),
    projectRef: linkedRef,
    tables: runPsqlJson(pg, `SELECT COALESCE(json_agg(t ORDER BY t.table_schema, t.table_name), '[]'::json) FROM (SELECT n.nspname AS table_schema, c.relname AS table_name FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relkind = 'r' AND n.nspname IN ('public','auth','storage')) t;`),
    columns: runPsqlJson(pg, `SELECT COALESCE(json_agg(c ORDER BY c.table_schema, c.table_name, c.ordinal_position), '[]'::json) FROM (SELECT n.nspname AS table_schema, cl.relname AS table_name, att.attname AS column_name, format_type(att.atttypid, att.atttypmod) AS data_type, typ.typname AS udt_name, CASE WHEN att.attnotnull THEN 'NO' ELSE 'YES' END AS is_nullable, pg_get_expr(def.adbin, def.adrelid) AS column_default, att.attnum AS ordinal_position FROM pg_attribute att JOIN pg_class cl ON cl.oid = att.attrelid JOIN pg_namespace n ON n.oid = cl.relnamespace JOIN pg_type typ ON typ.oid = att.atttypid LEFT JOIN pg_attrdef def ON def.adrelid = cl.oid AND def.adnum = att.attnum WHERE att.attnum > 0 AND NOT att.attisdropped AND cl.relkind = 'r' AND n.nspname IN ('public','auth','storage')) c;`),
    constraints: runPsqlJson(pg, `SELECT COALESCE(json_agg(x ORDER BY x.schema, x.table_name, x.constraint_name), '[]'::json) FROM (SELECT n.nspname AS schema, cl.relname AS table_name, con.conname AS constraint_name, con.contype, pg_get_constraintdef(con.oid, true) AS definition FROM pg_constraint con JOIN pg_class cl ON cl.oid = con.conrelid JOIN pg_namespace n ON n.oid = cl.relnamespace WHERE n.nspname IN ('public','auth','storage')) x;`),
    fks: runPsqlJson(pg, `SELECT COALESCE(json_agg(x ORDER BY x.schema, x.table_name, x.column_name), '[]'::json) FROM (SELECT ns.nspname AS schema, cl.relname AS table_name, att.attname AS column_name, nfs.nspname AS foreign_schema, clf.relname AS foreign_table, attf.attname AS foreign_column FROM pg_constraint con JOIN pg_class cl ON cl.oid = con.conrelid JOIN pg_namespace ns ON ns.oid = cl.relnamespace JOIN pg_class clf ON clf.oid = con.confrelid JOIN pg_namespace nfs ON nfs.oid = clf.relnamespace JOIN unnest(con.conkey) WITH ORDINALITY AS ck(attnum, ord) ON true JOIN unnest(con.confkey) WITH ORDINALITY AS fk(attnum, ord) ON fk.ord = ck.ord JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ck.attnum JOIN pg_attribute attf ON attf.attrelid = con.confrelid AND attf.attnum = fk.attnum WHERE con.contype = 'f' AND ns.nspname IN ('public','auth','storage')) x;`),
    functions: runPsqlJson(pg, `SELECT COALESCE(json_agg(f ORDER BY f.schema, f.name, f.args), '[]'::json) FROM (SELECT n.nspname AS schema, p.proname AS name, pg_get_function_identity_arguments(p.oid) AS args, pg_get_function_result(p.oid) AS returns, l.lanname AS language, p.prosecdef AS security_definer, pg_get_functiondef(p.oid) AS definition FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace JOIN pg_language l ON l.oid = p.prolang WHERE n.nspname IN ('public','auth','storage')) f;`),
    policies: runPsqlJson(pg, `SELECT COALESCE(json_agg(p ORDER BY p.schemaname, p.tablename, p.policyname), '[]'::json) FROM (SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check FROM pg_policies WHERE schemaname IN ('public','auth','storage')) p;`),
    triggers: runPsqlJson(pg, `SELECT COALESCE(json_agg(t ORDER BY t.schema, t.table_name, t.trigger_name, t.event_manipulation), '[]'::json) FROM (SELECT event_object_schema AS schema, event_object_table AS table_name, trigger_name, action_timing, event_manipulation, action_statement FROM information_schema.triggers WHERE event_object_schema IN ('public','auth','storage')) t;`),
    views: runPsqlJson(pg, `SELECT COALESCE(json_agg(v ORDER BY v.schema, v.view_name), '[]'::json) FROM (SELECT table_schema AS schema, table_name AS view_name, view_definition FROM information_schema.views WHERE table_schema IN ('public','auth','storage')) v;`),
    indexes: runPsqlJson(pg, `SELECT COALESCE(json_agg(i ORDER BY i.schema, i.table_name, i.indexname), '[]'::json) FROM (SELECT schemaname AS schema, tablename AS table_name, indexname, indexdef FROM pg_indexes WHERE schemaname IN ('public','auth','storage')) i;`),
    buckets: runPsqlJsonOrEmpty(pg, `SELECT COALESCE(json_agg(b ORDER BY b.name), '[]'::json) FROM (SELECT id, name, public, file_size_limit, allowed_mime_types FROM storage.buckets) b;`),
    storagePolicies: runPsqlJsonOrEmpty(pg, `SELECT COALESCE(json_agg(p ORDER BY p.policyname), '[]'::json) FROM (SELECT schemaname, tablename, policyname, cmd, qual, with_check FROM pg_policies WHERE schemaname='storage' AND tablename='objects') p;`),
    rlsStatus: runPsqlJson(pg, `SELECT COALESCE(json_agg(r ORDER BY r.schema, r.table_name), '[]'::json) FROM (SELECT n.nspname AS schema, c.relname AS table_name, c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relkind='r' AND n.nspname IN ('public','auth','storage')) r;`),
  };

  if (!snapshot.buckets || snapshot.buckets.length === 0) {
    snapshot.buckets = getBucketsFromStorageCli();
  }

  const markdown = generateMarkdown(snapshot);
  fs.writeFileSync(SCHEMA_MD, markdown, "utf8");

  fs.writeFileSync(SNAPSHOT_JSON, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");

  console.log("Schema sync completed:");
  console.log(`- SQL: ${path.relative(ROOT, SUPABASE_SCHEMA_SQL)}`);
  console.log(`- Markdown: ${path.relative(ROOT, SCHEMA_MD)}`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
