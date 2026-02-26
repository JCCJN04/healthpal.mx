// @ts-nocheck
import { supabase } from '@/shared/lib/supabase'
import { logger } from '@/shared/lib/logger'
import type { Database } from '@/shared/types/database'

// Type aliases for convenience
type Profile = Database['public']['Tables']['profiles']['Row']
type ProfileUpdate = Database['public']['Tables']['profiles']['Update']
type DoctorProfileInsert = Database['public']['Tables']['doctor_profiles']['Insert']
type PatientProfileInsert = Database['public']['Tables']['patient_profiles']['Insert']
type OnboardingStep = 'role' | 'basic' | 'contact' | 'details' | 'done'

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

  if (error?.code === 'PGRST116') {
    // If not found, wait 500ms and try again once (handles database trigger lag)
    await new Promise(resolve => setTimeout(resolve, 500))
    const { data: secondTry, error: secondError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (secondTry) return secondTry as Profile

    if (secondError && secondError.code !== 'PGRST116') {
      throw secondError
    }

    // Only create a fallback profile if the user's email is confirmed
    // This prevents orphaned profiles for unverified signups
    if (!user.email_confirmed_at) {
      throw new Error('Email not verified. Please confirm your email before continuing.')
    }

    // Profile still missing after email confirmation: create a baseline record
    // (safety net for trigger timing delays)
    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email,
        role: (user.user_metadata as any)?.role || 'patient',
        onboarding_completed: false,
        onboarding_step: 'role',
      } as any)
      .select('*')
      .single()

    if (insertError) {
      logger.error('Error creating profile:', insertError)
      throw insertError
    }

    return newProfile as Profile
  }

  if (error) {
    logger.error('Error fetching profile:', error)
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
    logger.error('Error updating profile:', error)
    throw error
  }

  return data
}

/**
 * Persist the current onboarding step for the logged in user
 */
export async function saveOnboardingStep(step: OnboardingStep) {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ onboarding_step: step } as any)
    .eq('id', user.id)
    .select('id, onboarding_step, onboarding_completed')
    .single()

  if (error) {
    logger.error('Error saving onboarding step:', error)
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
    logger.error('Error upserting doctor profile:', error)
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
    logger.error('Error upserting patient profile:', error)
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
    logger.error('completeOnboarding', error)
    throw error
  }

  return data
}

/**
 * Upload avatar to Supabase Storage
 *
 * Handles old avatar cleanup, sets the correct content-type,
 * and returns the public URL of the newly uploaded file.
 */
export async function uploadAvatar(userId: string, file: File) {
  logger.info('uploadAvatar:start', { userId, fileName: file.name, fileType: file.type, fileSize: file.size })

  // 1. Remove any previous avatars for this user (best-effort, don't block)
  try {
    const { data: existingFiles, error: listError } = await supabase.storage
      .from('avatars')
      .list(userId)

    if (listError) {
      logger.warn('uploadAvatar:list', listError)
    } else if (existingFiles && existingFiles.length > 0) {
      const filesToDelete = existingFiles.map((f) => `${userId}/${f.name}`)
      const { error: deleteError } = await supabase.storage.from('avatars').remove(filesToDelete)
      if (deleteError) logger.warn('uploadAvatar:delete', deleteError)
    }
  } catch (cleanupErr) {
    logger.warn('uploadAvatar:cleanup', cleanupErr)
  }

  // 2. Build a unique file path inside the user's folder
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const filePath = `${userId}/${Date.now()}.${fileExt}`

  // 3. Upload with explicit content-type and upsert safety
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, {
      contentType: file.type || 'image/jpeg',
      cacheControl: '3600',
      upsert: true,
    })

  if (uploadError) {
    logger.error('uploadAvatar:upload', { message: uploadError.message, name: (uploadError as any).name, statusCode: (uploadError as any).statusCode })
    throw uploadError
  }

  logger.info('uploadAvatar:uploaded', uploadData)

  // 4. Return the public URL
  const { data } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath)

  logger.info('uploadAvatar:publicUrl', data.publicUrl)
  return data.publicUrl
}
