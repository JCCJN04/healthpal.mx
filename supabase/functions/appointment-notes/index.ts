import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const ALLOWED_ORIGINS = new Set([
  "https://healthpal.mx",
  "https://www.healthpal.mx",
  "http://localhost:3000",
  "http://localhost:5173",
]);

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin)
      ? origin
      : "https://healthpal.mx",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  };
}

function toHex(bytes: Uint8Array): string {
  return (
    "\\x" +
    Array.from(bytes)
      .map((b: number) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}

function fromHex(hex: string): Uint8Array {
  const h = (hex as string).startsWith("\\x")
    ? (hex as string).slice(2)
    : (hex as string).replace(/^0x/, "");
  const bytes = new Uint8Array(h.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

async function buildAesKey(keyB64: string): Promise<CryptoKey> {
  const keyBytes = Uint8Array.from(atob(keyB64), (c: string) =>
    c.charCodeAt(0)
  );
  return crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const encKeyB64 = Deno.env.get("SENSITIVE_DATA_ENC_KEY_B64");
    const keyId = Deno.env.get("SENSITIVE_DATA_KEY_ID") || "local-dev-k1";
    const keyVer = parseInt(Deno.env.get("SENSITIVE_DATA_KEY_VER") || "1");

    if (!encKeyB64) {
      return new Response(
        JSON.stringify({ error: "Clave de cifrado no configurada" }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const aesKey = await buildAesKey(encKeyB64);

    // ── POST: crear nota de consulta ─────────────────────────────────────
    if (req.method === "POST") {
      const { appointment_id, title, body } = await req.json();
      if (!appointment_id || !body?.trim()) {
        return new Response(
          JSON.stringify({ error: "appointment_id y body son requeridos" }),
          { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }

      // Extract user ID from the gateway-verified JWT (avoids extra getUser() network call)
      let userId: string;
      try {
        const payload = JSON.parse(atob(authHeader.replace(/^Bearer\s+/, "").split(".")[1]));
        userId = payload.sub;
        if (!userId) throw new Error("no sub");
      } catch {
        return new Response(JSON.stringify({ error: "No autorizado" }), {
          status: 401,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encoded = new TextEncoder().encode(body);
      const cipherBuffer = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        aesKey,
        encoded
      );
      const cipherBytes = new Uint8Array(cipherBuffer);

      const { data, error } = await supabase
        .from("appointment_notes")
        .insert({
          appointment_id,
          author_id: userId,
          title: title || null,
          note_enc: toHex(cipherBytes),
          note_nonce: toHex(iv),
          note_kid: keyId,
          note_ver: keyVer,
        })
        .select()
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ ...data, body }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ── GET: leer y descifrar notas de una cita ──────────────────────────
    if (req.method === "GET") {
      const url = new URL(req.url);
      const appointmentId = url.searchParams.get("appointment_id");
      const patientId = url.searchParams.get("patient_id");

      if (!appointmentId && !patientId) {
        return new Response(
          JSON.stringify({ error: "appointment_id o patient_id requerido" }),
          { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }

      let query = supabase
        .from("appointment_notes")
        .select(
          "*, appointments!inner(id, scheduled_at, duration_min, status, mode, patient_id, doctor_id)"
        )
        .order("created_at", { ascending: false });

      if (appointmentId) {
        query = query.eq("appointment_id", appointmentId);
      } else if (patientId) {
        query = query.eq("appointments.patient_id", patientId);
      }

      const { data, error } = await query;

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const decrypted = await Promise.all(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (data || []).map(async (note: any) => {
          if (!note.note_enc || !note.note_nonce) return { ...note, body: "" };
          try {
            const cipherBytes = fromHex(note.note_enc);
            const iv = fromHex(note.note_nonce);
            const plainBuffer = await crypto.subtle.decrypt(
              { name: "AES-GCM", iv },
              aesKey,
              cipherBytes
            );
            const body = new TextDecoder().decode(plainBuffer);
            return { ...note, body };
          } catch {
            return { ...note, body: "[Nota cifrada — clave incorrecta]" };
          }
        })
      );

      return new Response(JSON.stringify(decrypted), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ── DELETE: eliminar nota ────────────────────────────────────────────
    if (req.method === "DELETE") {
      const url = new URL(req.url);
      const noteId = url.searchParams.get("id");
      if (!noteId) {
        return new Response(JSON.stringify({ error: "id requerido" }), {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabase
        .from("appointment_notes")
        .delete()
        .eq("id", noteId);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response("Method not allowed", {
      status: 405,
      headers: cors,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Error interno" }),
      {
        status: 500,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      }
    );
  }
});
