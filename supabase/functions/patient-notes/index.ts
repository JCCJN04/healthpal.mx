import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const ALLOWED_ORIGINS = new Set(['https://healthpal.mx', 'https://www.healthpal.mx', 'http://localhost:3000', 'http://localhost:5173'])

function getCorsHeaders(req: Request) {
    const origin = req.headers.get('origin') ?? ''
    return {
        'Access-Control-Allow-Origin': ALLOWED_ORIGINS.has(origin) ? origin : 'https://healthpal.mx',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    }
}

function toHex(bytes: Uint8Array): string {
    return '\\x' + Array.from(bytes).map((b: number) => b.toString(16).padStart(2, '0')).join('')
}

function fromHex(hex: string): Uint8Array {
    const h = (hex as string).startsWith('\\x') ? (hex as string).slice(2) : (hex as string).replace(/^0x/, '')
    const bytes = new Uint8Array(h.length / 2)
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16)
    }
    return bytes
}

async function buildAesKey(keyB64: string): Promise<CryptoKey> {
    const keyBytes = Uint8Array.from(atob(keyB64), (c: string) => c.charCodeAt(0))
    return crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

Deno.serve(async (req: Request) => {
    const cors = getCorsHeaders(req)

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: cors });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
        const encKeyB64 = Deno.env.get('SENSITIVE_DATA_ENC_KEY_B64')
        const keyId = Deno.env.get('SENSITIVE_DATA_KEY_ID') || 'local-dev-k1'
        const keyVer = parseInt(Deno.env.get('SENSITIVE_DATA_KEY_VER') || '1')

        if (!encKeyB64) {
            return new Response(JSON.stringify({ error: 'Clave de cifrado no configurada en el servidor' }), {
                status: 500, headers: { ...cors, 'Content-Type': 'application/json' }
            })
        }

        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'No autorizado' }), {
                status: 401, headers: { ...cors, 'Content-Type': 'application/json' }
            })
        }

        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } }
        })

        const aesKey = await buildAesKey(encKeyB64)

        // ── POST: crear nota ────────────────────────────────────────
        if (req.method === 'POST') {
            const { patient_id, title, body } = await req.json()
            if (!patient_id || !body?.trim()) {
                return new Response(JSON.stringify({ error: 'Faltan campos requeridos' }), {
                    status: 400, headers: { ...cors, 'Content-Type': 'application/json' }
                })
            }

            const token = authHeader.replace('Bearer ', '')
            const { data: { user }, error: userError } = await supabase.auth.getUser(token)
            if (userError || !user) {
                return new Response(JSON.stringify({ error: 'No autorizado' }), {
                    status: 401, headers: { ...cors, 'Content-Type': 'application/json' }
                })
            }

            const iv = crypto.getRandomValues(new Uint8Array(12))
            const encoded = new TextEncoder().encode(body)
            const cipherBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, encoded)
            const cipherBytes = new Uint8Array(cipherBuffer)

            const { data, error } = await supabase
                .from('patient_notes')
                .insert({
                    patient_id,
                    doctor_id: user.id,
                    title: title || 'Nota Clínica',
                    body_enc: toHex(cipherBytes),
                    body_nonce: toHex(iv),
                    body_kid: keyId,
                    body_ver: keyVer,
                })
                .select()
                .single()

            if (error) {
                return new Response(JSON.stringify({ error: error.message }), {
                    status: 400, headers: { ...cors, 'Content-Type': 'application/json' }
                })
            }

            return new Response(JSON.stringify({ ...data, body }), {
                headers: { ...cors, 'Content-Type': 'application/json' }
            })
        }

        // ── GET: leer y descifrar notas ─────────────────────────────
        if (req.method === 'GET') {
            const url = new URL(req.url)
            const patientId = url.searchParams.get('patient_id')
            const doctorId = url.searchParams.get('doctor_id')

            if (!patientId || !doctorId) {
                return new Response(JSON.stringify({ error: 'Faltan patient_id o doctor_id' }), {
                    status: 400, headers: { ...cors, 'Content-Type': 'application/json' }
                })
            }

            const { data, error } = await supabase
                .from('patient_notes')
                .select('*')
                .eq('patient_id', patientId)
                .eq('doctor_id', doctorId)
                .order('created_at', { ascending: false })

            if (error) {
                return new Response(JSON.stringify({ error: error.message }), {
                    status: 400, headers: { ...cors, 'Content-Type': 'application/json' }
                })
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const decrypted = await Promise.all((data || []).map(async (note: any) => {
                if (!note.body_enc || !note.body_nonce) return { ...note, body: '' }
                try {
                    const cipherBytes = fromHex(note.body_enc)
                    const iv = fromHex(note.body_nonce)
                    const plainBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, aesKey, cipherBytes)
                    const body = new TextDecoder().decode(plainBuffer)
                    return { ...note, body }
                } catch {
                    return { ...note, body: '[Nota cifrada — clave incorrecta]' }
                }
            }))

            return new Response(JSON.stringify(decrypted), {
                headers: { ...cors, 'Content-Type': 'application/json' }
            })
        }

        return new Response('Method not allowed', { status: 405, headers: cors })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err?.message || 'Error interno' }), {
            status: 500, headers: { ...cors, 'Content-Type': 'application/json' }
        })
    }
})
