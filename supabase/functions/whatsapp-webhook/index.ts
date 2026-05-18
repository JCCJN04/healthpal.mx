import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Crypto helpers (mirrors src/shared/lib/crypto.ts, Web Crypto API) ─────────

function base64ToBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function importPublicKey(base64Spki: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "spki",
    base64ToBuffer(base64Spki),
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["wrapKey"],
  );
}

async function generateDocumentKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
}

async function wrapDocumentKey(
  docKey: CryptoKey,
  publicKey: CryptoKey,
): Promise<string> {
  const wrappedBuffer = await crypto.subtle.wrapKey("raw", docKey, publicKey, {
    name: "RSA-OAEP",
  });
  return bufferToBase64(wrappedBuffer);
}

async function encryptBuffer(
  buffer: ArrayBuffer,
  docKey: CryptoKey,
): Promise<{ encryptedData: ArrayBuffer; docIv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encryptedData = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    docKey,
    buffer,
  );
  return { encryptedData, docIv: bufferToBase64(iv.buffer) };
}

// ──────────────────────────────────────────────────────────────────────────────

const ALLOWED_MIMES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

// Rate limit: 10 media messages per phone per hour
const phoneRateLimit = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(phone: string): boolean {
  const now = Date.now();
  const entry = phoneRateLimit.get(phone);
  if (!entry || now > entry.resetAt) {
    phoneRateLimit.set(phone, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

/**
 * Validate Twilio webhook signature (HMAC-SHA1).
 * https://www.twilio.com/docs/usage/webhooks/webhooks-security
 */
async function validateTwilioSignature(
  authToken: string,
  url: string,
  params: URLSearchParams,
  signature: string,
): Promise<boolean> {
  if (!signature) return false;

  const sortedStr = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}${v}`)
    .join("");

  const data = url + sortedStr;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(authToken),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );

  const sigBytes = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data),
  );
  const expected = btoa(String.fromCharCode(...new Uint8Array(sigBytes)));

  // Constant-time comparison to prevent timing attacks
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/\.{2,}/g, "_")
    .slice(0, 100);
}

async function sendWhatsAppReply(
  twilioAccountSid: string,
  twilioAuthToken: string,
  twilioFrom: string,
  to: string, // whatsapp:+XXXXXXXXXXX
  bodyOrTemplate:
    | { body: string }
    | { contentSid: string; contentVariables?: Record<string, string> },
): Promise<void> {
  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
  const credentials = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

  const formBody = new URLSearchParams();
  formBody.set("From", twilioFrom);
  formBody.set("To", to);

  if ("contentSid" in bodyOrTemplate) {
    formBody.set("ContentSid", bodyOrTemplate.contentSid);
    if (bodyOrTemplate.contentVariables) {
      formBody.set(
        "ContentVariables",
        JSON.stringify(bodyOrTemplate.contentVariables),
      );
    }
  } else {
    formBody.set("Body", bodyOrTemplate.body);
  }

  const res = await fetch(twilioUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formBody.toString(),
  });
  if (!res.ok) {
    console.error("Twilio reply error:", res.status, await res.text());
  }
}

serve(async (req: Request) => {
  // Twilio sends POST with application/x-www-form-urlencoded
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  // Always respond 204 — Twilio retries on non-2xx. Avoid returning TwiML <Response/> which causes Twilio WhatsApp to auto-send "OK"
  try {
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN")!;
    const twilioFrom = Deno.env.get("TWILIO_WHATSAPP_FROM")!; // whatsapp:+5218126251579

    // Read body first (needed for signature validation)
    const formText = await req.text();
    const params = new URLSearchParams(formText);

    // ── Twilio signature validation ─────────────────────────────────────────
    const twilioSig = req.headers.get("x-twilio-signature") ?? "";
    // Reconstruct the public webhook URL (strip query string — Twilio POST has none)
    const reqUrl = new URL(req.url);
    const webhookUrl = `${reqUrl.protocol}//${reqUrl.host}${reqUrl.pathname}`;

    console.log("webhookUrl:", webhookUrl, "hasSig:", !!twilioSig);

    const skipSigCheck = Deno.env.get("TWILIO_SKIP_SIG_CHECK") === "1";
    const sigValid = skipSigCheck || await validateTwilioSignature(
      twilioAuthToken,
      webhookUrl,
      params,
      twilioSig,
    );

    console.log("sigValid:", sigValid, "skipSigCheck:", skipSigCheck);

    if (!sigValid) {
      console.warn("Invalid Twilio signature — rejecting request");
      // Return 200 to avoid Twilio retry loops, but don't process
      return new Response(null, { status: 204 });
    }

    const fromRaw = params.get("From") ?? ""; // whatsapp:+521XXXXXXXXXX
    const numMedia = parseInt(params.get("NumMedia") ?? "0", 10);

    console.log("fromRaw:", fromRaw, "numMedia:", numMedia);

    // Only process media (document or image) — skip plain text messages
    if (numMedia === 0) {
      console.log("numMedia=0, skipping");
      return new Response(null, { status: 204 });
    }

    const mediaUrl = params.get("MediaUrl0") ?? "";
    const mimeType = params.get("MediaContentType0") ?? "";

    console.log("mediaUrl:", mediaUrl ? "present" : "missing", "mimeType:", mimeType);

    if (!mediaUrl || !fromRaw) {
      console.warn("Missing mediaUrl or fromRaw — skipping");
      return new Response(null, { status: 204 });
    }

    // Validate MIME type against allowlist
    if (!ALLOWED_MIMES.has(mimeType)) {
      console.warn(`Rejected unsupported MIME type: ${mimeType}`);
      return new Response(null, { status: 204 });
    }

    // Strip "whatsapp:+" prefix → raw digits for DB lookups (e.g. 521XXXXXXXXXX)
    const senderPhone = fromRaw.replace(/^whatsapp:\+?/, "");

    // Rate limit per sender phone
    if (!checkRateLimit(senderPhone)) {
      console.warn(`Rate limit exceeded for phone: ${senderPhone}`);
      return new Response(null, { status: 204 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Download file from Twilio (Basic Auth required)
    const credentials = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
    const fileRes = await fetch(mediaUrl, {
      headers: { Authorization: `Basic ${credentials}` },
    });
    if (!fileRes.ok) {
      throw new Error(`Media download failed: ${fileRes.status}`);
    }

    // Enforce file size limit before buffering
    const contentLength = parseInt(fileRes.headers.get("content-length") ?? "0", 10);
    if (contentLength > MAX_FILE_BYTES) {
      console.warn(`File too large (Content-Length): ${contentLength}`);
      return new Response(null, { status: 204 });
    }

    const fileBuffer = await fileRes.arrayBuffer();

    console.log("File downloaded, byteLength:", fileBuffer.byteLength);

    // Double-check actual size after download
    if (fileBuffer.byteLength > MAX_FILE_BYTES) {
      console.warn(`File too large after download: ${fileBuffer.byteLength}`);
      return new Response(null, { status: 204 });
    }

    // Determine filename — prefer Content-Disposition from Twilio media response,
    // fall back to Body field (Twilio also puts original filename there for documents),
    // then fall back to a generated name.
    const timestamp = Date.now();
    const extMap: Record<string, string> = {
      "application/pdf": "pdf",
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };
    const ext = extMap[mimeType] ?? "bin";
    const type = mimeType.startsWith("image/") ? "image" : "document";

    // 1. Content-Disposition: attachment; filename="original.pdf"
    let filename: string | null = null;
    const contentDisposition = fileRes.headers.get("content-disposition") ?? "";
    const cdMatch = contentDisposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';\r\n]+)["']?/i);
    if (cdMatch?.[1]) {
      filename = sanitizeFilename(decodeURIComponent(cdMatch[1].trim()));
    }

    // 2. Body field (Twilio puts original filename here for document messages)
    if (!filename) {
      const bodyText = (params.get("Body") ?? "").trim();
      const looksLikeFilename = bodyText.length > 0 && bodyText.length <= 200 && /\.[a-zA-Z0-9]{2,5}$/.test(bodyText);
      if (looksLikeFilename) filename = sanitizeFilename(bodyText);
    }

    // 3. Fallback: generated name
    if (!filename) filename = sanitizeFilename(`whatsapp_${type}_${timestamp}.${ext}`);

    // Build phone variants for DB lookups
    // MX numbers: Twilio may send 521XXXXXXXXXX (with mobile 1) or 52XXXXXXXXXX
    // Profiles may store with or without leading +
    const phoneVariants = [senderPhone];
    if (senderPhone.startsWith("521") && senderPhone.length === 13) {
      phoneVariants.push("52" + senderPhone.slice(3)); // strip mobile 1
    } else if (
      senderPhone.startsWith("52") &&
      !senderPhone.startsWith("521") &&
      senderPhone.length === 12
    ) {
      phoneVariants.push("521" + senderPhone.slice(2)); // add mobile 1
    }
    if (senderPhone.startsWith("52")) {
      phoneVariants.push(senderPhone.slice(2)); // no country code
    }
    // Also include + prefix variants (some profiles store phone as +52XXXXXXXXXX)
    const withPlus = phoneVariants.map((p) => `+${p}`);
    phoneVariants.push(...withPlus);

    // Look up patient by phone
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, onboarding_completed")
      .in("phone", phoneVariants)
      .eq("role", "patient")
      .limit(1)
      .single();

    console.log("Profile lookup:", profile ? `found id=${profile.id}` : "not found");

    // Helper: atomically claim the reply slot for this phone+minute window.
    // Uses INSERT with PRIMARY KEY conflict — only the first invocation succeeds.
    const shouldSendReply = async (): Promise<boolean> => {
      try {
        const windowStart = new Date(Math.floor(Date.now() / 60_000) * 60_000).toISOString();
        const { error } = await supabase
          .from("whatsapp_reply_dedup")
          .insert({ phone: senderPhone, window_start: windowStart });
        // No error = insert succeeded = we are first → send reply
        // Duplicate key error = another invocation already claimed it → skip
        return !error;
      } catch {
        return true;
      }
    };

    // Helper: fetch patient public key for encryption (null if not found)
    const getPatientPublicKey = async (patientId: string): Promise<CryptoKey | null> => {
      try {
        const { data } = await supabase
          .from("user_crypto_keys")
          .select("public_key_spki")
          .eq("user_id", patientId)
          .maybeSingle();
        if (!data?.public_key_spki) return null;
        return await importPublicKey(data.public_key_spki);
      } catch (err) {
        console.warn("getPatientPublicKey failed:", (err as Error).message);
        return null;
      }
    };

    // Helper: upload to storage + insert document record
    // If patientPublicKey is provided, file is AES-256-GCM encrypted before upload.
    const saveFile = async (
      patientId: string,
      uploadedBy: string | null,
      notes: string,
      patientPublicKey: CryptoKey | null = null,
    ): Promise<string> => {
      const documentId = crypto.randomUUID();

      let uploadBuffer: ArrayBuffer = fileBuffer;
      let uploadMime = mimeType;
      let storageFilename = filename;
      let isEncrypted = false;
      let docIv: string | null = null;
      let wrappedKey: string | null = null;

      if (patientPublicKey) {
        try {
          const docKey = await generateDocumentKey();
          const { encryptedData, docIv: iv } = await encryptBuffer(fileBuffer, docKey);
          wrappedKey = await wrapDocumentKey(docKey, patientPublicKey);
          uploadBuffer = encryptedData;
          docIv = iv;
          uploadMime = mimeType; // keep original MIME — bucket allowlist requires it
          storageFilename = `${documentId}.bin`;
          isEncrypted = true;
        } catch (encErr) {
          console.warn("Encryption failed, falling back to plain upload:", (encErr as Error).message);
        }
      }

      const storagePath = `${patientId}/${documentId}/${storageFilename}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(storagePath, uploadBuffer, { contentType: uploadMime, upsert: false });
      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      const { error: docError } = await supabase.from("documents").insert({
        id: documentId,
        owner_id: patientId,
        patient_id: patientId,
        uploaded_by: uploadedBy,
        title: filename,
        category: "other",
        mime_type: mimeType,
        notes,
        is_encrypted: isEncrypted,
      });
      if (docError) throw new Error(`documents insert failed: ${docError.message}`);

      // Store wrapped document key if encrypted
      if (isEncrypted && wrappedKey && docIv) {
        const { error: keyError } = await supabase.from("document_keys").insert({
          document_id: documentId,
          user_id: patientId,
          wrapped_key: wrappedKey,
          doc_iv: docIv,
        });
        if (keyError) console.warn("document_keys insert failed:", keyError.message);
      }

      const { error: archivoError } = await supabase
        .from("archivos_recibidos")
        .insert({
          telefono: senderPhone,
          nombre_archivo: filename,
          storage_path: storagePath,
          tipo: type,
          mime_type: mimeType,
          recibido_en: new Date().toISOString(),
        });
      if (archivoError) console.warn(`archivos_recibidos insert: ${archivoError.message}`);

      return documentId;
    };

    // ── PRIORITY: Check whatsapp_sessions (document request reply) ───────────
    const sessionPhoneVariants = [...new Set([senderPhone, ...phoneVariants])];
    // Also include the whatsapp:+ prefixed variants — doctor's form may have stored them
    sessionPhoneVariants.push(...sessionPhoneVariants.map((p) => `+${p}`));

    const { data: session } = await supabase
      .from("whatsapp_sessions")
      .select("id, document_request_id, doctor_id")
      .in("patient_phone", sessionPhoneVariants)
      .eq("status", "waiting")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    console.log(
      "whatsapp_session lookup:",
      session ? `found session=${session.id}` : "not found",
    );

    if (session?.document_request_id) {
      // ── SCENARIO 0: Reply linked to a document request ───────────────────
      console.log("Scenario 0: linked to document_request", session.document_request_id);

      const { data: docReq } = await supabase
        .from("document_requests")
        .select("id, patient_email, patient_phone, document_type")
        .eq("id", session.document_request_id)
        .single();

      if (!docReq) throw new Error(`document_request not found: ${session.document_request_id}`);

      let patientId: string | null = null;

      // Try 1: auth.users lookup by email
      if (docReq.patient_email) {
        const { data: authUid } = await supabase.rpc("auth_user_id_by_email", {
          search_email: docReq.patient_email,
        });
        if (authUid) {
          patientId = authUid as string;
          console.log("Patient resolved via email:", patientId);
        }
      }

      // Try 2: profile lookup by phone
      if (!patientId) {
        const phoneCandidates = [
          ...new Set([senderPhone, docReq.patient_phone].filter(Boolean) as string[]),
        ];
        const phoneVariantsForLookup: string[] = [];
        for (const ph of phoneCandidates) {
          const stripped = ph.replace(/^\+/, "");
          phoneVariantsForLookup.push(stripped);
          phoneVariantsForLookup.push(`+${stripped}`);
          if (stripped.startsWith("521") && stripped.length === 13) {
            phoneVariantsForLookup.push("52" + stripped.slice(3));
            phoneVariantsForLookup.push("+52" + stripped.slice(3));
          } else if (stripped.startsWith("52") && !stripped.startsWith("521") && stripped.length === 12) {
            phoneVariantsForLookup.push("521" + stripped.slice(2));
            phoneVariantsForLookup.push("+521" + stripped.slice(2));
          }
          if (stripped.startsWith("52")) {
            phoneVariantsForLookup.push(stripped.slice(2));
          }
        }
        const { data: phoneProfile } = await supabase
          .from("profiles")
          .select("id")
          .in("phone", [...new Set(phoneVariantsForLookup)])
          .eq("role", "patient")
          .limit(1)
          .maybeSingle();
        if (phoneProfile) {
          patientId = phoneProfile.id;
          console.log("Patient resolved via phone:", patientId);
        }
      }

      // Auto-register: patient replied via WhatsApp but has no account
      if (!patientId) {
        console.log("Scenario 0 - no account, auto pre-registering patient");
        let newUserId: string | null = null;

        if (docReq.patient_email) {
          const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
            email: docReq.patient_email,
            email_confirm: true,
          });
          if (!createErr && newUser?.user) {
            newUserId = newUser.user.id;
          } else {
            console.warn("createUser(email) error:", createErr?.message);
            const { data: retryUid } = await supabase.rpc("auth_user_id_by_email", {
              search_email: docReq.patient_email,
            });
            if (retryUid) newUserId = retryUid as string;
          }
        }

        if (!newUserId) {
          const { data: newUser, error: phoneErr } = await supabase.auth.admin.createUser({
            phone: senderPhone,
            phone_confirm: true,
          });
          if (!phoneErr && newUser?.user) {
            newUserId = newUser.user.id;
          } else {
            console.warn("createUser(phone) error:", phoneErr?.message);
          }
        }

        if (!newUserId) {
          throw new Error(
            `Cannot pre-register patient for request ${session.document_request_id} ` +
              `(email="${docReq.patient_email}", phone="${docReq.patient_phone}")`,
          );
        }

        await supabase.from("profiles").upsert(
          {
            id: newUserId,
            role: "patient",
            phone: senderPhone,
            onboarding_completed: false,
            onboarding_step: "whatsapp_preregistro",
          },
          { onConflict: "id" },
        );
        await supabase
          .from("patient_profiles")
          .upsert({ patient_id: newUserId }, { onConflict: "patient_id" });

        patientId = newUserId;
        console.log("Auto pre-registered patient:", patientId);
      }

      // Use patient's own key if available, otherwise fall back to doctor's key
      // so the document is encrypted at rest even for pre-registered patients.
      const patientPubKey0 = await getPatientPublicKey(patientId);
      const encryptionKey0 = patientPubKey0 ??
        (session.doctor_id ? await getPatientPublicKey(session.doctor_id) : null);
      const documentId = await saveFile(
        patientId,
        patientId,
        `Solicitado por doctor vía WhatsApp — ${docReq.document_type}`,
        encryptionKey0,
      );

      if (session.doctor_id) {
        await supabase.from("doctor_patient_consent").upsert(
          {
            doctor_id: session.doctor_id,
            patient_id: patientId,
            status: "accepted",
            share_basic_profile: true,
            share_documents: true,
          },
          { onConflict: "doctor_id,patient_id" },
        );
      }

      await supabase
        .from("document_requests")
        .update({
          status: "fulfilled",
          patient_id: patientId,
          document_id: documentId,
          fulfilled_at: new Date().toISOString(),
        })
        .eq("id", session.document_request_id)
        .eq("status", "pending");

      await supabase
        .from("whatsapp_sessions")
        .update({ status: "fulfilled" })
        .eq("id", session.id);

      if (await shouldSendReply()) {
        await sendWhatsAppReply(
          twilioAccountSid,
          twilioAuthToken,
          twilioFrom,
          fromRaw,
          { body: "✅ Documento recibido. Tu médico podrá verlo en HealthPal." },
        );
      }
      return new Response(null, { status: 204 });
    }

    if (profile) {
      // ── SCENARIO 1: Patient matched by phone ─────────────────────────────
      console.log("Scenario 1: existing patient matched by phone");
      const patientPubKey1 = await getPatientPublicKey(profile.id);
      const isFirstInBatch1 = await shouldSendReply();
      await saveFile(profile.id, null, "Recibido por WhatsApp", patientPubKey1);
      if (isFirstInBatch1) {
        // Wait 3s for sibling webhooks (same batch) to finish inserting
        await new Promise((r) => setTimeout(r, 3000));
        const since = new Date(Date.now() - 65_000).toISOString();
        const { count: batchCount } = await supabase
          .from("archivos_recibidos")
          .select("id", { count: "exact", head: true })
          .eq("telefono", senderPhone)
          .gte("recibido_en", since);
        const n = batchCount ?? 1;
        const replyBody = n > 1
          ? `✅ ${n} documentos recibidos y subidos a tu cuenta.`
          : "✅ Documento recibido y subido a tu cuenta.";
        await sendWhatsAppReply(twilioAccountSid, twilioAuthToken, twilioFrom, fromRaw, { body: replyBody });
      }
    } else {
      // Phone not in profiles — check auth.users
      let resolvedUserId: string | null = null;
      const { data: listData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      const existingAuthUser = listData?.users?.find((u) =>
        phoneVariants.includes(u.phone ?? ""),
      );

      if (existingAuthUser) {
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", existingAuthUser.id)
          .single();

        if (existingProfile) {
          // ── SCENARIO 2: Has account, phone not linked ───────────────────
          console.log("Scenario 2: auth user exists, phone not linked:", existingAuthUser.id);
          const patientPubKey2 = await getPatientPublicKey(existingAuthUser.id);
          await saveFile(
            existingAuthUser.id,
            null,
            "Recibido por WhatsApp - Teléfono no vinculado",
            patientPubKey2,
          );
          if (await shouldSendReply()) {
            await sendWhatsAppReply(
              twilioAccountSid,
              twilioAuthToken,
              twilioFrom,
              fromRaw,
              { body: `Recibimos tu documento 📎 Para vincularlo a tu expediente de HealthPal, ingresa a tu cuenta y agrega este número de WhatsApp en tu perfil: healthpal.mx/perfil` },
            );
          }
          return new Response(null, { status: 204 });
        }
        resolvedUserId = existingAuthUser.id;
      }

      // ── SCENARIO 3: No account → pre-register ──────────────────────────
      console.log("Scenario 3: new pre-registration");
      if (!resolvedUserId) {
        const { data: newUser, error: createUserError } =
          await supabase.auth.admin.createUser({
            phone: senderPhone,
            email_confirm: true,
            phone_confirm: true,
          });
        if (createUserError || !newUser?.user) {
          throw new Error(`createUser failed: ${createUserError?.message}`);
        }
        resolvedUserId = newUser.user.id;
        console.log("New auth user created:", resolvedUserId);
      }

      const newUserId = resolvedUserId;

      await supabase.from("profiles").upsert(
        {
          id: newUserId,
          role: "patient",
          phone: senderPhone,
          onboarding_completed: false,
          onboarding_step: "whatsapp_preregistro",
        },
        { onConflict: "id" },
      );
      await supabase
        .from("patient_profiles")
        .upsert({ patient_id: newUserId }, { onConflict: "patient_id" });

      const isFirstInBatch3 = await shouldSendReply();
      await saveFile(newUserId, null, "Recibido por WhatsApp - Pre-registro");
      if (isFirstInBatch3) {
        await new Promise((r) => setTimeout(r, 3000));
        const since3 = new Date(Date.now() - 65_000).toISOString();
        const { count: batchCount3 } = await supabase
          .from("archivos_recibidos")
          .select("id", { count: "exact", head: true })
          .eq("telefono", senderPhone)
          .gte("recibido_en", since3);
        const n3 = batchCount3 ?? 1;
        const replyBody3 = n3 > 1
          ? `✅ ${n3} documentos recibidos. Para acceder a ellos, crea tu cuenta en healthpal.mx con este número de teléfono.`
          : "✅ Documento recibido. Para acceder a él, crea tu cuenta en healthpal.mx con este número de teléfono.";
        await sendWhatsAppReply(twilioAccountSid, twilioAuthToken, twilioFrom, fromRaw, { body: replyBody3 });
      }
    }
  } catch (err) {
    const error = err as Error;
    console.error("Error:", error.message, error.stack);
    // Still return 200 so Twilio does not retry
  }

  return new Response(null, { status: 204 });
});
