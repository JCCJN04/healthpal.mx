import { supabase } from '@/shared/lib/supabase'

export interface AppointmentNote {
  id: string
  appointment_id: string
  author_id: string
  title: string | null
  body: string
  note_kid: string
  note_ver: number
  created_at: string
  updated_at: string
  appointments?: {
    id: string
    scheduled_at: string
    duration_min: number
    status: string
    mode: string
    patient_id: string
    doctor_id: string
  }
}

async function getAuthToken(): Promise<string> {
  // Use getUser() to force-verify and refresh the token if needed
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('No session')
  return session.access_token
}

export async function getAppointmentNotesByAppointment(appointmentId: string): Promise<AppointmentNote[]> {
  const token = await getAuthToken()
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
  const res = await fetch(
    `${supabaseUrl}/functions/v1/appointment-notes?appointment_id=${encodeURIComponent(appointmentId)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Error al obtener notas')
  return json as AppointmentNote[]
}

export async function getAppointmentNotesByPatient(patientId: string): Promise<AppointmentNote[]> {
  const token = await getAuthToken()
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
  const res = await fetch(
    `${supabaseUrl}/functions/v1/appointment-notes?patient_id=${encodeURIComponent(patientId)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Error al obtener notas')
  return json as AppointmentNote[]
}

export async function createAppointmentNote(
  appointmentId: string,
  body: string,
  title?: string,
): Promise<AppointmentNote> {
  // Use functions.invoke so the SDK handles auth token automatically
  const { data, error } = await supabase.functions.invoke<AppointmentNote>('appointment-notes', {
    body: { appointment_id: appointmentId, title: title ?? null, body },
  })

  if (error) {
    // Try to extract the server error message
    let msg = 'Error al guardar nota'
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body = await (error as any).context?.json?.()
      if (body?.error) msg = body.error
    } catch { /* ignore */ }
    throw new Error(msg)
  }

  if (!data) throw new Error('Error al guardar nota')
  return data
}

export async function deleteAppointmentNote(noteId: string): Promise<void> {
  const token = await getAuthToken()
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
  const res = await fetch(
    `${supabaseUrl}/functions/v1/appointment-notes?id=${encodeURIComponent(noteId)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }
  )
  if (!res.ok) {
    const json = await res.json()
    throw new Error(json.error || 'Error al eliminar nota')
  }
}
