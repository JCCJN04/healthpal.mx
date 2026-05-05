// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { supabase } from '@/shared/lib/supabase'
import type { Database } from '@/shared/types/database'
import { logger } from '@/shared/lib/logger'

type Profile = Database['public']['Tables']['profiles']['Row']
type DoctorProfile = Database['public']['Tables']['doctor_profiles']['Row']

export interface DoctorWithProfile extends Profile {
  doctor_profile: DoctorProfile | null
}

/**
 * Get doctor by ID with full profile
 */
export async function getDoctorById(doctorId: string): Promise<DoctorWithProfile | null> {
  try {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', doctorId)
      .eq('role', 'doctor')
      .single()

    if (profileError) {
      logger.error('doctors:fetchProfile', profileError)
      return null
    }

    const { data: doctorProfile, error: doctorError } = await supabase
      .from('doctor_profiles')
      .select('*')
      .eq('doctor_id', doctorId)
      .single()

    if (doctorError && doctorError.code !== 'PGRST116') {
      logger.error('doctors:fetchDoctorProfile', doctorError)
    }

    return {
      ...(profile as Profile),
      doctor_profile: doctorProfile || null,
    }
  } catch (err) {
    logger.error('doctors:getDoctorById', err)
    return null
  }
}

/**
 * Get doctors linked to a patient (care team).
 */
export async function getPatientDoctors(patientId: string): Promise<DoctorWithProfile[]> {
  try {
    const [careLinksRes, consentRes] = await Promise.all([
      supabase
        .from('care_links')
        .select('doctor_id')
        .eq('patient_id', patientId)
        .eq('status', 'active'),
      supabase
        .from('doctor_patient_consent')
        .select('doctor_id')
        .eq('patient_id', patientId)
        .eq('status', 'accepted'),
    ])

    if (careLinksRes.error) logger.error('doctors:fetchCareLinks', careLinksRes.error)
    if (consentRes.error) logger.error('doctors:fetchConsent', consentRes.error)

    const idsFromCareLinks = (careLinksRes.data || []).map(cl => cl.doctor_id)
    const idsFromConsent = (consentRes.data || []).map(c => c.doctor_id)
    const doctorIds = [...new Set([...idsFromCareLinks, ...idsFromConsent])]

    if (doctorIds.length === 0) return []

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', doctorIds)
      .eq('role', 'doctor')

    if (profilesError) {
      logger.error('doctors:fetchDoctorProfiles', profilesError)
      return []
    }

    const { data: doctorProfiles } = await supabase
      .from('doctor_profiles')
      .select('*')
      .in('doctor_id', doctorIds)

    const doctorProfileMap = new Map(
      (doctorProfiles || []).map(dp => [dp.doctor_id, dp])
    )

    return profiles.map(profile => ({
      ...profile,
      doctor_profile: doctorProfileMap.get(profile.id) || null,
    }))
  } catch (err) {
    logger.error('doctors:getPatientDoctors', err)
    return []
  }
}

/**
 * Link a doctor to a patient (add to care team)
 */
export async function linkDoctorToPatient(patientId: string, doctorId: string): Promise<boolean> {
  try {
    const { data: existing } = await supabase
      .from('care_links')
      .select('id, status')
      .eq('patient_id', patientId)
      .eq('doctor_id', doctorId)
      .maybeSingle()

    if (existing) {
      if (existing.status !== 'active') {
        const { error } = await supabase
          .from('care_links')
          .update({ status: 'active' })
          .eq('id', existing.id)
        if (error) {
          logger.error('doctors:linkDoctorToPatient:reactivate', error)
          return false
        }
      }
      return true
    }

    const { error } = await supabase
      .from('care_links')
      .insert({ patient_id: patientId, doctor_id: doctorId, status: 'active', created_by: patientId })

    if (error) {
      logger.error('doctors:linkDoctorToPatient', error)
      return false
    }

    return true
  } catch (err) {
    logger.error('doctors:linkDoctorToPatient', err)
    return false
  }
}

/**
 * Unlink a doctor from a patient
 */
export async function unlinkDoctorFromPatient(patientId: string, doctorId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('care_links')
      .delete()
      .eq('patient_id', patientId)
      .eq('doctor_id', doctorId)

    if (error) {
      logger.error('doctors:unlinkDoctorFromPatient', error)
      return false
    }

    return true
  } catch (err) {
    logger.error('doctors:unlinkDoctorFromPatient', err)
    return false
  }
}
