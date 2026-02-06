// @ts-nocheck
import { supabase } from '../supabase'
import type { Database } from '../../types/database'

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
      console.error('Error fetching doctor profile:', profileError)
      return null
    }

    const { data: doctorProfile, error: doctorError } = await supabase
      .from('doctor_profiles')
      .select('*')
      .eq('doctor_id', doctorId)
      .single()

    if (doctorError && doctorError.code !== 'PGRST116') {
      console.error('Error fetching doctor_profile:', doctorError)
    }

    return {
      ...(profile as any),
      doctor_profile: doctorProfile || null,
    }
  } catch (err) {
    console.error('Error in getDoctorById:', err)
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
      console.error('Error fetching doctors:', profilesError)
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
    console.error('Error in listDoctors:', err)
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
      console.error('Error searching doctors:', profilesError)
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
    console.error('Error in searchDoctors:', err)
    return []
  }
}

/**
 * Get doctors linked to a patient (care team)
 */
export async function getPatientDoctors(patientId: string): Promise<DoctorWithProfile[]> {
  try {
    const { data: careLinks, error: careLinksError } = await supabase
      .from('care_links')
      .select('doctor_id')
      .eq('patient_id', patientId)
      .eq('status', 'active')

    if (careLinksError) {
      console.error('Error fetching care links:', careLinksError)
      return []
    }

    if (!careLinks || careLinks.length === 0) {
      return []
    }

    const doctorIds = careLinks.map(cl => cl.doctor_id)

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', doctorIds)
      .eq('role', 'doctor')

    if (profilesError) {
      console.error('Error fetching doctor profiles:', profilesError)
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
    console.error('Error in getPatientDoctors:', err)
    return []
  }
}
