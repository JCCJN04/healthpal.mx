// @ts-nocheck
import { supabase } from '@/shared/lib/supabase'
import type { Database } from '@/shared/types/database'
import { logger } from '@/shared/lib/logger'

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
  const { data: apptRows, error: apptError } = await supabase
    .from('appointments')
    .select('patient_id')
    .eq('doctor_id', doctorId)
    .not('patient_id', 'is', null)
    .limit(200)

  if (apptError) {
    logger.error('listDoctorPatients.appointments', apptError)
  }

  const idsFromAppointments = Array.from(
    new Set((apptRows || []).map(r => r.patient_id).filter(Boolean) as string[])
  )

  // 2) Pacientes por conversaciones (participantes que son pacientes)
  let idsFromChat: string[] = []
  try {
    const { data: myParts } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', doctorId)

    if (myParts && myParts.length > 0) {
      const convIds = myParts.map(p => p.conversation_id)
      const { data: otherParts } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .in('conversation_id', convIds)
        .neq('user_id', doctorId)

      if (otherParts && otherParts.length > 0) {
        const otherIds = Array.from(new Set(otherParts.map(p => p.user_id)))
        // Filter to only patients
        const { data: patientProfiles } = await supabase
          .from('profiles')
          .select('id')
          .in('id', otherIds)
          .eq('role', 'patient')

        idsFromChat = (patientProfiles || []).map(p => p.id)
      }
    }
  } catch (err) {
    logger.error('listDoctorPatients.chat', err)
  }

  const ids = Array.from(new Set([...idsFromAppointments, ...idsFromChat]))
  if (ids.length === 0) return []

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url')
    .in('id', ids)

  if (error) {
    logger.error('listDoctorPatients.profiles', error)
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
    logger.error('searchPatients', error)
    return []
  }

  return (data || []).map(({ id, full_name, email, avatar_url }) => ({ id, full_name, email, avatar_url }))
}

// Crea (o reutiliza) una conversación con el paciente para activar el inbox
export async function linkPatientConversation(doctorId: string, patientId: string): Promise<string | null> {
  try {
    // Check if a conversation already exists via RPC
    const { data: existing, error: eError } = await supabase
      .rpc('get_conversation_between_users', {
        user_a: doctorId,
        user_b: patientId,
      })

    if (!eError && existing && existing.length > 0) {
      return existing[0].id
    }

    // Start a new conversation via RPC
    const { data: newId, error: startError } = await supabase
      .rpc('start_new_conversation', {
        other_user_id: patientId,
      })

    if (startError) throw startError
    return newId
  } catch (err) {
    logger.error('linkPatientConversation', err)
    return null
  }
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
    logger.error('getPatientFullProfile', error)
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
    logger.error('getPatientNotes', error)
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
    logger.error('addPatientNote', error)
    throw error
  }

  return data
}
