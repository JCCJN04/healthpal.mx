import { logger } from './logger'

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY as string | undefined
const OPENAI_BASE_URL = (import.meta.env.VITE_OPENAI_BASE_URL as string | undefined) ?? 'https://api.openai.com/v1'
const MODEL = 'gpt-oss-120b'

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

async function chatCompletion(
  messages: ChatMessage[],
  options?: { temperature?: number; max_tokens?: number }
): Promise<string | null> {
  if (!OPENAI_API_KEY) {
    logger.error('openai: VITE_OPENAI_API_KEY not set')
    return null
  }

  try {
    const res = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: options?.temperature ?? 0.3,
        max_tokens: options?.max_tokens ?? 400,
      }),
    })

    if (!res.ok) {
      logger.error('openai: request failed', { status: res.status })
      return null
    }

    const data = await res.json()
    return (data.choices?.[0]?.message?.content as string) ?? null
  } catch (err) {
    logger.error('openai: fetch error', err)
    return null
  }
}

export interface PatientSummaryInput {
  name: string
  age?: number | null
  sex?: string | null
  bloodType?: string | null
  chronicConditions?: string | null
  allergies?: string | null
  medications?: string | null
  height?: number | null
  weight?: number | null
  documentCount?: number
  noteCount?: number
  lastNoteDate?: string | null
  upcomingAppointments?: number
}

/**
 * Generates a concise clinical summary for a doctor about a patient.
 * Returns the summary string or null on failure.
 */
export async function generatePatientSummary(data: PatientSummaryInput): Promise<string | null> {
  const lines: string[] = []
  if (data.name)               lines.push(`Nombre: ${data.name}`)
  if (data.age)                lines.push(`Edad: ${data.age} años`)
  if (data.sex)                lines.push(`Sexo: ${data.sex}`)
  if (data.bloodType)          lines.push(`Tipo de sangre: ${data.bloodType}`)
  if (data.height)             lines.push(`Altura: ${data.height} cm`)
  if (data.weight)             lines.push(`Peso: ${data.weight} kg`)
  if (data.chronicConditions)  lines.push(`Condiciones crónicas: ${data.chronicConditions}`)
  if (data.allergies)          lines.push(`Alergias: ${data.allergies}`)
  if (data.medications)        lines.push(`Medicación activa: ${data.medications}`)
  if (data.documentCount != null) lines.push(`Documentos en expediente: ${data.documentCount}`)
  if (data.noteCount != null)  lines.push(`Notas clínicas: ${data.noteCount}`)
  if (data.lastNoteDate)       lines.push(`Última nota clínica: ${data.lastNoteDate}`)
  if (data.upcomingAppointments != null) lines.push(`Citas próximas: ${data.upcomingAppointments}`)

  const prompt = `Eres un asistente clínico de HealthPal.mx. Genera un resumen clínico conciso y útil para el médico tratante. El resumen debe estar en español, ocupar máximo 3 oraciones directas, destacar lo clínicamente relevante (condiciones crónicas, alergias críticas, medicación activa, estado del expediente). Usa lenguaje clínico profesional. Si hay alergias importantes, menciónalas primero. Responde SOLO con el resumen, sin encabezados ni viñetas.

Datos del paciente:
${lines.join('\n')}`

  return chatCompletion(
    [{ role: 'user', content: prompt }],
    { temperature: 0.2, max_tokens: 300 }
  )
}

// ─── Patient Record Chat ──────────────────────────────────────────────────────

export interface PatientRecordContext {
  patient: PatientSummaryInput
  notes: { title: string; body: string; date: string }[]
  documents: { title: string; category: string; date: string; notes?: string | null }[]
}

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

/**
 * Sends a doctor's question about a patient record, with full structured context.
 * history = previous turns for multi-turn conversation.
 */
export async function chatWithPatientRecord(
  question: string,
  context: PatientRecordContext,
  history: ChatTurn[] = []
): Promise<string | null> {
  const { patient, notes, documents } = context

  const patientBlock: string[] = []
  if (patient.name)              patientBlock.push(`Nombre: ${patient.name}`)
  if (patient.age)               patientBlock.push(`Edad: ${patient.age} años`)
  if (patient.sex)               patientBlock.push(`Sexo: ${patient.sex}`)
  if (patient.bloodType)         patientBlock.push(`Tipo de sangre: ${patient.bloodType}`)
  if (patient.height)            patientBlock.push(`Altura: ${patient.height} cm`)
  if (patient.weight)            patientBlock.push(`Peso: ${patient.weight} kg`)
  if (patient.chronicConditions) patientBlock.push(`Condiciones crónicas: ${patient.chronicConditions}`)
  if (patient.allergies)         patientBlock.push(`Alergias: ${patient.allergies}`)
  if (patient.medications)       patientBlock.push(`Medicación activa: ${patient.medications}`)

  const notesBlock = notes.length
    ? notes.map(n => `[${n.date}] ${n.title}: ${n.body}`).join('\n')
    : 'Sin notas clínicas.'

  const docsBlock = documents.length
    ? documents.map(d => `- ${d.title} (${d.category}, ${d.date})${d.notes ? ': ' + d.notes : ''}`).join('\n')
    : 'Sin documentos.'

  const systemPrompt = `Eres un asistente clínico de HealthPal.mx. Ayudas al médico a consultar el expediente de su paciente. Responde SOLO con información del expediente proporcionado. Usa lenguaje clínico conciso en español. Si no hay datos para responder, dilo claramente.

=== EXPEDIENTE DEL PACIENTE ===
${patientBlock.join('\n')}

=== NOTAS CLÍNICAS ===
${notesBlock}

=== DOCUMENTOS ===
${docsBlock}
================================`

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...history.map(t => ({ role: t.role, content: t.content })),
    { role: 'user', content: question },
  ]

  return chatCompletion(messages, { temperature: 0.3, max_tokens: 500 })
}
