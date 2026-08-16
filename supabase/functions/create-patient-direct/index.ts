/**
 * create-patient-direct
 *
 * Allows a verified doctor to create a pre-registered patient account
 * directly from the UI, without requiring a WhatsApp interaction first.
 *
 * Mirrors the "Scenario 0" pre-registration logic in whatsapp-webhook:
 *   - Creates auth user (email or phone fallback)
 *   - Upserts profiles with onboarding_step = 'whatsapp_preregistro'
 *   - Upserts patient_profiles
 *   - Upserts doctor_patient_consent with status = 'accepted'
 *
 * If the email belongs to a real HealthPal user (onboarding completed),
 * a pending consent request is created instead — patient must approve.
 *
 * POST body: { email: string, full_name: string, phone?: string }
 * Response:  { patient_id: string, created: boolean, requires_consent?: boolean }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = new Set(['https://healthpal.mx', 'https://www.healthpal.mx'])

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? ''
  const isLocalhost = origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.has(origin) || isLocalhost ? origin : 'null',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

serve(async (req: Request) => {
  const cors = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors })
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: cors })
  }

  try {
    // ── Authenticate caller ──────────────────────────────────────────────────
    const authHeader = req.headers.get('authorization') ?? ''
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    )

    const token = authHeader.replace('Bearer ', '')
    const {
      data: { user: callerUser },
      error: authErr,
    } = await supabaseAdmin.auth.getUser(token)

    if (authErr || !callerUser) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // ── Verify caller is a doctor ────────────────────────────────────────────
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', callerUser.id)
      .maybeSingle()

    if (callerProfile?.role !== 'doctor') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // ── Parse body ───────────────────────────────────────────────────────────
    const body = await req.json().catch(() => null)
    if (!body) {
      return new Response(JSON.stringify({ error: 'Body requerido' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const email: string = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const fullName: string = typeof body.full_name === 'string' ? body.full_name.trim() : ''
    const phone: string = typeof body.phone === 'string' ? body.phone.trim() : ''
    const birthdate: string = typeof body.birthdate === 'string' ? body.birthdate.trim() : ''
    const sex: string = typeof body.sex === 'string' ? body.sex.trim() : ''

    if (!email || !fullName) {
      return new Response(JSON.stringify({ error: 'email y full_name son requeridos' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // ── Check if email already has an auth account ──────────────────────────
    const { data: existingAuthId } = await supabaseAdmin.rpc('auth_user_id_by_email', {
      search_email: email,
    })

    let patientId: string | null = existingAuthId ?? null

    if (patientId) {
      // ── Email already exists — check consent status ──────────────────────
      const { data: existingConsent } = await supabaseAdmin
        .from('doctor_patient_consent')
        .select('status')
        .eq('doctor_id', callerUser.id)
        .eq('patient_id', patientId)
        .maybeSingle()

      if (existingConsent?.status === 'accepted') {
        return new Response(
          JSON.stringify({ error: 'Este paciente ya está en tu lista', patient_id: patientId }),
          { status: 409, headers: { ...cors, 'Content-Type': 'application/json' } },
        )
      }

      if (existingConsent?.status === 'requested') {
        return new Response(
          JSON.stringify({
            error:
              'Ya enviaste una solicitud de acceso a este paciente. Está pendiente de aprobación.',
            patient_id: patientId,
          }),
          { status: 409, headers: { ...cors, 'Content-Type': 'application/json' } },
        )
      }

      // ── Check if this is a real HealthPal user (not a pre-registration) ──
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('onboarding_completed, onboarding_step, role')
        .eq('id', patientId)
        .maybeSingle()

      const isRealUser =
        existingProfile?.onboarding_completed === true ||
        (existingProfile?.onboarding_step &&
          existingProfile.onboarding_step !== 'whatsapp_preregistro')

      if (isRealUser) {
        // Real HealthPal user — cannot auto-accept, must request consent
        const { error: consentErr } = await supabaseAdmin.from('doctor_patient_consent').upsert(
          {
            doctor_id: callerUser.id,
            patient_id: patientId,
            status: 'requested',
            share_basic_profile: false,
            share_documents: false,
          },
          { onConflict: 'doctor_id,patient_id' },
        )

        if (consentErr) {
          console.error('consent upsert error (pending):', consentErr.message)
          return new Response(
            JSON.stringify({ error: 'No se pudo enviar la solicitud de acceso' }),
            { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
          )
        }

        console.log(
          `Doctor ${callerUser.id} requested consent from existing HealthPal user ${patientId}`,
        )

        return new Response(
          JSON.stringify({ patient_id: patientId, created: false, requires_consent: true }),
          { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
        )
      }

      // Pre-registered patient (onboarding_step = 'whatsapp_preregistro') —
      // fall through to auto-accept below.
    } else {
      // ── Create new auth user ───────────────────────────────────────────────
      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
      })

      if (createErr || !newUser?.user) {
        console.error('createUser error:', createErr?.message)
        return new Response(JSON.stringify({ error: 'No se pudo crear la cuenta del paciente' }), {
          status: 500,
          headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }

      patientId = newUser.user.id
    }

    // ── Upsert profile (only for new or pre-registered patients) ────────────
    const profilePayload: Record<string, unknown> = {
      id: patientId,
      role: 'patient',
      full_name: fullName,
      onboarding_completed: false,
      onboarding_step: 'whatsapp_preregistro',
    }
    if (phone) profilePayload.phone = phone
    if (birthdate) profilePayload.birthdate = birthdate
    if (sex === 'male' || sex === 'female') profilePayload.sex = sex

    const { error: profileErr } = await supabaseAdmin
      .from('profiles')
      .upsert(profilePayload, { onConflict: 'id' })

    if (profileErr) {
      console.error('profiles upsert error:', profileErr.message)
      // Non-fatal if patient already had a profile
    }

    // ── Upsert patient_profiles ──────────────────────────────────────────────
    await supabaseAdmin
      .from('patient_profiles')
      .upsert({ patient_id: patientId }, { onConflict: 'patient_id' })

    // ── Upsert doctor_patient_consent (auto-accept for pre-registered) ───────
    const { error: consentErr } = await supabaseAdmin.from('doctor_patient_consent').upsert(
      {
        doctor_id: callerUser.id,
        patient_id: patientId,
        status: 'accepted',
        share_basic_profile: true,
        share_contact: true,
        share_documents: true,
        share_appointments: true,
        share_medical_notes: true,
        share_insurance: true,
        edit_clinical_history: true,
      },
      { onConflict: 'doctor_id,patient_id' },
    )

    if (consentErr) {
      console.error('consent upsert error:', consentErr.message)
      return new Response(
        JSON.stringify({ error: 'Paciente creado pero no se pudo vincular al doctor' }),
        { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    console.log(`Doctor ${callerUser.id} created patient ${patientId}`)

    return new Response(JSON.stringify({ patient_id: patientId, created: !existingAuthId }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const error = err as Error
    console.error('create-patient-direct error:', error.message)
    return new Response(JSON.stringify({ error: 'Error interno' }), {
      status: 500,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    })
  }
})
