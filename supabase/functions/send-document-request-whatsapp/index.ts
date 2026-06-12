import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = new Set(['https://healthpal.mx', 'https://www.healthpal.mx'])

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') ?? ''
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.has(origin) ? origin : 'https://healthpal.mx',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const PHONE_RE = /^\d{10,15}$/

async function checkRateLimit(
  supabase: ReturnType<typeof createClient>,
  key: string,
  max: number,
): Promise<boolean> {
  const resetAt = new Date(
    Math.ceil(Date.now() / 3_600_000) * 3_600_000,
  ).toISOString()
  const { data, error } = await supabase.rpc('increment_rate_limit_bucket', {
    p_key: key,
    p_reset_at: resetAt,
  })
  if (error) {
    console.warn('rate_limit rpc error (allowing):', error.message)
    return true // fail open — don't block on infra error
  }
  return (data as number) <= max
}

function sanitizeText(input: unknown, maxLen: number): string {
  return String(input ?? '')
    .replace(/<[^>]*>/g, '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1f\x7f]/g, '')
    .trim()
    .slice(0, maxLen)
}

serve(async (req) => {
  const cors = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }

  try {
    // Extract JWT — verify_jwt:true means Supabase gateway already validated it,
    // but we still need it to confirm identity and role.
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }
    const token = authHeader.slice(7)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    const twilioFrom = Deno.env.get('TWILIO_WHATSAPP_FROM') // whatsapp:+5218126251579

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Missing SUPABASE env vars' }),
        { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }
    if (!twilioAccountSid || !twilioAuthToken || !twilioFrom) {
      return new Response(
        JSON.stringify({ error: 'Missing TWILIO secrets' }),
        { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Verify caller identity via JWT
    const { data: { user }, error: userErr } = await supabase.auth.getUser(token)
    if (userErr || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    // Verify caller is a doctor
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'doctor') {
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    // Rate limit: 20 requests per doctor per hour (DB-backed, survives cold starts)
    if (!await checkRateLimit(supabase, `send-doc-wa:${user.id}`, 20)) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }),
        { status: 429, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    // Parse and validate body
    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    const { document_request_id, patient_phone, doctor_name, document_type, doctor_id } = body

    console.log('payload', { document_request_id, patient_phone, doctor_name: typeof doctor_name, document_type: typeof document_type, doctor_id, caller_id: user.id })

    if (!document_request_id || !patient_phone || !doctor_name || !document_type || !doctor_id) {
      console.error('missing fields', { document_request_id: !!document_request_id, patient_phone: !!patient_phone, doctor_name: !!doctor_name, document_type: !!document_type, doctor_id: !!doctor_id })
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    if (!UUID_RE.test(String(document_request_id))) {
      console.error('bad document_request_id', document_request_id)
      return new Response(
        JSON.stringify({ error: 'Invalid document_request_id' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }
    if (!UUID_RE.test(String(doctor_id))) {
      console.error('bad doctor_id', doctor_id)
      return new Response(
        JSON.stringify({ error: 'Invalid doctor_id' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }
    // Prevent spoofing another doctor
    if (String(doctor_id) !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: doctor_id mismatch' }),
        { status: 403, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    const cleanPhone = String(patient_phone).replace(/\D/g, '')
    if (!PHONE_RE.test(cleanPhone)) {
      console.error('bad phone', { raw: patient_phone, clean: cleanPhone })
      return new Response(
        JSON.stringify({ error: 'Invalid patient_phone format' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    const cleanDoctorName = sanitizeText(doctor_name, 100)
    const cleanDocumentType = sanitizeText(document_type, 100)

    if (!cleanDoctorName || !cleanDocumentType) {
      console.error('empty name/type after sanitize', { cleanDoctorName, cleanDocumentType })
      return new Response(
        JSON.stringify({ error: 'doctor_name and document_type must not be empty' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    // Validate document request exists and belongs to this doctor
    const { data: docReq, error: docReqErr } = await supabase
      .from('document_requests')
      .select('id, token, status')
      .eq('id', document_request_id)
      .eq('doctor_id', user.id)
      .single()

    if (docReqErr || !docReq) {
      return new Response(
        JSON.stringify({ error: 'Document request not found' }),
        { status: 404, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    // Create whatsapp_sessions record
    const { error: sessionErr } = await supabase
      .from('whatsapp_sessions')
      .insert({
        patient_phone: cleanPhone,
        doctor_id: user.id,
        document_request_id,
        status: 'waiting',
      })

    if (sessionErr) {
      console.error('whatsapp_sessions insert error:', sessionErr)
      // Non-fatal — still try to send
    }

    const toPhone = `whatsapp:+${cleanPhone}`

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`
    const credentials = btoa(`${twilioAccountSid}:${twilioAuthToken}`)

    const formBody = new URLSearchParams()
    formBody.set('From', twilioFrom)
    formBody.set('To', toPhone)
    formBody.set('ContentSid', 'HX13845df01dae4d5d7dc9dbcf1de09439')
    formBody.set('ContentVariables', JSON.stringify({ '1': cleanDoctorName, '2': cleanDocumentType }))

    const twilioRes = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formBody.toString(),
    })

    const twilioBody = await twilioRes.text()
    if (!twilioRes.ok) {
      console.error('Twilio API error:', twilioRes.status, twilioBody)
      return new Response(
        JSON.stringify({ error: 'Failed to send WhatsApp message', detail: twilioBody, wa_status: twilioRes.status }),
        { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    // Log message SID + initial status for delivery debugging
    try {
      const twilioJson = JSON.parse(twilioBody)
      console.log('Twilio message queued:', {
        sid: twilioJson.sid,
        status: twilioJson.status,
        to: twilioJson.to,
        error_code: twilioJson.error_code ?? null,
        error_message: twilioJson.error_message ?? null,
      })
    } catch {
      console.log('Twilio response (raw):', twilioBody)
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('send-document-request-whatsapp error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
    )
  }
})
