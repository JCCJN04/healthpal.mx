#!/usr/bin/env node
/**
 * One-time script: uploads the 24 insurance PDF templates from
 * public/informes medicos aseguradoras/ → Supabase Storage bucket "report-templates"
 *
 * Usage:
 *   node scripts/upload-report-templates.mjs
 *
 * Requires VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

// Load .env manually (no dotenv dep needed — just parse KEY=VALUE lines)
const envPath = path.join(ROOT, '.env')
const env = {}
if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
        const m = line.match(/^([^#=\s]+)\s*=\s*(.*)$/)
        if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
    }
}

const SUPABASE_URL = env.VITE_SUPABASE_URL
const SERVICE_KEY  = env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
    process.exit(1)
}

const TEMPLATES_DIR = path.join(ROOT, 'public', 'informes medicos aseguradoras')
const BUCKET = 'report-templates'

async function uploadFile(fileName) {
    const filePath = path.join(TEMPLATES_DIR, fileName)
    const fileBytes = fs.readFileSync(filePath)

    const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodeURIComponent(fileName)}`

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${SERVICE_KEY}`,
            'Content-Type': 'application/pdf',
            'x-upsert': 'true',
        },
        body: fileBytes,
    })

    if (!res.ok) {
        const body = await res.text()
        throw new Error(`${res.status}: ${body}`)
    }

    return await res.json()
}

const files = fs.readdirSync(TEMPLATES_DIR).filter(f => f.endsWith('.pdf'))
console.log(`Uploading ${files.length} PDF templates to bucket "${BUCKET}"…\n`)

let ok = 0, fail = 0
for (const file of files) {
    try {
        await uploadFile(file)
        console.log(`  ✓  ${file}`)
        ok++
    } catch (e) {
        console.error(`  ✗  ${file} — ${e.message}`)
        fail++
    }
}

console.log(`\nDone: ${ok} uploaded, ${fail} failed`)
if (ok === files.length) {
    console.log('\nYou can now remove public/informes medicos aseguradoras/ from the repo.')
}
