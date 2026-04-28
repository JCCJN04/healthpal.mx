import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const {
      document_request_id,
      patient_phone,
      doctor_name,
      document_type,
      doctor_id,
    } = await req.json()

    if (!document_request_id || !patient_phone || !doctor_name || !document_type || !doctor_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const whatsappToken = Deno.env.get('WHATSAPP_TOKEN')
    const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Missing SUPABASE env vars' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }
    if (!whatsappToken || !phoneNumberId) {
      return new Response(
        JSON.stringify({ error: 'Missing WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID secrets' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Validate document request exists
    const { data: docReq, error: docReqErr } = await supabase
      .from('document_requests')
      .select('id, token, status')
      .eq('id', document_request_id)
      .single()

    if (docReqErr || !docReq) {
      return new Response(
        JSON.stringify({ error: 'Document request not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Build the upload link
    const uploadLink = `${Deno.env.get('APP_URL') ?? 'https://healthpal.mx'}/solicitud/${docReq.token}`

    // Create whatsapp_sessions record
    const { error: sessionErr } = await supabase
      .from('whatsapp_sessions')
      .insert({
        patient_phone,
        doctor_id,
        document_request_id,
        status: 'waiting',
      })

    if (sessionErr) {
      console.error('whatsapp_sessions insert error:', sessionErr)
      // Non-fatal — still try to send the message
    }

    // Send WhatsApp message via Meta Graph API
    const messageBody = `Hola 👋 El *Dr. ${doctor_name}* te solicita: *${document_type}*\n\nTienes dos opciones para enviarlo:\n\n1️⃣ Responde este mensaje con el archivo (foto o PDF)\n\n2️⃣ Súbelo desde este enlace: ${uploadLink}\n\nTu documento quedará guardado de forma segura en HealthPal 🔒`

    const waRes = await fetch(
      `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${whatsappToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: patient_phone,
          type: 'text',
          text: { body: messageBody },
        }),
      },
    )

    if (!waRes.ok) {
      const waError = await waRes.text()
      console.error('WhatsApp API error:', waRes.status, waError)
      return new Response(
        JSON.stringify({ error: 'Failed to send WhatsApp message', detail: waError, wa_status: waRes.status }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('send-document-request-whatsapp error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
