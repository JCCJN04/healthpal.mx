#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const ENV_PATH = path.join(ROOT, ".env");

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

async function main() {
  const action = process.argv[2] || "stats";
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

  if (action === "enqueue") {
    const { data, error } = await supabase.rpc("enqueue_encryption_backfill");
    if (error) {
      throw new Error(`enqueue_encryption_backfill fallo: ${error.message}`);
    }
    console.log("enqueue_encryption_backfill =>", JSON.stringify(data, null, 2));
  }

  const { data: stats, error: statsError } = await supabase.rpc("get_encryption_backfill_stats");
  if (statsError) {
    throw new Error(`get_encryption_backfill_stats fallo: ${statsError.message}`);
  }

  console.log(JSON.stringify(stats, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
