import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ── Crypto helpers ────────────────────────────────────────────────────────────

function base64ToBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

async function importPublicKey(base64Spki: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'spki',
    base64ToBuffer(base64Spki),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['wrapKey'],
  )
}

async function generateDocumentKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
}

async function wrapDocumentKey(docKey: CryptoKey, publicKey: CryptoKey): Promise<string> {
  const wrappedBuffer = await crypto.subtle.wrapKey('raw', docKey, publicKey, { name: 'RSA-OAEP' })
  return bufferToBase64(wrappedBuffer)
}

async function encryptBuffer(
  buffer: ArrayBuffer,
  docKey: CryptoKey,
): Promise<{ encryptedData: ArrayBuffer; docIv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encryptedData = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, docKey, buffer)
  return { encryptedData, docIv: bufferToBase64(iv.buffer) }
}

// ─────────────────────────────────────────────────────────────────────────────

function getJwtRole(authHeader: string): string | null {
  try {
    const token = authHeader.replace('Bearer ', '')
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload?.role ?? null
  } catch { return null }
}

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  // Only callable with service role JWT
  const authHeader = req.headers.get('authorization') ?? ''
  if (getJwtRole(authHeader) !== 'service_role') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!

  try {
    const { document_id } = await req.json()
    if (!document_id) {
      return new Response(JSON.stringify({ error: 'document_id requerido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      supabaseUrl,
      serviceKey,
      { auth: { persistSession: false, autoRefreshToken: false } },
    )

    // 1. Fetch document record
    const { data: doc, error: docErr } = await supabase
      .from('documents')
      .select('id, owner_id, patient_id, title, mime_type, is_encrypted')
      .eq('id', document_id)
      .single()

    if (docErr || !doc) {
      return new Response(JSON.stringify({ error: 'Documento no encontrado' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (doc.is_encrypted) {
      return new Response(JSON.stringify({ skipped: true, reason: 'Ya está encriptado' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 2. Check if already has a key entry
    const { data: existingKey } = await supabase
      .from('document_keys')
      .select('document_id')
      .eq('document_id', document_id)
      .maybeSingle()

    if (existingKey) {
      return new Response(JSON.stringify({ skipped: true, reason: 'Ya tiene entrada en document_keys' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 3. Fetch owner's RSA public key
    const { data: cryptoRow, error: cryptoErr } = await supabase
      .from('user_crypto_keys')
      .select('public_key_spki')
      .eq('user_id', doc.owner_id)
      .maybeSingle()

    if (cryptoErr || !cryptoRow?.public_key_spki) {
      return new Response(
        JSON.stringify({ error: 'El usuario no tiene llave pública registrada. Debe iniciar sesión primero.' }),
        { status: 422, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const publicKey = await importPublicKey(cryptoRow.public_key_spki)

    // 4. Find the file in storage (list folder owner_id/doc_id/)
    const folderPath = `${doc.owner_id}/${document_id}`
    const { data: files, error: listErr } = await supabase.storage
      .from('documents')
      .list(folderPath, { limit: 10 })

    if (listErr || !files?.length) {
      return new Response(JSON.stringify({ error: 'Archivo no encontrado en Storage' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const realFile = files.find((f) => f.name && !f.name.startsWith('.'))
    if (!realFile) {
      return new Response(JSON.stringify({ error: 'No se encontró archivo real en la carpeta' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const originalPath = `${folderPath}/${realFile.name}`

    // 5. Download via Storage REST API (most reliable with service key)
    const storageUrl = `${supabaseUrl}/storage/v1/object/documents/${originalPath}`
    const fileRes = await fetch(storageUrl, {
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
    })

    if (!fileRes.ok) {
      const errText = await fileRes.text().catch(() => '')
      return new Response(JSON.stringify({ error: `Descarga fallida: ${fileRes.status} ${errText}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const plainBuffer = await fileRes.arrayBuffer()

    // 6. Encrypt
    const docKey = await generateDocumentKey()
    const { encryptedData, docIv } = await encryptBuffer(plainBuffer, docKey)
    const wrappedKey = await wrapDocumentKey(docKey, publicKey)

    // 7. Upload encrypted file (new name: doc_id.bin)
    const encryptedPath = `${folderPath}/${document_id}.bin`
    const { error: uploadErr } = await supabase.storage
      .from('documents')
      .upload(encryptedPath, encryptedData, { contentType: 'application/octet-stream', upsert: true })

    if (uploadErr) {
      return new Response(JSON.stringify({ error: `Upload encriptado falló: ${uploadErr.message}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 8. Delete original plain file
    await supabase.storage.from('documents').remove([originalPath])

    // 9. Store wrapped key
    const { error: keyInsertErr } = await supabase.from('document_keys').insert({
      document_id,
      user_id: doc.owner_id,
      wrapped_key: wrappedKey,
      doc_iv: docIv,
    })
    if (keyInsertErr) {
      console.warn('document_keys insert failed:', keyInsertErr.message)
    }

    // 10. Mark document as encrypted
    await supabase
      .from('documents')
      .update({ is_encrypted: true })
      .eq('id', document_id)

    console.log(`Encrypted document ${document_id} for owner ${doc.owner_id}`)

    return new Response(
      JSON.stringify({ success: true, document_id, owner_id: doc.owner_id }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    const error = err as Error
    console.error('encrypt-existing-document error:', error.message, error.stack)
    return new Response(JSON.stringify({ error: 'Error interno' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
