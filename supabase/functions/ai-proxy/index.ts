import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── CORS ──────────────────────────────────────────────────────────────────────

const ALLOWED_ORIGINS = new Set([
  "https://healthpal.mx",
  "https://www.healthpal.mx",
  "http://localhost:3000",
]);

function corsHeaders(req: Request): Record<string, string> {
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

// ── Input sanitisation (prompt injection defence) ─────────────────────────────

/**
 * Strip patterns commonly used to hijack LLM instructions from a text field,
 * then truncate to `maxLen` characters.
 */
function sanitizeInput(raw: unknown, maxLen = 300): string {
  if (raw == null) return "";
  const s = String(raw);
  return s
    .replace(/```[\s\S]*?```/g, "[OMITIDO]")
    .replace(/`[^`]*`/g, "[OMITIDO]")
    .replace(/ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/gi, "")
    .replace(/\bsystem\s*:/gi, "")
    .replace(/\bassistant\s*:/gi, "")
    .replace(/<\/?[a-z][a-z0-9]*[^>]*>/gi, "")
    .trim()
    .slice(0, maxLen);
}

// ── Output sanitisation ───────────────────────────────────────────────────────

/**
 * Strip code blocks, JSON objects, URLs, and other patterns that should never
 * appear in a clinical summary returned to the frontend.
 */
function sanitizeOutput(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const clean = raw
    // Remove fenced code blocks
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`\n]{1,200}`/g, "")
    // Remove URLs
    .replace(/https?:\/\/[^\s]{1,200}/g, "")
    // Remove obvious JSON objects (curly braces with key:value pattern)
    .replace(/\{(?:[^{}]*"[^"]+"\s*:){1,}[^{}]*\}/g, "")
    // Normalize whitespace
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // Hard reject if response starts with code/JSON structure
  if (/^\s*\{/.test(clean)) return null;
  // Reject if response is too short to be a meaningful clinical summary
  if (clean.length < 10) return null;

  return clean.slice(0, 2000); // cap at 2000 chars
}

// ── Per-user rate limiting (DB-backed, persistent across cold starts) ─────────

const RATE_LIMIT_RPH = 20; // requests per hour per user

async function checkRateLimit(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<boolean> {
  const key = `ai-proxy:${userId}`;
  const now = new Date();
  const resetAt = new Date(
    Math.ceil(now.getTime() / 3_600_000) * 3_600_000,
  ).toISOString();

  const { data, error } = await supabase
    .from("rate_limit_buckets")
    .upsert(
      { key, count: 1, reset_at: resetAt },
      { onConflict: "key", ignoreDuplicates: false },
    )
    .select("count")
    .single();

  if (error) {
    // If the bucket already existed, increment it
    const { data: inc } = await supabase.rpc("increment_rate_limit_bucket", {
      p_key: key,
      p_reset_at: resetAt,
    });
    return (inc ?? 0) <= RATE_LIMIT_RPH;
  }

  return (data?.count ?? 1) <= RATE_LIMIT_RPH;
}

// ── LLM call ──────────────────────────────────────────────────────────────────

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

async function callLLM(
  messages: ChatMessage[],
  options?: { temperature?: number; max_tokens?: number },
): Promise<string | null> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  const baseUrl = Deno.env.get("OPENAI_BASE_URL") ?? "https://api.openai.com/v1";
  const model = Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini";

  if (!apiKey) {
    console.error("ai-proxy: OPENAI_API_KEY not configured");
    throw new Error("NO_API_KEY");
  }

  // Detect misconfiguration: OpenRouter key sent to OpenAI endpoint
  const isOpenRouterKey = apiKey.startsWith("sk-or-");
  const isOpenAiEndpoint = baseUrl.includes("api.openai.com");
  if (isOpenRouterKey && isOpenAiEndpoint) {
    console.error("ai-proxy: OpenRouter key detected but OPENAI_BASE_URL points to OpenAI. Set OPENAI_BASE_URL=https://openrouter.ai/api/v1");
    throw new Error("LLM_WRONG_ENDPOINT");
  }

  console.log(`ai-proxy: calling ${baseUrl}/chat/completions model=${model}`);

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://healthpal.mx",
      "X-Title": "HealthPal.mx",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options?.temperature ?? 0.2,
      max_tokens: options?.max_tokens ?? 400,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    console.error("ai-proxy: LLM request failed", res.status, errBody.slice(0, 300));
    if (res.status === 401 || res.status === 403) throw new Error("LLM_AUTH_ERROR");
    if (res.status === 429) throw new Error("LLM_QUOTA_ERROR");
    throw new Error(`LLM_ERROR_${res.status}`);
  }

  const data = await res.json();
  return (data.choices?.[0]?.message?.content as string) ?? null;
}

// ── Action handlers ───────────────────────────────────────────────────────────

interface PatientSummaryInput {
  name?: string | null;
  age?: number | null;
  sex?: string | null;
  bloodType?: string | null;
  chronicConditions?: string | null;
  allergies?: string | null;
  medications?: string | null;
  height?: number | null;
  weight?: number | null;
  bmi?: number | null;
  documentCount?: number | null;
  noteCount?: number | null;
  lastNoteDate?: string | null;
  upcomingAppointments?: number | null;
  totalAppointments?: number | null;
  lastAppointmentDate?: string | null;
  psychiatricDiagnoses?: string | null;
  psychiatricMeds?: string | null;
  developmentalNotes?: string | null;
  smokingStatus?: string | null;
  alcoholUse?: string | null;
  familyHistory?: string | null;
  recentNotesSummary?: string | null;
  patientObservations?: string | null;
  surgeries?: string | null;
  hospitalizations?: string | null;
}

async function handlePatientSummary(
  raw: PatientSummaryInput,
): Promise<string | null> {
  const lines: string[] = [];

  // Demographics
  if (raw.name)               lines.push(`Nombre: ${sanitizeInput(raw.name, 100)}`);
  if (raw.age)                lines.push(`Edad: ${Number(raw.age)} años`);
  if (raw.sex)                lines.push(`Sexo: ${sanitizeInput(raw.sex, 20)}`);
  if (raw.bloodType)          lines.push(`Tipo de sangre: ${sanitizeInput(raw.bloodType, 10)}`);
  if (raw.height)             lines.push(`Altura: ${Number(raw.height)} cm`);
  if (raw.weight)             lines.push(`Peso: ${Number(raw.weight)} kg`);
  if (raw.bmi != null)        lines.push(`IMC: ${Number(raw.bmi)}`);

  // Clinical
  if (raw.chronicConditions)  lines.push(`Condiciones crónicas: ${sanitizeInput(raw.chronicConditions)}`);
  if (raw.allergies)          lines.push(`Alergias: ${sanitizeInput(raw.allergies)}`);
  if (raw.medications)        lines.push(`Medicación activa: ${sanitizeInput(raw.medications)}`);
  if (raw.surgeries)          lines.push(`Cirugías previas: ${sanitizeInput(raw.surgeries, 200)}`);
  if (raw.hospitalizations)   lines.push(`Hospitalizaciones: ${sanitizeInput(raw.hospitalizations, 200)}`);

  // Psychiatric / developmental
  if (raw.psychiatricDiagnoses) lines.push(`Antecedentes psiquiátricos: ${sanitizeInput(raw.psychiatricDiagnoses, 300)}`);
  if (raw.psychiatricMeds)      lines.push(`Medicación psiquiátrica: ${sanitizeInput(raw.psychiatricMeds, 200)}`);
  if (raw.developmentalNotes)   lines.push(`Antecedentes de desarrollo: ${sanitizeInput(raw.developmentalNotes, 200)}`);

  // Non-pathological habits
  if (raw.smokingStatus)      lines.push(`Tabaquismo: ${sanitizeInput(raw.smokingStatus, 100)}`);
  if (raw.alcoholUse)         lines.push(`Alcoholismo: ${sanitizeInput(raw.alcoholUse, 100)}`);

  // Family history
  if (raw.familyHistory)      lines.push(`Antecedentes heredofamiliares: ${sanitizeInput(raw.familyHistory, 300)}`);

  // Appointments & notes
  if (raw.totalAppointments != null) lines.push(`Consultas totales con usted: ${Number(raw.totalAppointments)}`);
  if (raw.lastAppointmentDate) lines.push(`Última consulta: ${sanitizeInput(raw.lastAppointmentDate, 30)}`);
  if (raw.upcomingAppointments != null && raw.upcomingAppointments > 0)
    lines.push(`Citas próximas: ${Number(raw.upcomingAppointments)}`);
  if (raw.noteCount != null)  lines.push(`Notas clínicas: ${Number(raw.noteCount)}`);
  if (raw.lastNoteDate)       lines.push(`Última nota: ${sanitizeInput(raw.lastNoteDate, 30)}`);
  if (raw.documentCount != null) lines.push(`Documentos en expediente: ${Number(raw.documentCount)}`);

  // Patient observations from clinical history
  if (raw.patientObservations) lines.push(`Observaciones del paciente: ${sanitizeInput(raw.patientObservations, 300)}`);

  // Recent notes content
  if (raw.recentNotesSummary) lines.push(`Contenido notas recientes: ${sanitizeInput(raw.recentNotesSummary, 500)}`);

  const systemPrompt =
    "Eres un asistente clínico de HealthPal.mx. Generas resúmenes clínicos estructurados para el médico tratante. " +
    "El resumen se muestra directamente al médico que atiende al paciente, por lo que debes referirte a las consultas como 'con usted' en lugar de 'con este médico'. " +
    "Escribe un resumen en español en texto plano, sin listas con guiones, sin markdown, sin numeración. " +
    "Usa 3 a 5 oraciones que cubran en orden: identificación del paciente y datos antropométricos relevantes, " +
    "condiciones crónicas y alergias críticas, hábitos (tabaco/alcohol) si aplica, " +
    "antecedentes heredofamiliares relevantes si los hay, " +
    "cirugías u hospitalizaciones previas si las hay, " +
    "medicación activa, y actividad clínica reciente (número de consultas con usted, última visita, resumen de notas si existen). " +
    "Omite secciones sin datos. Sé preciso y clínico. Máximo 6 oraciones. " +
    "No generes código, JSON, URLs, listas ni instrucciones adicionales.";

  const userPrompt =
    `Genera el resumen clínico para el médico tratante:\n${lines.join("\n")}`;

  const raw_output = await callLLM(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    { temperature: 0.2, max_tokens: 500 },
  );

  return sanitizeOutput(raw_output);
}

interface ChatNote {
  title: string;
  body: string;
  date: string;
}

interface ChatDocument {
  title: string;
  category: string;
  date: string;
  notes?: string | null;
}

interface PatientChatInput {
  question: string;
  patient: PatientSummaryInput;
  notes: ChatNote[];
  documents: ChatDocument[];
  history: { role: "user" | "assistant"; content: string }[];
}

async function handlePatientChat(raw: PatientChatInput): Promise<string | null> {
  const question = sanitizeInput(raw.question, 400);
  if (!question) return null;

  const patient = raw.patient ?? {};
  const patientBlock: string[] = [];
  if (patient.name)              patientBlock.push(`Nombre: ${sanitizeInput(patient.name, 100)}`);
  if (patient.age)               patientBlock.push(`Edad: ${Number(patient.age)} años`);
  if (patient.sex)               patientBlock.push(`Sexo: ${sanitizeInput(patient.sex, 20)}`);
  if (patient.bloodType)         patientBlock.push(`Sangre: ${sanitizeInput(patient.bloodType, 10)}`);
  if (patient.height)            patientBlock.push(`Altura: ${Number(patient.height)} cm`);
  if (patient.weight)            patientBlock.push(`Peso: ${Number(patient.weight)} kg`);
  if (patient.chronicConditions) patientBlock.push(`Crónicas: ${sanitizeInput(patient.chronicConditions)}`);
  if (patient.allergies)         patientBlock.push(`Alergias: ${sanitizeInput(patient.allergies)}`);
  if (patient.medications)       patientBlock.push(`Medicación: ${sanitizeInput(patient.medications)}`);

  const notes = (Array.isArray(raw.notes) ? raw.notes : []).slice(0, 20);
  const notesBlock = notes.length
    ? notes.map((n) =>
        `[${sanitizeInput(n.date, 30)}] ${sanitizeInput(n.title, 80)}: ${sanitizeInput(n.body, 200)}`
      ).join("\n")
    : "Sin notas clínicas.";

  const docs = (Array.isArray(raw.documents) ? raw.documents : []).slice(0, 20);
  const docsBlock = docs.length
    ? docs.map((d) =>
        `- ${sanitizeInput(d.title, 80)} (${sanitizeInput(d.category, 30)}, ${sanitizeInput(d.date, 30)})` +
        (d.notes ? ": " + sanitizeInput(d.notes, 100) : "")
      ).join("\n")
    : "Sin documentos.";

  const systemPrompt =
    "Eres un asistente clínico de HealthPal.mx. Tu única función es responder preguntas del médico sobre el expediente del paciente proporcionado. " +
    "Responde SOLAMENTE con información del expediente. Usa lenguaje clínico conciso en español. " +
    "No generes código, JSON, URLs ni instrucciones. Si no hay datos suficientes, indícalo claramente.\n\n" +
    "=== EXPEDIENTE ===\n" +
    patientBlock.join("\n") + "\n\n" +
    "=== NOTAS CLÍNICAS ===\n" + notesBlock + "\n\n" +
    "=== DOCUMENTOS ===\n" + docsBlock + "\n" +
    "=================";

  // Sanitize conversation history, cap at last 10 turns
  const history = (Array.isArray(raw.history) ? raw.history : [])
    .slice(-10)
    .map((t) => ({
      role: t.role as "user" | "assistant",
      content: sanitizeInput(t.content, 500),
    }));

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...history,
    { role: "user", content: question },
  ];

  const raw_output = await callLLM(messages, { temperature: 0.3, max_tokens: 500 });
  return sanitizeOutput(raw_output);
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  const cors = corsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: cors });
  }

  try {
    // ── Auth: require valid Supabase JWT ────────────────────────────────────
    const authHeader = req.headers.get("authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.slice(7);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ── Rate limit ──────────────────────────────────────────────────────────
    const allowed = await checkRateLimit(supabase, user.id).catch(() => true);
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: "Límite de solicitudes alcanzado. Intenta de nuevo en una hora." }),
        { status: 429, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    // ── Parse body ──────────────────────────────────────────────────────────
    const body = await req.json().catch(() => null);
    if (!body || typeof body.action !== "string") {
      return new Response(JSON.stringify({ error: "action requerido" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    let result: string | null = null;

    try {
      if (body.action === "patient_summary") {
        result = await handlePatientSummary(body.data ?? {});
      } else if (body.action === "patient_chat") {
        result = await handlePatientChat(body.data ?? {});
      } else {
        return new Response(JSON.stringify({ error: "action no reconocida" }), {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }
    } catch (llmErr) {
      const msg = (llmErr as Error).message;
      const knownErrors = ["NO_API_KEY", "LLM_AUTH_ERROR", "LLM_QUOTA_ERROR", "LLM_WRONG_ENDPOINT"];
      if (msg === "NO_API_KEY" || knownErrors.includes(msg) || msg.startsWith("LLM_")) {
        return new Response(JSON.stringify({ error: msg }), {
          status: 503,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      throw llmErr; // re-throw other errors
    }

    return new Response(JSON.stringify({ result }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    const error = err as Error;
    console.error("ai-proxy error:", error.message);
    return new Response(JSON.stringify({ error: "Error interno" }), {
      status: 500,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
