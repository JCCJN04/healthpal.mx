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

    if (!googleClientId || !googleClientSecret) {
      return new Response(
        JSON.stringify({ error: 'Google OAuth no está configurado en el servidor' }),
        { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
      )
    }

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
    const action = body.action ?? 'exchange'

    // ─── Action: refresh ─────────────────────────────────────────────────────
    if (action === 'refresh') {
      // Read refresh_token from DB
      const { data: row, error: fetchError } = await supabase
        .from('google_calendar_tokens')
        .select('refresh_token')
        .eq('user_id', user.id)
        .single()

      if (fetchError || !row) {
        return new Response(JSON.stringify({ error: 'No hay tokens almacenados para este usuario' }), {
          status: 404, headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }

      if (!row.refresh_token) {
        return new Response(JSON.stringify({ error: 'No hay refresh_token disponible. Reconecta tu cuenta de Google.' }), {
          status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }

      const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: googleClientId,
          client_secret: googleClientSecret,
          refresh_token: row.refresh_token,
          grant_type: 'refresh_token',
        }),
      })

      if (!refreshRes.ok) {
        const errBody = await refreshRes.text()
        console.error('Google token refresh failed:', errBody)
        return new Response(
          JSON.stringify({ error: 'Error al renovar tokens de Google' }),
          { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } }
        )
      }

      const refreshData = await refreshRes.json()
      const { access_token, expires_in } = refreshData

      if (!access_token) {
        return new Response(JSON.stringify({ error: 'No se recibió access_token al renovar' }), {
          status: 502, headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }

      const expiresAt = new Date(Date.now() + (expires_in ?? 3600) * 1000).toISOString()

      const { error: updateError } = await supabase
        .from('google_calendar_tokens')
        .update({
          access_token,
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)

      if (updateError) {
        console.error('Failed to update refreshed token:', updateError)
        return new Response(JSON.stringify({ error: 'Error al guardar token renovado' }), {
          status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ success: true, access_token, expires_at: expiresAt }), {
        status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // ─── Action: exchange (default) ──────────────────────────────────────────
    const { code, verifier, redirectUri } = body

    if (!code || !verifier || !redirectUri) {
      return new Response(JSON.stringify({ error: 'Parámetros faltantes' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Exchange authorization code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: googleClientId,
        client_secret: googleClientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        code_verifier: verifier,
      }),
    })

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text()
      console.error('Google token exchange failed:', errBody)
      return new Response(
        JSON.stringify({ error: 'Error al obtener tokens de Google' }),
        { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } }
      )
    }

    const tokenData = await tokenRes.json()
    const { access_token, refresh_token, expires_in } = tokenData

    if (!access_token) {
      return new Response(JSON.stringify({ error: 'No se recibió access_token' }), {
        status: 502, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const expiresAt = new Date(Date.now() + (expires_in ?? 3600) * 1000).toISOString()

    // Upsert tokens in DB
    const { error: upsertError } = await supabase
      .from('google_calendar_tokens')
      .upsert({
        user_id: user.id,
        access_token,
        refresh_token: refresh_token ?? null,
        expires_at: expiresAt,
        calendar_id: 'primary',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

    if (upsertError) {
      console.error('Failed to store tokens:', upsertError)
      return new Response(JSON.stringify({ error: 'Error al guardar tokens' }), {
        status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('google-calendar-auth error:', err)
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
