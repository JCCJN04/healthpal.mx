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

// Obtiene el perfil completo de un paciente para la página de detalle
export async function getPatientFullProfile(patientId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      *,
      patient_profiles (*)
    `)
    .eq('id', patientId)
    .single()

  if (error) {
    console.error('Error fetching full patient profile:', error)
    return null
  }

  return data
}

// Obtiene las notas clínicas de un paciente para un doctor específico
export async function getPatientNotes(patientId: string, doctorId: string) {
  const { data, error } = await supabase
    .from('patient_notes')
    .select('*')
    .eq('patient_id', patientId)
    .eq('doctor_id', doctorId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching patient notes:', error)
    return []
  }

  return data
}

// Agrega una nueva nota clínica
export async function addPatientNote(patientId: string, doctorId: string, title: string, body: string) {
  const { data, error } = await supabase
    .from('patient_notes')
    .insert({
      patient_id: patientId,
      doctor_id: doctorId,
      title,
      body
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding patient note:', error)
    throw error
  }

  return data
}
