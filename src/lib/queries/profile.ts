import { supabase } from '../supabase'
import type { Database } from '../../types/database'

// Type aliases for convenience
type Profile = Database['public']['Tables']['profiles']['Row']
type ProfileUpdate = Database['public']['Tables']['profiles']['Update']
type DoctorProfileInsert = Database['public']['Tables']['doctor_profiles']['Insert']
type PatientProfileInsert = Database['public']['Tables']['patient_profiles']['Insert']

/**
 * Get current user's profile with extended info
 */
export async function getMyProfile(): Promise<Profile> {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) {
    console.error('Error fetching profile:', error)
    throw error
  }

  if (!profile) {
    throw new Error('Profile not found')
  }

  return profile
}

/**
 * Get doctor profile (extended)
 */
export async function getDoctorProfile(doctorId: string) {
  const { data, error } = await supabase
    .from('doctor_profiles')
    .select('*')
    .eq('doctor_id', doctorId)
    .single()

  if (error && error.code !== 'PGRST116') throw error // PGRST116 = not found

  return data
}

/**
 * Get patient profile (extended)
 */
export async function getPatientProfile(patientId: string) {
  const { data, error } = await supabase
    .from('patient_profiles')
    .select('*')
    .eq('patient_id', patientId)
    .single()

  if (error && error.code !== 'PGRST116') throw error

  return data
}

/**
 * Update main profile
 */
export async function updateMyProfile(updates: ProfileUpdate) {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(updates as any)
    .eq('id', user.id)
    .select()
    .single()

  if (error) {
    console.error('Error updating profile:', error)
    throw error
  }

  return data
}

/**
 * Create or update doctor profile
 */
export async function upsertDoctorProfile(
  doctorId: string,
  doctorData: Omit<DoctorProfileInsert, 'doctor_id'>
) {
  const { data, error } = await supabase
    .from('doctor_profiles')
    .upsert({
      doctor_id: doctorId,
      ...doctorData,
    } as any)
    .select()
    .single()

  if (error) {
    console.error('Error upserting doctor profile:', error)
    throw error
  }

  return data
}

/**
 * Create or update patient profile
 */
export async function upsertPatientProfile(
  patientId: string,
  patientData: Omit<PatientProfileInsert, 'patient_id'>
) {
  const { data, error } = await supabase
    .from('patient_profiles')
    .upsert({
      patient_id: patientId,
      ...patientData,
    } as any)
    .select()
    .single()

  if (error) {
    console.error('Error upserting patient profile:', error)
    throw error
  }

  return data
}

/**
 * Mark onboarding as completed
 */
export async function completeOnboarding() {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({
      onboarding_completed: true,
      onboarding_step: null,
    } as any)
    .eq('id', user.id)
    .select()
    .single()

  if (error) {
    console.error('Error completing onboarding:', error)
    throw error
  }

  return data
}

/**
 * Upload avatar to Supabase Storage
 */
export async function uploadAvatar(userId: string, file: File) {
  const fileExt = file.name.split('.').pop()
  const fileName = `${userId}/${Date.now()}.${fileExt}`
  const filePath = fileName

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file)

  if (uploadError) {
    console.error('Error uploading avatar:', uploadError)
    throw uploadError
  }

  const { data } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath)

  return data.publicUrl
}
