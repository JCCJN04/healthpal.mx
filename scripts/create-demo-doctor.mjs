#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const ROOT = process.cwd()
const ENV_PATH = path.join(ROOT, '.env')

function parseDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return {}

  const content = fs.readFileSync(filePath, 'utf8')
  const env = {}

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const idx = line.indexOf('=')
    if (idx <= 0) continue

    const key = line.slice(0, idx).trim()
    const value = line.slice(idx + 1).trim().replace(/^['\"]|['\"]$/g, '')
    env[key] = value
  }

  return env
}

function upsertEnvVar(filePath, key, value) {
  const line = `${key}=${value}`

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, `${line}\n`, 'utf8')
    return
  }

  const content = fs.readFileSync(filePath, 'utf8')
  const regex = new RegExp(`^${key}=.*$`, 'm')

  if (regex.test(content)) {
    fs.writeFileSync(filePath, content.replace(regex, line), 'utf8')
    return
  }

  const next = content.endsWith('\n') ? `${content}${line}\n` : `${content}\n${line}\n`
  fs.writeFileSync(filePath, next, 'utf8')
}

async function getUserByEmail(adminClient, email) {
  let page = 1
  const perPage = 200

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage })
    if (error) throw new Error(`No se pudo listar usuarios: ${error.message}`)

    const users = data?.users || []
    const match = users.find((u) => (u.email || '').toLowerCase() === email.toLowerCase())
    if (match) return match

    if (users.length < perPage) return null
    page += 1
  }
}

async function main() {
  const mergedEnv = {
    ...parseDotEnv(ENV_PATH),
    ...process.env,
  }

  const supabaseUrl = mergedEnv.VITE_SUPABASE_URL || mergedEnv.SUPABASE_URL
  const serviceRoleKey = mergedEnv.SUPABASE_SERVICE_ROLE_KEY
  const demoEmail = mergedEnv.DEMO_DOCTOR_EMAIL || 'demo@healthpal.mx'
  const demoPassword = mergedEnv.DEMO_DOCTOR_PASSWORD || 'DemoDoctor#2026'

  if (!supabaseUrl) throw new Error('Falta VITE_SUPABASE_URL en .env')
  if (!serviceRoleKey) throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY en .env')

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let user = await getUserByEmail(adminClient, demoEmail)

  if (!user) {
    const { data, error } = await adminClient.auth.admin.createUser({
      email: demoEmail,
      password: demoPassword,
      email_confirm: true,
      user_metadata: {
        full_name: 'Pedro Garcia',
        role: 'doctor',
        especialidad: 'Medicina General',
        avatar_url: null,
      },
      app_metadata: {
        provider: 'email',
        role: 'doctor',
      },
    })

    if (error || !data.user) {
      throw new Error(`No se pudo crear usuario demo doctor: ${error?.message || 'sin detalle'}`)
    }

    user = data.user
    console.log('[OK] Usuario demo doctor creado en auth.users')
  } else {
    console.log('[OK] Usuario demo doctor ya existia')

    const { error: updateError } = await adminClient.auth.admin.updateUserById(user.id, {
      password: demoPassword,
      user_metadata: {
        ...(user.user_metadata || {}),
        full_name: 'Pedro Garcia',
        role: 'doctor',
        especialidad: 'Medicina General',
        avatar_url: null,
      },
    })

    if (updateError) {
      console.warn('[WARN] No se pudo actualizar metadata/password del usuario demo:', updateError.message)
    }
  }

  const doctorId = user.id

  const { error: profileError } = await adminClient
    .from('profiles')
    .upsert({
      id: doctorId,
      role: 'doctor',
      full_name: 'Pedro Garcia',
      email: demoEmail,
      onboarding_completed: true,
      onboarding_step: null,
    })

  if (profileError) throw new Error(`No se pudo upsert profiles: ${profileError.message}`)

  const { error: doctorProfileError } = await adminClient
    .from('doctor_profiles')
    .upsert({
      doctor_id: doctorId,
      slug: 'dr-demo-garcia',
      specialty: 'Medicina General',
      clinic_name: 'Healthpal Demo Clinic',
      bio: 'Perfil de demostración para pruebas del panel médico.',
      consultation_mode: 'in_person',
      is_public: true,
    })

  if (doctorProfileError) {
    console.warn('[WARN] No se pudo upsert doctor_profiles:', doctorProfileError.message)
  }

  upsertEnvVar(ENV_PATH, 'VITE_DEMO_DOCTOR_ID', doctorId)
  upsertEnvVar(ENV_PATH, 'VITE_DEMO_DOCTOR_EMAIL', demoEmail)
  upsertEnvVar(ENV_PATH, 'VITE_DEMO_DOCTOR_PASSWORD', demoPassword)

  console.log('[OK] Demo doctor listo')
  console.log(`- id: ${doctorId}`)
  console.log(`- email: ${demoEmail}`)
  console.log('- .env actualizado con VITE_DEMO_DOCTOR_ID, VITE_DEMO_DOCTOR_EMAIL y VITE_DEMO_DOCTOR_PASSWORD')
}

main().catch((err) => {
  console.error('[ERROR]', err.message)
  process.exit(1)
})
