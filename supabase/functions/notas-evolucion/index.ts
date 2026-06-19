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
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
}

function toHex(bytes: Uint8Array): string {
  return "\\x" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array {
  const h = hex.startsWith("\\x") ? hex.slice(2) : hex.replace(/^0x/, "");
  const bytes = new Uint8Array(h.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

async function buildAesKey(keyB64: string): Promise<CryptoKey> {
  const keyBytes = Uint8Array.from(atob(keyB64), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

async function encryptField(text: string | null | undefined, key: CryptoKey) {
  if (!text?.trim()) return null;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const buf = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(text));
  return { enc: toHex(new Uint8Array(buf)), nonce: toHex(iv) };
}

async function decryptField(enc: string | null, nonce: string | null, key: CryptoKey): Promise<string> {
  if (!enc || !nonce) return "";
  try {
    const buf = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromHex(nonce) }, key, fromHex(enc));
    return new TextDecoder().decode(buf);
  } catch { return "[Cifrado — clave incorrecta]"; }
}

function getUserId(authHeader: string): string {
  const payload = JSON.parse(atob(authHeader.replace(/^Bearer\s+/, "").split(".")[1]));
  if (!payload.sub) throw new Error("no sub");
  return payload.sub;
}

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const encKeyB64 = Deno.env.get("SENSITIVE_DATA_ENC_KEY_B64");
    const keyId = Deno.env.get("SENSITIVE_DATA_KEY_ID") || "local-dev-k1";
    const keyVer = parseInt(Deno.env.get("SENSITIVE_DATA_KEY_VER") || "1");

    if (!encKeyB64) return new Response(JSON.stringify({ error: "Clave de cifrado no configurada" }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "No autorizado" }), {
      status: 401, headers: { ...cors, "Content-Type": "application/json" },
    });

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const aesKey = await buildAesKey(encKeyB64);

    const url = new URL(req.url);
    const isAddenda = url.pathname.split("/").filter(Boolean).at(-1) === "addenda";

    // ── POST /notas-evolucion/addenda ────────────────────────────────────────
    if (req.method === "POST" && isAddenda) {
      let userId: string;
      try { userId = getUserId(authHeader); } catch {
        return new Response(JSON.stringify({ error: "No autorizado" }), {
          status: 401, headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      const { nota_id, contenido } = await req.json();
      if (!nota_id || !contenido?.trim()) return new Response(
        JSON.stringify({ error: "nota_id y contenido son requeridos" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
      );
      const { data, error } = await supabase
        .from("notas_evolucion_addenda")
        .insert({ nota_id, doctor_id: userId, contenido: contenido.trim() })
        .select().single();
      if (error) return new Response(JSON.stringify({ error: error.message }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
      return new Response(JSON.stringify(data), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    // ── GET ──────────────────────────────────────────────────────────────────
    if (req.method === "GET") {
      const appointmentId = url.searchParams.get("appointment_id");
      const patientId = url.searchParams.get("patient_id");

      if (!appointmentId && !patientId) return new Response(
        JSON.stringify({ error: "appointment_id o patient_id requerido" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
      );

      let query = supabase
        .from("notas_evolucion")
        .select("*, notas_evolucion_addenda(*), notas_evolucion_diagnosticos(*)")
        .order("fecha_hora", { ascending: false });

      if (appointmentId) query = query.eq("appointment_id", appointmentId);
      else if (patientId) query = query.eq("patient_id", patientId);

      const { data, error } = await query;
      if (error) return new Response(JSON.stringify({ error: error.message }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const decrypted = await Promise.all((data || []).map(async (nota: any) => ({
        ...nota,
        motivo_consulta:    await decryptField(nota.motivo_enc,      nota.motivo_nonce,      aesKey),
        exploracion_fisica: await decryptField(nota.exploracion_enc, nota.exploracion_nonce, aesKey),
        diagnostico:        await decryptField(nota.diagnostico_enc,  nota.diagnostico_nonce, aesKey),
        plan_terapeutico:   await decryptField(nota.plan_enc,         nota.plan_nonce,        aesKey),
        notas_evolucion_diagnosticos: (nota.notas_evolucion_diagnosticos || [])
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .sort((a: any, b: any) => a.orden - b.orden),
      })));

      const result = appointmentId ? (decrypted[0] ?? null) : decrypted;
      return new Response(JSON.stringify(result), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    // ── POST /notas-evolucion — upsert nota + replace diagnosticos ───────────
    if (req.method === "POST") {
      let userId: string;
      try { userId = getUserId(authHeader); } catch {
        return new Response(JSON.stringify({ error: "No autorizado" }), {
          status: 401, headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      const body = await req.json();
      const {
        appointment_id, patient_id,
        ta_sistolica, ta_diastolica,
        frecuencia_cardiaca, frecuencia_respiratoria,
        temperatura, peso_kg, talla_cm, saturacion_oxigeno,
        diagnosticos,
        motivo_consulta, exploracion_fisica, diagnostico, plan_terapeutico,
      } = body;

      if (!appointment_id || !patient_id) return new Response(
        JSON.stringify({ error: "appointment_id y patient_id son requeridos" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
      );

      const [mEnc, eEnc, dEnc, pEnc] = await Promise.all([
        encryptField(motivo_consulta, aesKey),
        encryptField(exploracion_fisica, aesKey),
        encryptField(diagnostico, aesKey),
        encryptField(plan_terapeutico, aesKey),
      ]);

      // Upsert nota principal
      const { data: notaData, error: notaError } = await supabase
        .from("notas_evolucion")
        .upsert({
          appointment_id, doctor_id: userId, patient_id,
          ta_sistolica: ta_sistolica || null, ta_diastolica: ta_diastolica || null,
          frecuencia_cardiaca: frecuencia_cardiaca || null,
          frecuencia_respiratoria: frecuencia_respiratoria || null,
          temperatura: temperatura || null, peso_kg: peso_kg || null,
          talla_cm: talla_cm || null, saturacion_oxigeno: saturacion_oxigeno || null,
          motivo_enc: mEnc?.enc || null, motivo_nonce: mEnc?.nonce || null,
          exploracion_enc: eEnc?.enc || null, exploracion_nonce: eEnc?.nonce || null,
          diagnostico_enc: dEnc?.enc || null, diagnostico_nonce: dEnc?.nonce || null,
          plan_enc: pEnc?.enc || null, plan_nonce: pEnc?.nonce || null,
          enc_kid: keyId, enc_ver: keyVer,
        }, { onConflict: "appointment_id" })
        .select().single();

      if (notaError) return new Response(JSON.stringify({ error: notaError.message }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });

      // Replace diagnosticos CIE-10 (delete + insert)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const diagRows: any[] = Array.isArray(diagnosticos) ? diagnosticos : [];
      if (diagRows.length > 0) {
        await supabase.from("notas_evolucion_diagnosticos").delete().eq("nota_id", notaData.id);
        const { error: diagError } = await supabase.from("notas_evolucion_diagnosticos").insert(
          diagRows
            .filter((d) => d.cie10_codigo?.trim())
            .map((d, i) => ({
              nota_id: notaData.id,
              orden: i + 1,
              tipo: i === 0 ? "principal" : "secundario",
              cie10_codigo: d.cie10_codigo.trim().toUpperCase(),
              cie10_descripcion: d.cie10_descripcion?.trim() || null,
            }))
        );
        if (diagError) return new Response(JSON.stringify({ error: diagError.message }), {
          status: 400, headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      // Fetch fresh to include diagnosticos
      const { data: fresh } = await supabase
        .from("notas_evolucion")
        .select("*, notas_evolucion_addenda(*), notas_evolucion_diagnosticos(*)")
        .eq("id", notaData.id)
        .single();

      return new Response(JSON.stringify({
        ...fresh,
        motivo_consulta, exploracion_fisica, diagnostico, plan_terapeutico,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        notas_evolucion_diagnosticos: ((fresh as any)?.notas_evolucion_diagnosticos || []).sort((a: any, b: any) => a.orden - b.orden),
      }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    return new Response("Method not allowed", { status: 405, headers: cors });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || "Error interno" }), {
      status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
