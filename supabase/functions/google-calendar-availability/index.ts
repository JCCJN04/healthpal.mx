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

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }

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

    // Authenticate caller via Supabase JWT
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
    const { doctorId, date } = body  // date = 'YYYY-MM-DD'

    if (!doctorId || !date) {
      return new Response(JSON.stringify({ error: 'doctorId y date son requeridos' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Fetch doctor's Google Calendar tokens using service role (bypasses RLS)
    const { data: tokenRow, error: tokenError } = await supabase
      .from('google_calendar_tokens')
      .select('access_token, refresh_token, expires_at, calendar_id')
      .eq('user_id', doctorId)
      .single()

    if (tokenError || !tokenRow) {
      // Doctor has no Google Calendar connected — return empty busy list
      return new Response(JSON.stringify({ busy: [], connected: false }), {
        status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    let accessToken = tokenRow.access_token
    const expiresAt = new Date(tokenRow.expires_at).getTime()

    // Auto-refresh if token expired (with 60s buffer)
    if (Date.now() > expiresAt - 60_000) {
      if (!tokenRow.refresh_token) {
        return new Response(JSON.stringify({ busy: [], connected: false }), {
          status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }
      const refreshed = await refreshAccessToken(tokenRow.refresh_token, googleClientId, googleClientSecret)
      if (!refreshed) {
        return new Response(JSON.stringify({ busy: [], connected: false }), {
          status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }
      accessToken = refreshed.access_token
      const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
      // Update token in DB (best-effort, non-blocking)
      supabase
        .from('google_calendar_tokens')
        .update({ access_token: accessToken, expires_at: newExpiry })
        .eq('user_id', doctorId)
        .then(() => {})
    }

    // Fetch events for the given day
    const timeMin = `${date}T00:00:00-06:00`  // Mexico City offset
    const timeMax = `${date}T23:59:59-06:00`
    const calendarId = encodeURIComponent(tokenRow.calendar_id || 'primary')

    const eventsRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?` +
      new URLSearchParams({
        timeMin,
        timeMax,
        singleEvents: 'true',
        orderBy: 'startTime',
        fields: 'items(start,end,status)',
      }),
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    )

    if (!eventsRes.ok) {
      const errText = await eventsRes.text()
      console.error('Google Calendar events fetch failed:', errText)
      // Non-fatal — return empty so all slots show
      return new Response(JSON.stringify({ busy: [], connected: true }), {
        status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const eventsData = await eventsRes.json()
    const busy = (eventsData.items ?? [])
      .filter((e: { status?: string; start?: { dateTime?: string; date?: string }; end?: { dateTime?: string; date?: string } }) => e.status !== 'cancelled')
      .map((e: { status?: string; start?: { dateTime?: string; date?: string }; end?: { dateTime?: string; date?: string } }) => ({
        start: e.start?.dateTime ?? `${e.start?.date}T00:00:00`,
        end: e.end?.dateTime ?? `${e.end?.date}T23:59:59`,
      }))

    return new Response(JSON.stringify({ busy, connected: true }), {
      status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('google-calendar-availability error:', err)
    return new Response(JSON.stringify({ error: 'Error interno', busy: [] }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
