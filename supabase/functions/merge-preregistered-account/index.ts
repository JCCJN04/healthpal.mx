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

/** Build phone variants to match webhook format vs onboarding format.
 *  Onboarding stores +52XXXXXXXXXX (10 digits, no mobile 1)
 *  Webhook stores    521XXXXXXXXXX (10 digits with mobile 1, no +)
 */
function buildPhoneVariants(phone: string): string[] {
  const variants = new Set<string>()
  const stripped = phone.replace(/^\+/, '')

  variants.add(phone)        // original (+52XXXXXXXXXX)
  variants.add(stripped)     // without + (52XXXXXXXXXX)

  // Add mobile 1: 52XXXXXXXXXX → 521XXXXXXXXXX
  if (stripped.startsWith('52') && !stripped.startsWith('521') && stripped.length === 12) {
    variants.add('521' + stripped.slice(2))
    variants.add('+521' + stripped.slice(2))
  }

  // Remove mobile 1: 521XXXXXXXXXX → 52XXXXXXXXXX
  if (stripped.startsWith('521') && stripped.length === 13) {
    variants.add('52' + stripped.slice(3))
    variants.add('+52' + stripped.slice(3))
  }

  // Without country code (10 digits)
  if (stripped.startsWith('52')) {
    const noCountry = stripped.startsWith('521') ? stripped.slice(3) : stripped.slice(2)
    if (noCountry.length === 10) variants.add(noCountry)
  }

  return [...variants]
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders })
  }

  try {
    // Authenticate caller (UUID_B — the currently logged-in user)
    const authHeader = req.headers.get('authorization') ?? ''
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    )

    // Verify JWT to get UUID_B
    const { data: { user: callerUser }, error: authErr } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', ''),
    )
    if (authErr || !callerUser) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const uuidB = callerUser.id

    const body = await req.json()
    const phone: string = body.phone ?? ''

    if (!phone) {
      return new Response(JSON.stringify({ error: 'phone requerido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const phoneVariants = buildPhoneVariants(phone)
    console.log('Looking for preregistro with phone variants:', phoneVariants)

    // Look for pre-registered profile (created by whatsapp-webhook Scenario 3)
    const { data: preregProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, role')
      .in('phone', phoneVariants)
      .eq('onboarding_step', 'whatsapp_preregistro')
      .limit(1)
      .maybeSingle()

    if (!preregProfile) {
      console.log('No preregistro found for phone:', phone)
      return new Response(JSON.stringify({ merged: false }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const uuidA = preregProfile.id
    console.log(`Merging: UUID_A=${uuidA} (preregistro) ← UUID_B=${uuidB} (current session)`)

    // Get UUID_B's current profile data to copy to UUID_A
    const { data: profileB } = await supabaseAdmin
      .from('profiles')
      .select('full_name, role, date_of_birth, avatar_url')
      .eq('id', uuidB)
      .maybeSingle()

    // Get UUID_B's email from auth
    const { data: { user: userB } } = await supabaseAdmin.auth.admin.getUserById(uuidB)
    const emailB = userB?.email ?? ''

    if (!emailB) {
      return new Response(JSON.stringify({ error: 'Current user has no email' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 1. Add email to UUID_A (the pre-registered account that owns the documents)
    const { error: updateAuthErr } = await supabaseAdmin.auth.admin.updateUserById(uuidA, {
      email: emailB,
      email_confirm: true,
    })
    if (updateAuthErr) {
      console.error('updateUserById failed:', updateAuthErr.message)
      return new Response(JSON.stringify({ error: 'No se pudo actualizar la cuenta pre-registrada' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Copy UUID_B's onboarding profile data to UUID_A
    const profileUpdates: Record<string, unknown> = {
      phone,
      onboarding_step: 'contact',
      onboarding_completed: false,
    }
    if (profileB?.full_name) profileUpdates.full_name = profileB.full_name
    if (profileB?.role) profileUpdates.role = profileB.role
    if (profileB?.date_of_birth) profileUpdates.date_of_birth = profileB.date_of_birth
    if (profileB?.avatar_url) profileUpdates.avatar_url = profileB.avatar_url

    await supabaseAdmin.from('profiles').update(profileUpdates).eq('id', uuidA)

    // 3. Generate magic link to re-authenticate as UUID_A without needing password
    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: emailB,
    })
    if (linkErr || !linkData?.properties?.hashed_token) {
      console.error('generateLink failed:', linkErr?.message)
      return new Response(JSON.stringify({ error: 'No se pudo generar enlace de acceso' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 4. Delete UUID_B (documents and profile stay under UUID_A)
    // Best-effort: don't fail the merge if this errors
    const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(uuidB)
    if (deleteErr) console.warn('deleteUser(UUID_B) failed (non-fatal):', deleteErr.message)

    console.log(`Merge complete: UUID_A=${uuidA} now has email=${emailB}`)

    return new Response(
      JSON.stringify({
        merged: true,
        merged_user_id: uuidA,
        token_hash: linkData.properties.hashed_token,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    const error = err as Error
    console.error('merge-preregistered-account error:', error.message, error.stack)
    return new Response(JSON.stringify({ error: 'Error interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
