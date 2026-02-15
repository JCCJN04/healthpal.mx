import { supabase } from '../supabase'
import type { Database } from '../../types/database'
import { getOrCreateConversation, listMyConversations } from './chat'

export type PatientProfileLite = {
  id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
}

// Lista pacientes vinculados a un doctor mediante citas previas o conversaciones existentes
export async function listDoctorPatients(doctorId: string): Promise<PatientProfileLite[]> {
  if (!doctorId) return []

  // 1) Pacientes por historial de citas
  const { data: rows, error: apptError } = await supabase
    .from('appointments')
    .select('patient_id')
    .eq('doctor_id', doctorId)
    .not('patient_id', 'is', null)
    .limit(200)

  if (apptError) {
    console.error('Error fetching doctor patients ids:', apptError)
  }

  const idsFromAppointments = Array.from(new Set((rows || []).map(r => r.patient_id).filter(Boolean) as string[]))

  // 2) Pacientes por conversaciones (aunque no haya cita aún)
  let idsFromChat: string[] = []
  try {
    const convs = await listMyConversations(doctorId)
    idsFromChat = (convs || [])
      .filter(c => c.other_participant?.role === 'patient')
      .map(c => c.other_participant?.id)
      .filter(Boolean) as string[]
  } catch (err) {
    console.error('Error fetching doctor patients from chat:', err)
  }

  const ids = Array.from(new Set([...idsFromAppointments, ...idsFromChat]))
  if (ids.length === 0) return []

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url')
    .in('id', ids)

  if (error) {
    console.error('Error fetching doctor patients profiles:', error)
    return []
  }

  return (data || []).map(({ id, full_name, email, avatar_url }) => ({ id, full_name, email, avatar_url }))
}

// Busca pacientes existentes (usuarios con rol patient) por nombre o email
export async function searchPatients(term: string): Promise<PatientProfileLite[]> {
  if (!term.trim()) return []

  const like = `%${term.trim()}%`
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url, role')
    .eq('role', 'patient')
    .or(`email.ilike.${like},full_name.ilike.${like}`)
    .limit(10)

  if (error) {
    console.error('Error searching patients:', error)
    return []
  }

  return (data || []).map(({ id, full_name, email, avatar_url }) => ({ id, full_name, email, avatar_url }))
}

// Crea (o reutiliza) una conversación con el paciente para activar el inbox
export async function linkPatientConversation(doctorId: string, patientId: string): Promise<string | null> {
  return getOrCreateConversation(doctorId, patientId)
}
