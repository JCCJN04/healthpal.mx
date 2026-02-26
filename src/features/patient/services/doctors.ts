// @ts-nocheck
import { supabase } from '@/shared/lib/supabase'
import type { Database } from '@/shared/types/database'
import { logger } from '@/shared/lib/logger'

type Profile = Database['public']['Tables']['profiles']['Row']
type DoctorProfile = Database['public']['Tables']['doctor_profiles']['Row']

export interface DoctorReviewStats {
  avg_rating: number
  review_count: number
}

export interface DoctorWithProfile extends Profile {
  doctor_profile: DoctorProfile | null
  review_stats?: DoctorReviewStats
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
      ...(profile as any),
      doctor_profile: doctorProfile || null,
    }
  } catch (err) {
    logger.error('doctors:getDoctorById', err)
    return null
  }
}

/**
 * List all doctors (for directory page)
 */
export async function listDoctors(limit: number = 50): Promise<DoctorWithProfile[]> {
  try {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'doctor')
      .limit(limit)

    if (profilesError) {
      logger.error('doctors:listDoctors:fetch', profilesError)
      return []
    }

    // Fetch doctor profiles for all doctors
    const doctorIds = (profiles as any[]).map(p => p.id)
    const { data: doctorProfiles } = await supabase
      .from('doctor_profiles')
      .select('*')
      .in('doctor_id', doctorIds)

    const doctorProfileMap = new Map(
      ((doctorProfiles || []) as any[]).map(dp => [dp.doctor_id, dp])
    )

    return (profiles as any[]).map(profile => ({
      ...profile,
      doctor_profile: doctorProfileMap.get(profile.id) || null,
    }))
  } catch (err) {
    logger.error('doctors:listDoctors', err)
    return []
  }
}

/**
 * Search doctors by name or specialty
 */
export async function searchDoctors(query: string): Promise<DoctorWithProfile[]> {
  try {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'doctor')
      .or(`full_name.ilike.%${query}%`)
      .limit(20)

    if (profilesError) {
      logger.error('doctors:searchDoctors:fetch', profilesError)
      return []
    }

    const doctorIds = profiles.map(p => p.id)
    const { data: doctorProfiles } = await supabase
      .from('doctor_profiles')
      .select('*')
      .in('doctor_id', doctorIds)
      .or(`specialty.ilike.%${query}%,clinic_name.ilike.%${query}%`)

    const doctorProfileMap = new Map(
      (doctorProfiles || []).map(dp => [dp.doctor_id, dp])
    )

    return profiles.map(profile => ({
      ...profile,
      doctor_profile: doctorProfileMap.get(profile.id) || null,
    }))
  } catch (err) {
    logger.error('doctors:searchDoctors', err)
    return []
  }
}

/**
 * Get doctors linked to a patient (care team).
 * Merges doctors from care_links AND doctor_patient_consent (status=accepted)
 * so that any doctor the patient accepted via consent also appears here.
 */
export async function getPatientDoctors(patientId: string): Promise<DoctorWithProfile[]> {
  try {
    // Fetch from both sources in parallel
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

    if (careLinksRes.error) {
      logger.error('doctors:fetchCareLinks', careLinksRes.error)
    }
    if (consentRes.error) {
      logger.error('doctors:fetchConsent', consentRes.error)
    }

    // Merge & deduplicate doctor IDs from both tables
    const idsFromCareLinks = (careLinksRes.data || []).map(cl => cl.doctor_id)
    const idsFromConsent = (consentRes.data || []).map(c => c.doctor_id)
    const doctorIds = [...new Set([...idsFromCareLinks, ...idsFromConsent])]

    if (doctorIds.length === 0) {
      return []
    }

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', doctorIds)
      .eq('role', 'doctor')

    if (profilesError) {
      logger.error('doctors:fetchDoctorProfiles', profilesError)
      return []
    }

    const [doctorProfilesRes, reviewsRes] = await Promise.all([
      supabase
        .from('doctor_profiles')
        .select('*')
        .in('doctor_id', doctorIds),
      supabase
        .from('verified_reviews')
        .select('doctor_id, rating')
        .in('doctor_id', doctorIds),
    ])

    const doctorProfileMap = new Map(
      (doctorProfilesRes.data || []).map(dp => [dp.doctor_id, dp])
    )

    // Compute avg_rating and review_count per doctor
    const reviewsByDoctor = new Map<string, number[]>()
    for (const r of (reviewsRes.data || []) as { doctor_id: string; rating: number }[]) {
      const arr = reviewsByDoctor.get(r.doctor_id) || []
      arr.push(r.rating)
      reviewsByDoctor.set(r.doctor_id, arr)
    }
    const reviewStatsMap = new Map<string, DoctorReviewStats>()
    for (const [docId, ratings] of reviewsByDoctor) {
      const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length
      reviewStatsMap.set(docId, {
        avg_rating: Math.round(avg * 10) / 10,
        review_count: ratings.length,
      })
    }

    return profiles.map(profile => ({
      ...profile,
      doctor_profile: doctorProfileMap.get(profile.id) || null,
      review_stats: reviewStatsMap.get(profile.id) || { avg_rating: 0, review_count: 0 },
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
    // Check if link already exists
    const { data: existing } = await supabase
      .from('care_links')
      .select('id, status')
      .eq('patient_id', patientId)
      .eq('doctor_id', doctorId)
      .maybeSingle()

    if (existing) {
      // Reactivate if inactive
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

    // Create new link
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
 * Unlink a doctor from a patient (remove from care team)
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

export interface DoctorReview {
  id: string
  rating: number
  comment: string | null
  reviewer_name: string
  created_at: string
}

/**
 * Fetch all verified reviews for a doctor, newest first.
 */
export async function getDoctorReviews(doctorId: string): Promise<DoctorReview[]> {
  try {
    const { data, error } = await supabase
      .from('verified_reviews')
      .select('id, rating, comment, created_at, patient_id')
      .eq('doctor_id', doctorId)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('doctors:getDoctorReviews', error)
      return []
    }

    if (!data || data.length === 0) return []

    const patientIds = [...new Set((data as any[]).map((r: any) => r.patient_id))]
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', patientIds)

    const nameMap = new Map(((profiles || []) as any[]).map((p: any) => [p.id, p.full_name]))

    return (data as any[]).map((r: any) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      created_at: r.created_at,
      reviewer_name: nameMap.get(r.patient_id) || 'Paciente',
    }))
  } catch (err) {
    logger.error('doctors:getDoctorReviews', err)
    return []
  }
}

export interface ScheduleDay {
  day_of_week: number
  open_time: string
  close_time: string
  is_active: boolean
}

/**
 * Fetch the weekly schedule for a doctor, ordered by day_of_week.
 */
export async function getDoctorSchedule(doctorId: string): Promise<ScheduleDay[]> {
  try {
    const { data, error } = await supabase
      .from('doctor_schedules')
      .select('day_of_week, open_time, close_time, is_active')
      .eq('doctor_id', doctorId)
      .order('day_of_week', { ascending: true })

    if (error) {
      logger.error('doctors:getDoctorSchedule', error)
      return []
    }

    return (data || []) as ScheduleDay[]
  } catch (err) {
    logger.error('doctors:getDoctorSchedule', err)
    return []
  }
}

/**
 * Returns the appointment_id of a completed appointment with this doctor
 * that the current user has NOT yet reviewed, or null if none.
 */
export async function getReviewableAppointmentId(doctorId: string): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('id')
      .eq('doctor_id', doctorId)
      .eq('patient_id', user.id)
      .eq('status', 'completed')
      .order('start_at', { ascending: false })
      .limit(10)

    if (error || !appointments || appointments.length === 0) return null

    const apptIds = (appointments as any[]).map((a: any) => a.id)

    const { data: reviewed } = await supabase
      .from('verified_reviews')
      .select('appointment_id')
      .in('appointment_id', apptIds)

    const reviewedIds = new Set(((reviewed || []) as any[]).map((r: any) => r.appointment_id))
    const unreviewedId = apptIds.find((id: string) => !reviewedIds.has(id))
    return unreviewedId ?? null
  } catch (err) {
    logger.error('doctors:getReviewableAppointmentId', err)
    return null
  }
}

/**
 * Submit a verified review for a completed appointment.
 */
export async function submitDoctorReview(
  doctorId: string,
  appointmentId: string,
  rating: number,
  comment: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: 'No autenticado' }

    const { error } = await supabase
      .from('verified_reviews')
      .insert({
        appointment_id: appointmentId,
        patient_id: user.id,
        doctor_id: doctorId,
        rating,
        comment: comment.trim() || null,
      })

    if (error) {
      logger.error('doctors:submitReview', error)
      return { ok: false, error: error.message }
    }

    return { ok: true }
  } catch (err) {
    logger.error('doctors:submitReview', err)
    return { ok: false, error: 'Error inesperado' }
  }
}
