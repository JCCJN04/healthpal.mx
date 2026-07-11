import { supabase } from '@/shared/lib/supabase'

// ── Types ────────────────────────────────────────────────────────────────────

export interface DiagnosticoCIE10 {
  id?: string
  nota_id?: string
  orden: number
  tipo: 'principal' | 'secundario'
  cie10_codigo: string
  cie10_descripcion?: string | null
  created_at?: string
}

export interface NotaEvolucionAddenda {
  id: string
  nota_id: string
  doctor_id: string
  contenido: string
  created_at: string
}

export interface NotaEvolucion {
  id: string
  appointment_id: string
  doctor_id: string
  patient_id: string
  fecha_hora: string
  // Signos vitales
  ta_sistolica: number | null
  ta_diastolica: number | null
  frecuencia_cardiaca: number | null
  frecuencia_respiratoria: number | null
  temperatura: number | null
  peso_kg: number | null
  talla_cm: number | null
  saturacion_oxigeno: number | null
  // SOAP (decrypted — returned by edge function)
  motivo_consulta: string
  exploracion_fisica: string
  diagnostico: string
  pronostico: string
  plan_terapeutico: string
  // Meta
  enc_kid: string
  enc_ver: number
  created_at: string
  updated_at: string
  // Relations
  notas_evolucion_addenda?: NotaEvolucionAddenda[]
  notas_evolucion_diagnosticos?: DiagnosticoCIE10[]
}

export interface NotaEvolucionInput {
  appointment_id: string
  patient_id: string
  // Signos vitales
  ta_sistolica?: number | null
  ta_diastolica?: number | null
  frecuencia_cardiaca?: number | null
  frecuencia_respiratoria?: number | null
  temperatura?: number | null
  peso_kg?: number | null
  talla_cm?: number | null
  saturacion_oxigeno?: number | null
  // CIE-10 (1..N)
  diagnosticos?: Array<{
    orden: number
    tipo: 'principal' | 'secundario'
    cie10_codigo: string
    cie10_descripcion?: string | null
  }>
  // SOAP
  motivo_consulta?: string
  exploracion_fisica?: string
  diagnostico?: string
  pronostico?: string
  plan_terapeutico?: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getAuthToken(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('No session')
  return session.access_token
}

function fnUrl(path = ''): string {
  const base = import.meta.env.VITE_SUPABASE_URL as string
  return `${base}/functions/v1/notas-evolucion${path}`
}

// ── Queries ──────────────────────────────────────────────────────────────────

export async function getNotaEvolucionByAppointment(
  appointmentId: string,
): Promise<NotaEvolucion | null> {
  const token = await getAuthToken()
  const res = await fetch(fnUrl(`?appointment_id=${encodeURIComponent(appointmentId)}`), {
    headers: { Authorization: `Bearer ${token}` },
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Error al obtener nota')
  return json as NotaEvolucion | null
}

export async function getNotasEvolucionByPatient(patientId: string): Promise<NotaEvolucion[]> {
  const token = await getAuthToken()
  const res = await fetch(fnUrl(`?patient_id=${encodeURIComponent(patientId)}`), {
    headers: { Authorization: `Bearer ${token}` },
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Error al obtener notas')
  return json as NotaEvolucion[]
}

export async function saveNotaEvolucion(input: NotaEvolucionInput): Promise<NotaEvolucion> {
  const { data, error } = await supabase.functions.invoke<NotaEvolucion>('notas-evolucion', {
    body: input,
  })
  if (error) throw new Error('Error al guardar nota de evolución')
  if (!data) throw new Error('Error al guardar nota de evolución')
  return data
}

export async function createAddenda(
  notaId: string,
  contenido: string,
): Promise<NotaEvolucionAddenda> {
  const { data, error } = await supabase.functions.invoke<NotaEvolucionAddenda>(
    'notas-evolucion/addenda',
    { body: { nota_id: notaId, contenido } },
  )
  if (error) throw new Error('Error al guardar addenda')
  if (!data) throw new Error('Error al guardar addenda')
  return data
}
