#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC_ROOT = path.join(ROOT, "src");

const RULES = [
  {
    id: "patient_notes.body",
    severity: "blocker",
    tableName: "patient_notes",
    tablePattern: /from\(['\"]patient_notes['\"]\)/,
    fieldPattern: /\bbody\b/,
    rationale: "Potential plaintext note read/write in patient_notes.body",
  },
  {
    id: "appointment_notes.note",
    severity: "blocker",
    tableName: "appointment_notes",
    tablePattern: /from\(['\"]appointment_notes['\"]\)/,
    fieldPattern: /\bnote\b/,
    rationale: "Potential plaintext note read/write in appointment_notes.note",
  },
  {
    id: "appointments.reason_or_symptoms",
    severity: "blocker",
    tableName: "appointments",
    tablePattern: /from\(['\"]appointments['\"]\)/,
    fieldPattern: /(\.reason\b|\.symptoms\b|\breason\s*:\s*(?!null\b)|\bsymptoms\s*:\s*(?!null\b))/,
    ignorePattern:
      /(reason\s*:\s*null|symptoms\s*:\s*null|next\.reason\s*=\s*null|next\.symptoms\s*=\s*null|hasOwnProperty\.call\(next,\s*'reason'\)|hasOwnProperty\.call\(next,\s*'symptoms'\))/,
    rationale: "Potential plaintext appointment field read/write in appointments.reason/symptoms",
  },
  {
    id: "patient_profiles.sensitive_plaintext",
    severity: "blocker",
    tableName: "patient_profiles",
    tablePattern: /from\(['\"]patient_profiles['\"]\)/,
    fieldPattern: /\b(allergies|chronic_conditions|current_medications|notes_for_doctor|insurance_policy_number|emergency_contact_name|emergency_contact_phone)\b/,
    rationale: "Potential plaintext medical/profile field read/write in patient_profiles",
  },
  {
    id: "documents.file_path_or_checksum",
    severity: "deferred",
    tableName: "documents",
    tablePattern: /from\(['\"]documents['\"]\)/,
    fieldPattern: /\b(file_path|checksum)\b/,
    rationale: "Potential plaintext document metadata read/write in documents.file_path/checksum",
  },
];

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getTableAliases(content, tableName) {
  const aliases = new Set();
  const tableLiteral = escapeRegExp(tableName);
  const aliasPattern = new RegExp(
    `\\b(?:const|let|var)\\s+([A-Za-z_$][\\w$]*)\\s*=\\s*['\"]${tableLiteral}['\"]`,
    "g"
  );

  let match;
  while ((match = aliasPattern.exec(content)) !== null) {
    aliases.add(match[1]);
  }

  return [...aliases];
}

function getTableReferenceLineNumbers(content, rule) {
  const lines = content.split(/\r?\n/);
  const tableLines = [];
  const aliases = getTableAliases(content, rule.tableName);
  const aliasUsagePatterns = aliases.map(
    (alias) => new RegExp(`from\\(\\s*${escapeRegExp(alias)}\\s*[,)\\n]`)
  );

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (rule.tablePattern.test(line)) {
      tableLines.push(i + 1);
      continue;
    }

    if (aliasUsagePatterns.some((pattern) => pattern.test(line))) {
      tableLines.push(i + 1);
    }
  }

  return tableLines;
}

function listFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) {
    return out;
  }

  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      if (/\.(ts|tsx|js|jsx|mjs)$/i.test(entry.name)) {
        out.push(fullPath);
      }
    }
  }

  return out;
}

function findLineNumbers(content, pattern, ignorePattern) {
  const lines = content.split(/\r?\n/);
  const nums = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (ignorePattern && ignorePattern.test(lines[i])) {
      continue;
    }
    if (pattern.test(lines[i])) {
      nums.push(i + 1);
    }
  }
  return nums;
}

function main() {
  const files = listFiles(SRC_ROOT);
  const findings = [];

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, "utf8");

    for (const rule of RULES) {
      const tableLines = getTableReferenceLineNumbers(content, rule);
      if (tableLines.length === 0) {
        continue;
      }
      if (!rule.fieldPattern.test(content)) {
        continue;
      }

      const fieldLines = findLineNumbers(content, rule.fieldPattern, rule.ignorePattern).slice(0, 20);
      if (fieldLines.length === 0) {
        continue;
      }

      findings.push({
        rule: rule.id,
        severity: rule.severity,
        rationale: rule.rationale,
        file: path.relative(ROOT, filePath).replace(/\\/g, "/"),
        tableLines,
        fieldLines,
      });
    }
  }

  const blockers = findings.filter((f) => f.severity === "blocker");
  const deferred = findings.filter((f) => f.severity === "deferred");

  const report = {
    generatedAt: new Date().toISOString(),
    blockers: blockers.length,
    deferred: deferred.length,
    findings,
  };

  console.log(JSON.stringify(report, null, 2));

  if (blockers.length > 0) {
    process.exit(2);
  }
}

main();
