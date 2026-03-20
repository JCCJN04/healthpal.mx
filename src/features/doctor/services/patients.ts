// @ts-nocheck
import { supabase } from '@/shared/lib/supabase'
import type { Database, DoctorPatientConsent } from '@/shared/types/database'
import { logger } from '@/shared/lib/logger'

export type PatientProfileLite = {
  id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
  consentStatus?: string | null
}

/**
 * List patients that have ACCEPTED consent for this doctor.
 * Only returns patients with an accepted consent row.
 */
export async function listDoctorPatients(doctorId: string): Promise<PatientProfileLite[]> {
  if (!doctorId) return []

  try {
    // Get all accepted consent rows for this doctor
    const { data: consentRows, error: consentErr } = await supabase
      .from('doctor_patient_consent')
      .select('patient_id, status')
      .eq('doctor_id', doctorId)
      .eq('status', 'accepted')

    if (consentErr) {
      logger.error('listDoctorPatients.consent', consentErr)
      return []
    }

    const ids = (consentRows || []).map((r) => r.patient_id).filter(Boolean)
    if (ids.length === 0) return []

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .in('id', ids)

    if (error) {
      logger.error('listDoctorPatients.profiles', error)
      return []
    }

    return (data || []).map(({ id, full_name, email, avatar_url }) => ({
      id, full_name, email, avatar_url, consentStatus: 'accepted',
    }))
  } catch (err) {
    logger.error('listDoctorPatients', err)
    return []
  }
}

/**
 * Search patients by name or email.
 * Returns basic public info (name + avatar only) — does NOT
 * expose email unless the doctor already has consent.
 * Requires minimum 3-character search term.
 */
export async function searchPatients(term: string, doctorId: string): Promise<PatientProfileLite[]> {
  if (!term.trim() || term.trim().length < 3) return []

  const like = `%${term.trim()}%`
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .eq('role', 'patient')
    .or(`full_name.ilike.${like}`)
    .limit(10)

  if (error) {
    logger.error('searchPatients', error)
    return []
  }

  // Check consent status for each result
  const ids = (data || []).map((p) => p.id)
  let consentMap: Record<string, string> = {}
  if (ids.length > 0 && doctorId) {
    const { data: consents } = await supabase
      .from('doctor_patient_consent')
      .select('patient_id, status')
      .eq('doctor_id', doctorId)
      .in('patient_id', ids)

    ;(consents || []).forEach((c) => { consentMap[c.patient_id] = c.status })
  }

  return (data || []).map(({ id, full_name, avatar_url }) => ({
    id,
    full_name,
    email: null, // Never expose email in search results
    avatar_url,
    consentStatus: consentMap[id] || null,
  }))
}

/**
 * Create or reuse a conversation with a patient.
 * Will FAIL at the DB level if no accepted consent exists
 * (start_new_conversation RPC now enforces consent).
 */
export async function linkPatientConversation(doctorId: string, patientId: string): Promise<string | null> {
  try {
    const { data: existing, error: eError } = await supabase
      .rpc('get_conversation_between_users', {
        user_a: doctorId,
        user_b: patientId,
      })

    if (!eError && existing && existing.length > 0) {
      return existing[0].id
    }

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

/**
 * Fetches the patient's profile. RLS on patient_profiles will
 * return null/error if the doctor doesn't have share_basic_profile consent.
 */
export async function getPatientFullProfile(patientId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id, full_name, avatar_url, role, birthdate, sex,
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

/**
 * Fetches contact info only — gated by share_contact scope at RLS level.
 * Returns null if doctor lacks the scope.
 */
export async function getPatientContactInfo(patientId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('email, phone')
    .eq('id', patientId)
    .single()

  if (error) {
    // RLS will block this if no consent
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

// Agrega una nueva nota clínica.
// Plaintext note content is disabled by DB lockdown; this helper now guards callers
// until encrypted write endpoint is implemented.
export async function addPatientNote(_patientId: string, _doctorId: string, _title: string, _content: string) {
  const err = new Error('La captura de notas clinicas requiere el flujo cifrado (pendiente de implementacion).')
  logger.warn('addPatientNote.disabled', err)
  throw err
}
