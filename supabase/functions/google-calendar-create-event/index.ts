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
  if (!res.ok) {
    const errText = await res.text()
    console.error('Token refresh failed:', errText)
    return null
  }
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

    if (!googleClientId || !googleClientSecret) {
      return new Response(JSON.stringify({ error: 'Google OAuth no está configurado' }), {
        status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

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

    const body = await req.json()
    const { appointmentId, title, description, startDateTime, endDateTime, timeZone } = body

    if (!appointmentId || !title || !startDateTime || !endDateTime) {
      return new Response(JSON.stringify({ error: 'Parámetros faltantes' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Fetch appointment to get doctorId and verify authorization
    const { data: appt, error: apptError } = await supabase
      .from('appointments')
      .select('doctor_id, patient_id')
      .eq('id', appointmentId)
      .single()

    if (apptError || !appt) {
      return new Response(JSON.stringify({ error: 'Cita no encontrada' }), {
        status: 404, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Caller must be doctor or patient of this appointment
    if (appt.doctor_id !== user.id && appt.patient_id !== user.id) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 403, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Get doctor's Google Calendar tokens (service role bypasses RLS)
    const { data: tokenRow, error: tokenError } = await supabase
      .from('google_calendar_tokens')
      .select('access_token, refresh_token, expires_at, calendar_id')
      .eq('user_id', appt.doctor_id)
      .single()

    if (tokenError || !tokenRow) {
      // Doctor has no calendar connected — skip silently
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    let accessToken = tokenRow.access_token
    const expiresAt = new Date(tokenRow.expires_at).getTime()

    // Auto-refresh if token expired (with 60s buffer)
    if (Date.now() > expiresAt - 60_000) {
      if (!tokenRow.refresh_token) {
        console.error('Token expired and no refresh_token available for doctor:', appt.doctor_id)
        return new Response(JSON.stringify({ success: true, skipped: true }), {
          status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }
      const refreshed = await refreshAccessToken(tokenRow.refresh_token, googleClientId, googleClientSecret)
      if (!refreshed) {
        console.error('Failed to refresh token for doctor:', appt.doctor_id)
        return new Response(JSON.stringify({ success: true, skipped: true }), {
          status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }
      accessToken = refreshed.access_token
      const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
      supabase.from('google_calendar_tokens')
        .update({ access_token: accessToken, expires_at: newExpiry })
        .eq('user_id', appt.doctor_id)
        .then(() => {})
    }

    const calendarId = encodeURIComponent(tokenRow.calendar_id || 'primary')

    // Create the calendar event
    const eventBody = {
      summary: title,
      description: description ?? '',
      start: {
        dateTime: startDateTime,
        timeZone: timeZone ?? 'America/Mexico_City',
      },
      end: {
        dateTime: endDateTime,
        timeZone: timeZone ?? 'America/Mexico_City',
      },
    }

    const createRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventBody),
      }
    )

    if (!createRes.ok) {
      const errText = await createRes.text()
      console.error('Google Calendar event creation failed:', createRes.status, errText)
      return new Response(JSON.stringify({ error: `Error de Google Calendar (${createRes.status})` }), {
        status: 502, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const eventData = await createRes.json()
    const eventId = eventData.id as string

    // Store the event ID on the appointment
    const { error: updateError } = await supabase
      .from('appointments')
      .update({ google_calendar_event_id: eventId, updated_at: new Date().toISOString() })
      .eq('id', appointmentId)

    if (updateError) {
      console.error('Failed to update appointment with event ID:', updateError)
    }

    return new Response(JSON.stringify({ success: true, eventId, htmlLink: eventData.htmlLink }), {
      status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('google-calendar-create-event error:', err)
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
