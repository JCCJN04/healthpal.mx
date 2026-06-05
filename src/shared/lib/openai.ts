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
  documentCount?: number | null
  noteCount?: number | null
  lastNoteDate?: string | null
  upcomingAppointments?: number | null
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

async function invokeProxy<T extends object>(
  action: string,
  data: T,
): Promise<string | null> {
  try {
    const { data: res, error } = await supabase.functions.invoke<{ result: string | null }>('ai-proxy', {
      body: { action, data },
    })

    if (error) {
      logger.error('ai-proxy: invoke error', error)
      return null
    }

    return res?.result ?? null
  } catch (err) {
    logger.error('ai-proxy: fetch error', err)
    return null
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generates a concise clinical summary for a doctor about a patient.
 * Returns the summary string or null on failure.
 */
export async function generatePatientSummary(
  data: PatientSummaryInput,
): Promise<string | null> {
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
): Promise<string | null> {
  return invokeProxy('patient_chat', {
    question,
    patient: context.patient,
    notes: context.notes,
    documents: context.documents,
    history,
  })
}
