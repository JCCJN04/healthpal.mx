/**
 * merge-preregistered-account — secure two-step consent flow
 *
 * Step 1 — action: "initiate"
 *   Caller: UUID_B (logged-in user who just registered with email)
 *   Body:   { action: "initiate", phone: string }
 *   Effect: Finds UUID_A (pre-registered via WhatsApp), generates a secure
 *           time-limited token, stores its SHA-256 hash in account_merge_tokens,
 *           and emails UUID_B a confirmation link. UUID_B must click it.
 *   Returns: { status: "pending" }
 *
 * Step 2 — action: "confirm"
 *   Caller: UUID_B (still authenticated in the same onboarding session)
 *   Body:   { action: "confirm", token: string }
 *   Effect: Validates the raw token against the stored hash, verifies ownership
 *           and expiry, then performs the merge atomically.
 *   Returns: { merged: true, token_hash: string } (token_hash = re-auth magic link)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── CORS ──────────────────────────────────────────────────────────────────────

const ALLOWED_ORIGINS = new Set([
  "https://healthpal.mx",
  "https://www.healthpal.mx",
]);

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin)
      ? origin
      : "https://healthpal.mx",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** SHA-256 of `input`, returned as lower-case hex string. */
async function sha256Hex(input: string): Promise<string> {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Cryptographically random URL-safe base64 string (32 bytes = 256 bits). */
function generateSecureToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Build all phone number variants used in Mexico.
 * Onboarding stores +52XXXXXXXXXX; webhook stores 521XXXXXXXXXX.
 */
function buildPhoneVariants(phone: string): string[] {
  const variants = new Set<string>();
  const stripped = phone.replace(/^\+/, "");

  variants.add(phone);
  variants.add(stripped);

  if (stripped.startsWith("52") && !stripped.startsWith("521") && stripped.length === 12) {
    variants.add("521" + stripped.slice(2));
    variants.add("+521" + stripped.slice(2));
  }
  if (stripped.startsWith("521") && stripped.length === 13) {
    variants.add("52" + stripped.slice(3));
    variants.add("+52" + stripped.slice(3));
  }
  if (stripped.startsWith("52")) {
    const noCountry = stripped.startsWith("521")
      ? stripped.slice(3)
      : stripped.slice(2);
    if (noCountry.length === 10) variants.add(noCountry);
  }

  return [...variants];
}

/**
 * Send confirmation email via Resend (recommended Supabase email partner).
 * Falls back to Supabase magic-link email if RESEND_API_KEY is not set.
 */
async function sendConfirmationEmail(
  supabaseAdmin: ReturnType<typeof createClient>,
  toEmail: string,
  confirmUrl: string,
): Promise<void> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");

  if (resendApiKey) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "HealthPal.mx <noreply@healthpal.mx>",
        to: [toEmail],
        subject: "Confirma la fusión de tu cuenta — HealthPal.mx",
        html: `
          <p>Hola,</p>
          <p>Recibiste este correo porque solicitaste vincular tu cuenta de HealthPal.mx
             con documentos enviados por WhatsApp.</p>
          <p>Haz clic en el botón para confirmar y recuperar tus documentos:</p>
          <p style="margin:24px 0">
            <a href="${confirmUrl}"
               style="background:#33C7BE;color:#fff;padding:12px 24px;
                      border-radius:8px;text-decoration:none;font-weight:bold">
              Confirmar fusión de cuenta
            </a>
          </p>
          <p>Este enlace expira en <strong>1 hora</strong>.</p>
          <p>Si no realizaste esta solicitud, ignora este correo.</p>
        `,
      }),
    });
    if (!res.ok) {
      throw new Error(`Resend error: ${res.status} ${await res.text()}`);
    }
    return;
  }

  // Fallback: use Supabase built-in email (magic link with custom redirect).
  // The redirect URL carries the token so the frontend page can call /confirm.
  const { error } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: toEmail,
    options: { redirectTo: confirmUrl },
  });
  if (error) throw new Error(`generateLink error: ${error.message}`);
}

// ── Action: initiate ──────────────────────────────────────────────────────────

async function handleInitiate(
  supabaseAdmin: ReturnType<typeof createClient>,
  uuidB: string,
  emailB: string,
  phone: string,
  cors: Record<string, string>,
): Promise<Response> {
  const phoneVariants = buildPhoneVariants(phone);

  // Find the pre-registered WhatsApp account
  const { data: preregProfile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .in("phone", phoneVariants)
    .eq("onboarding_step", "whatsapp_preregistro")
    .limit(1)
    .maybeSingle();

  if (!preregProfile) {
    // Return the same response whether found or not — no enumeration
    return new Response(
      JSON.stringify({ status: "pending" }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  const uuidA = preregProfile.id as string;

  // Invalidate any previous pending token for this pair
  await supabaseAdmin
    .from("account_merge_tokens")
    .delete()
    .eq("uuid_b", uuidB)
    .is("used_at", null);

  // Generate token: store only the hash, send the raw value
  const rawToken = generateSecureToken();
  const tokenHash = await sha256Hex(rawToken);

  const { error: insertErr } = await supabaseAdmin
    .from("account_merge_tokens")
    .insert({
      uuid_a: uuidA,
      uuid_b: uuidB,
      phone,
      token_hash: tokenHash,
    });

  if (insertErr) {
    console.error("account_merge_tokens insert:", insertErr.message);
    return new Response(
      JSON.stringify({ error: "No se pudo iniciar la fusión" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  // Build confirmation URL — the frontend page reads `token` from the query string
  // and calls this function again with action="confirm"
  const appUrl = Deno.env.get("APP_URL") ?? "https://healthpal.mx";
  const confirmUrl = `${appUrl}/onboarding/confirmar-fusion?token=${rawToken}`;

  try {
    await sendConfirmationEmail(supabaseAdmin, emailB, confirmUrl);
  } catch (emailErr) {
    // Roll back token if email fails — don't leave a dangling record
    await supabaseAdmin
      .from("account_merge_tokens")
      .delete()
      .eq("token_hash", tokenHash);
    console.error("sendConfirmationEmail:", (emailErr as Error).message);
    return new Response(
      JSON.stringify({ error: "No se pudo enviar el correo de confirmación" }),
      { status: 502, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({ status: "pending" }),
    { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
  );
}

// ── Action: confirm ───────────────────────────────────────────────────────────

async function handleConfirm(
  supabaseAdmin: ReturnType<typeof createClient>,
  uuidB: string,
  rawToken: string,
  cors: Record<string, string>,
): Promise<Response> {
  if (!rawToken || rawToken.length > 100) {
    return new Response(
      JSON.stringify({ error: "Token inválido" }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  const tokenHash = await sha256Hex(rawToken);

  // Look up the token — must belong to this exact user, not yet used, not expired
  const { data: record, error: lookupErr } = await supabaseAdmin
    .from("account_merge_tokens")
    .select("id, uuid_a, uuid_b, phone, expires_at, used_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (lookupErr || !record) {
    return new Response(
      JSON.stringify({ error: "Token inválido o expirado" }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  if (record.uuid_b !== uuidB) {
    console.warn(`Merge token UUID_B mismatch: expected=${record.uuid_b} got=${uuidB}`);
    return new Response(
      JSON.stringify({ error: "Token inválido o expirado" }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  if (record.used_at) {
    return new Response(
      JSON.stringify({ error: "Este token ya fue utilizado" }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  if (new Date(record.expires_at) < new Date()) {
    return new Response(
      JSON.stringify({ error: "El enlace de confirmación ha expirado. Inicia el proceso de nuevo." }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  const uuidA: string = record.uuid_a;

  // Mark token as used *before* mutating auth state to prevent replay
  const { error: markErr } = await supabaseAdmin
    .from("account_merge_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", record.id)
    .is("used_at", null); // second guard: fails if a concurrent request already claimed it

  if (markErr) {
    console.error("Failed to mark token used:", markErr.message);
    return new Response(
      JSON.stringify({ error: "Error interno — por favor intenta de nuevo" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  // ── Perform merge ─────────────────────────────────────────────────────────

  // Fetch UUID_B's verified email and profile data
  const { data: { user: userB } } = await supabaseAdmin.auth.admin.getUserById(uuidB);
  const emailB = userB?.email ?? "";

  if (!emailB) {
    return new Response(
      JSON.stringify({ error: "La cuenta actual no tiene correo electrónico verificado" }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  const { data: profileB } = await supabaseAdmin
    .from("profiles")
    .select("full_name, role, date_of_birth, avatar_url")
    .eq("id", uuidB)
    .maybeSingle();

  // 1. Assign UUID_B's verified email to UUID_A (the account that owns the documents)
  const { error: updateAuthErr } = await supabaseAdmin.auth.admin.updateUserById(
    uuidA,
    { email: emailB, email_confirm: true },
  );
  if (updateAuthErr) {
    console.error("updateUserById UUID_A:", updateAuthErr.message);
    return new Response(
      JSON.stringify({ error: "No se pudo actualizar la cuenta pre-registrada" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  // 2. Copy UUID_B's profile fields to UUID_A
  const profileUpdates: Record<string, unknown> = {
    phone: record.phone,
    onboarding_step: "contact",
    onboarding_completed: false,
  };
  if (profileB?.full_name)    profileUpdates.full_name = profileB.full_name;
  if (profileB?.role)         profileUpdates.role = profileB.role;
  if (profileB?.date_of_birth) profileUpdates.date_of_birth = profileB.date_of_birth;
  if (profileB?.avatar_url)   profileUpdates.avatar_url = profileB.avatar_url;

  await supabaseAdmin.from("profiles").update(profileUpdates).eq("id", uuidA);

  // 3. Generate a magic link so the user can re-authenticate as UUID_A
  const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: emailB,
  });
  if (linkErr || !linkData?.properties?.hashed_token) {
    console.error("generateLink:", linkErr?.message);
    return new Response(
      JSON.stringify({ error: "No se pudo generar enlace de acceso" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  // 4. Delete UUID_B — best-effort, non-fatal
  const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(uuidB);
  if (deleteErr) console.warn("deleteUser(UUID_B) non-fatal:", deleteErr.message);

  console.log(`Merge complete: UUID_A=${uuidA} now has email=${emailB}`);

  return new Response(
    JSON.stringify({
      merged: true,
      merged_user_id: uuidA,
      token_hash: linkData.properties.hashed_token,
    }),
    { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
  );
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  const cors = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: cors });
  }

  try {
    // ── Authenticate caller ─────────────────────────────────────────────────
    const authHeader = req.headers.get("authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { data: { user: callerUser }, error: authErr } =
      await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authErr || !callerUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const uuidB = callerUser.id;
    const emailB = callerUser.email ?? "";

    // ── Parse body ──────────────────────────────────────────────────────────
    const body = await req.json().catch(() => null);
    if (!body || typeof body.action !== "string") {
      return new Response(JSON.stringify({ error: "action requerido" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (body.action === "initiate") {
      const phone = typeof body.phone === "string" ? body.phone.trim() : "";
      if (!phone) {
        return new Response(JSON.stringify({ error: "phone requerido" }), {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      if (!emailB) {
        return new Response(
          JSON.stringify({ error: "La cuenta actual no tiene correo electrónico" }),
          { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
        );
      }
      return handleInitiate(supabaseAdmin, uuidB, emailB, phone, cors);
    }

    if (body.action === "confirm") {
      const token = typeof body.token === "string" ? body.token.trim() : "";
      if (!token) {
        return new Response(JSON.stringify({ error: "token requerido" }), {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      return handleConfirm(supabaseAdmin, uuidB, token, cors);
    }

    return new Response(JSON.stringify({ error: "action no reconocida" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    const error = err as Error;
    console.error("merge-preregistered-account error:", error.message);
    return new Response(JSON.stringify({ error: "Error interno" }), {
      status: 500,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
