import { supabase } from '@/shared/lib/supabase'
import { logger } from '@/shared/lib/logger'
import type { BiometricRecord, BiometricRecordInsert } from '@/shared/types/database'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

/** Insert a new biometric reading for a patient */
export async function insertBiometricRecord(
  data: BiometricRecordInsert,
): Promise<BiometricRecord | null> {
  const { data: row, error } = await db
    .from('patient_biometric_history')
    .insert(data)
    .select()
    .single()

  if (error) {
    logger.error('insertBiometricRecord', error)
    throw error
  }
  return row as BiometricRecord
}

/** Get biometric history for a patient (own or doctor with consent) */
export async function getBiometricHistory(patientId: string): Promise<BiometricRecord[]> {
  const { data, error } = await db
    .from('patient_biometric_history')
    .select('*')
    .eq('patient_id', patientId)
    .order('recorded_at', { ascending: false })
    .limit(50)

  if (error) {
    logger.error('getBiometricHistory', error)
    return []
  }
  return (data ?? []) as BiometricRecord[]
}
