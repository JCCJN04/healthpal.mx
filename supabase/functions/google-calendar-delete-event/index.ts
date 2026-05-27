import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const ALLOWED_ORIGINS = new Set(['https://healthpal.mx', 'https://www.healthpal.mx', 'http://localhost:3000'])

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') ?? ''
  const allowedOrigin = ALLOWED_ORIGINS.has(origin) ? origin : 'https://healthpal.mx'
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<{ access_token: string; expires_in: number } | null> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  })
  if (!res.ok) return null
  return res.json()
}

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req)

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID')!
    const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')!

    // Authenticate caller
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    })

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const { appointmentId } = await req.json()
    if (!appointmentId) {
      return new Response(JSON.stringify({ error: 'appointmentId requerido' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Fetch appointment — caller must be patient or doctor
    const { data: appt, error: apptError } = await supabase
      .from('appointments')
      .select('doctor_id, patient_id, google_calendar_event_id')
      .eq('id', appointmentId)
      .single()

    if (apptError || !appt) {
      return new Response(JSON.stringify({ error: 'Cita no encontrada' }), {
        status: 404, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Security: caller must be patient or doctor of this appointment
    if (appt.doctor_id !== user.id && appt.patient_id !== user.id) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 403, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // No calendar event to delete
    if (!appt.google_calendar_event_id) {
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Get doctor's tokens
    const { data: tokenRow, error: tokenError } = await supabase
      .from('google_calendar_tokens')
      .select('access_token, refresh_token, expires_at, calendar_id')
      .eq('user_id', appt.doctor_id)
      .single()

    if (tokenError || !tokenRow) {
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    let accessToken = tokenRow.access_token
    const expiresAt = new Date(tokenRow.expires_at).getTime()

    if (Date.now() > expiresAt - 60_000) {
      if (!tokenRow.refresh_token) {
        return new Response(JSON.stringify({ success: true, skipped: true }), {
          status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }
      const refreshed = await refreshAccessToken(tokenRow.refresh_token, googleClientId, googleClientSecret)
      if (refreshed) {
        accessToken = refreshed.access_token
        const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
        supabase.from('google_calendar_tokens')
          .update({ access_token: accessToken, expires_at: newExpiry })
          .eq('user_id', appt.doctor_id)
          .then(() => {})
      }
    }

    const calendarId = encodeURIComponent(tokenRow.calendar_id || 'primary')
    const deleteRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${appt.google_calendar_event_id}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    )

    // 204 = deleted, 404 = already gone — both are fine
    if (!deleteRes.ok && deleteRes.status !== 404) {
      console.error('Calendar delete failed:', deleteRes.status, await deleteRes.text())
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('google-calendar-delete-event error:', err)
    return new Response(JSON.stringify({ error: 'Error interno' }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
