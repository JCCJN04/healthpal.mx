/**
 * AI integration — all LLM calls are proxied through the `ai-proxy` Edge Function.
 * The OpenAI API key never leaves the server; this module only holds the
 * Supabase anon key (already public) to invoke the function.
 */
import { supabase } from './supabase'
import { logger } from './logger'

// ── Types (shared with ai-proxy) ──────────────────────────────────────────────

export interface PatientSummaryInput {
  name?: string | null
  age?: number | null
  sex?: string | null
  bloodType?: string | null
  chronicConditions?: string | null
  allergies?: string | null
  medications?: string | null
  height?: number | null
  weight?: number | null
  bmi?: number | null
  documentCount?: number | null
  noteCount?: number | null
  lastNoteDate?: string | null
  upcomingAppointments?: number | null
  totalAppointments?: number | null
  lastAppointmentDate?: string | null
  psychiatricDiagnoses?: string | null
  psychiatricMeds?: string | null
  developmentalNotes?: string | null
  smokingStatus?: string | null
  alcoholUse?: string | null
  familyHistory?: string | null
  recentNotesSummary?: string | null
  patientObservations?: string | null
  surgeries?: string | null
  hospitalizations?: string | null
}

export interface PatientRecordContext {
  patient: PatientSummaryInput
  notes: { title: string; body: string; date: string }[]
  documents: { title: string; category: string; date: string; notes?: string | null }[]
}

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

// ── Proxy helper ──────────────────────────────────────────────────────────────

export type ProxyResult = { value: string | null; noApiKey?: boolean; llmError?: string }

async function invokeProxy<T extends object>(
  action: string,
  data: T,
): Promise<ProxyResult> {
  try {
    const { data: res, error } = await supabase.functions.invoke<{ result: string | null; error?: string }>('ai-proxy', {
      body: { action, data },
    })

    if (error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body = await (error as any).context?.json?.().catch?.(() => null) as { error?: string } | null
      const code = body?.error ?? ''
      if (code === 'NO_API_KEY' || code === 'LLM_AUTH_ERROR' || code === 'LLM_QUOTA_ERROR' || code.startsWith('LLM_')) {
        return { value: null, noApiKey: code === 'NO_API_KEY', llmError: code }
      }
      logger.error('ai-proxy: invoke error', error)
      return { value: null }
    }

    return { value: res?.result ?? null }
  } catch (err) {
    logger.error('ai-proxy: fetch error', err)
    return { value: null }
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generates a concise clinical summary for a doctor about a patient.
 * Returns ProxyResult: { value: string | null, noApiKey?: boolean }
 */
export async function generatePatientSummary(
  data: PatientSummaryInput,
): Promise<ProxyResult> {
  return invokeProxy('patient_summary', data)
}

/**
 * Sends a doctor's question about a patient record with full structured context.
 * history = previous turns for multi-turn conversation.
 */
export async function chatWithPatientRecord(
  question: string,
  context: PatientRecordContext,
  history: ChatTurn[] = [],
): Promise<ProxyResult> {
  return invokeProxy('patient_chat', {
    question,
    patient: context.patient,
    notes: context.notes,
    documents: context.documents,
    history,
  })
}
