import { supabase } from '@/shared/lib/supabase'
import { logger } from '@/shared/lib/logger'
import type { Database, PatientProfile } from '@/shared/types/database'

type PatientProfileInsert = Database['public']['Tables']['patient_profiles']['Insert']
type PatientProfileUpdate = Database['public']['Tables']['patient_profiles']['Update']

/**
 * Get patient profile details
 */
export async function getPatientProfile(userId: string) {
    const { data, error } = await supabase
        .from('patient_profiles')
        .select('*')
        .eq('patient_id', userId)
        .single()

    if (error) {
        // If not found, return null instead of throwing
        if (error.code === 'PGRST116') {
            return null
        }
        logger.error('getPatientProfile', error)
        throw error
    }

    return data
}

/**
 * Create or update patient profile
 */
export async function upsertPatientProfile(
    userId: string,
    data: Omit<PatientProfileInsert, 'patient_id' | 'created_at' | 'updated_at'>
) {
    const { data: result, error } = await supabase
        .from('patient_profiles')
        .upsert({
            patient_id: userId,
            ...data,
            updated_at: new Date().toISOString(),
        } as any)
        .select()
        .single()

    if (error) {
        logger.error('upsertPatientProfile', error)
        throw error
    }

    return result
}
