// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { supabase } from '@/shared/lib/supabase'
import { logger } from '@/shared/lib/logger'
import { isDemoMode } from '@/context/DemoContext'
import { demoPatients } from '@/data/demoData'

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

  if (isDemoMode()) {
    return demoPatients.map((patient) => ({
      id: patient.id,
      full_name: patient.full_name,
      email: patient.email,
      avatar_url: patient.avatar_url,
      consentStatus: 'accepted',
    }))
  }

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
      id,
      full_name,
      email,
      avatar_url,
      consentStatus: 'accepted',
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
export async function searchPatients(
  term: string,
  doctorId: string,
): Promise<PatientProfileLite[]> {
  if (!term.trim() || term.trim().length < 3) return []

  if (isDemoMode()) {
    const text = term.trim().toLowerCase()
    return demoPatients
      .filter(
        (patient) =>
          patient.full_name.toLowerCase().includes(text) ||
          patient.email.toLowerCase().includes(text),
      )
      .map((patient) => ({
        id: patient.id,
        full_name: patient.full_name,
        email: null,
        avatar_url: patient.avatar_url,
        consentStatus: 'accepted',
      }))
      .slice(0, 10)
  }

  const { data, error } = await supabase.rpc('search_patients_for_doctor', {
    search_term: term.trim(),
    p_doctor_id: doctorId,
  })

  if (error) {
    logger.error('searchPatients', error)
    return []
  }

  return (data || []).map(({ id, full_name, avatar_url, consent_status }) => ({
    id,
    full_name,
    email: null, // Never expose email in search results
    avatar_url,
    consentStatus: consent_status || null,
  }))
}

/**
 * Doctor: Request access to an existing HealthPal user by email or phone.
 */
export async function requestAccessByIdentifier(
  doctorId: string,
  identifier: string,
  reason?: string,
): Promise<{
  ok: boolean
  message: string
  patientId?: string
  patientName?: string
  code?: string
}> {
  if (!identifier.trim() || !doctorId) {
    return { ok: false, message: 'Ingresa un correo o teléfono válido.' }
  }

  if (isDemoMode()) {
    return { ok: true, message: 'Solicitud enviada (Modo Demo).' }
  }

  try {
    const { data, error } = await supabase.rpc('request_access_to_patient_by_identifier', {
      p_doctor_id: doctorId,
      p_identifier: identifier.trim(),
      p_reason: reason?.trim() || null,
    })

    if (error) {
      logger.error('requestAccessByIdentifier', error)
      return { ok: false, message: error.message }
    }

    const res = data as {
      success: boolean
      message: string
      code?: string
      patient_id?: string
      patient_name?: string
    }

    return {
      ok: res.success,
      message: res.message,
      patientId: res.patient_id,
      patientName: res.patient_name,
      code: res.code,
    }
  } catch (err) {
    logger.error('requestAccessByIdentifier', err)
    return { ok: false, message: 'Error inesperado al solicitar acceso.' }
  }
}

/**
 * Unlink / Remove a patient from doctor's active list.
 * Revokes consent scopes, sets status = 'revoked', and cancels pending future appointments
 * while safely preserving historical clinical notes and prescriptions in DB per NOM-004.
 */
export async function unlinkPatientFromDoctor(
  doctorId: string,
  patientId: string,
  cancelFutureAppointments = true,
): Promise<{ ok: boolean; message: string; cancelledAppointments?: number }> {
  if (!doctorId || !patientId) {
    return { ok: false, message: 'Parámetros inválidos para desvincular.' }
  }

  if (isDemoMode()) {
    return { ok: true, message: 'Paciente desvinculado (Modo Demo).' }
  }

  try {
    const { data, error } = await supabase.rpc('doctor_unlink_patient', {
      p_doctor_id: doctorId,
      p_patient_id: patientId,
      p_cancel_future_appointments: cancelFutureAppointments,
    })

    if (error) {
      logger.error('unlinkPatientFromDoctor', error)
      return { ok: false, message: error.message || 'Error al desvincular al paciente.' }
    }

    const res = data as {
      success: boolean
      message: string
      cancelled_appointments?: number
    }

    return {
      ok: res.success,
      message: res.message,
      cancelledAppointments: res.cancelled_appointments,
    }
  } catch (err) {
    logger.error('unlinkPatientFromDoctor', err)
    return { ok: false, message: 'Error inesperado al desvincular paciente.' }
  }
}

/**
 * Fetches the patient's profile. RLS on patient_profiles will
 * return null/error if the doctor doesn't have share_basic_profile consent.
 */
export async function getPatientFullProfile(patientId: string) {
  if (isDemoMode()) {
    const found = demoPatients.find((patient) => patient.id === patientId)
    if (!found) return null

    return {
      id: found.id,
      full_name: found.full_name,
      avatar_url: found.avatar_url,
      role: 'patient',
      birthdate: '1990-01-01',
      sex: 'female',
      patient_profiles: {
        blood_type: 'O+',
        allergies: found.diagnosis,
      },
    }
  }

  const { data, error } = await supabase
    .from('profiles')
    .select(
      `
      id, full_name, avatar_url, role, birthdate, sex,
      patient_profiles (*)
    `,
    )
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
  if (isDemoMode()) {
    const found = demoPatients.find((patient) => patient.id === patientId)
    if (!found) return null
    return { email: found.email, phone: '+52 55 0000 0000' }
  }

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

// Obtiene las notas clínicas de un paciente — descifradas vía Edge Function
export async function getPatientNotes(patientId: string, doctorId: string) {
  if (isDemoMode()) {
    return [
      {
        id: 'demo-note-001',
        patient_id: patientId,
        doctor_id: doctorId,
        title: 'Nota de seguimiento',
        body: 'Paciente estable, continuar tratamiento actual.',
        created_at: new Date().toISOString(),
      },
    ]
  }

  // Call Edge Function to get decrypted notes
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return []

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const res = await fetch(
    `${supabaseUrl}/functions/v1/patient-notes?patient_id=${patientId}&doctor_id=${doctorId}`,
    { headers: { Authorization: `Bearer ${session.access_token}` } },
  )

  if (!res.ok) {
    logger.error('getPatientNotes.edge', await res.text())
    return []
  }

  return res.json()
}

// Agrega una nueva nota clínica cifrada vía Edge Function
export async function addPatientNote(
  patientId: string,
  _doctorId: string,
  title: string,
  body: string,
) {
  if (isDemoMode()) {
    return {
      id: `demo-note-${Date.now()}`,
      patient_id: patientId,
      doctor_id: _doctorId,
      title,
      body,
      created_at: new Date().toISOString(),
    }
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error('No hay sesión activa')

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const res = await fetch(`${supabaseUrl}/functions/v1/patient-notes`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ patient_id: patientId, title, body }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error desconocido' }))
    throw new Error(err.error || 'Error al guardar la nota')
  }

  return res.json()
}
