// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { supabase } from '@/shared/lib/supabase'
import { logger } from '@/shared/lib/logger'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PrescriptionMedication {
  id: string          // local uuid for list key
  name: string        // generic name (required)
  brand?: string      // commercial name (optional)
  form: string        // e.g., "Tabletas", "Cápsulas"
  concentration: string  // e.g., "500 mg"
  quantity: string    // e.g., "21"
  quantity_text: string  // e.g., "Veintiún"
  instructions: string   // e.g., "1 tableta cada 8 h por 7 días"
}

export interface Prescription {
  id: string
  doctor_id: string
  patient_id: string | null
  appointment_id: string | null
  folio: string | null
  issued_at: string
  patient_name: string | null
  patient_age: string | null
  patient_sex: string | null
  patient_weight: string | null
  diagnosis: string | null
  medications: PrescriptionMedication[]
  allergies: string[]
  indications: string | null
  is_template: boolean
  template_name: string | null
  created_at: string
  updated_at: string
}

export type PrescriptionInsert = Omit<Prescription, 'id' | 'doctor_id' | 'created_at' | 'updated_at'>

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function getPrescriptions(): Promise<Prescription[]> {
  const { data, error } = await supabase
    .from('prescriptions')
    .select('*')
    .eq('is_template', false)
    .order('issued_at', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) { logger.error('getPrescriptions', error); return [] }
  return (data ?? []) as Prescription[]
}

export async function getTemplates(): Promise<Prescription[]> {
  const { data, error } = await supabase
    .from('prescriptions')
    .select('*')
    .eq('is_template', true)
    .order('template_name', { ascending: true })

  if (error) { logger.error('getTemplates', error); return [] }
  return (data ?? []) as Prescription[]
}

export async function createPrescription(input: PrescriptionInsert): Promise<Prescription | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('prescriptions')
    .insert({ ...input, doctor_id: user.id })
    .select()
    .single()

  if (error) { logger.error('createPrescription', error); return null }
  return data as Prescription
}

export async function updatePrescription(id: string, input: Partial<PrescriptionInsert>): Promise<Prescription | null> {
  const { data, error } = await supabase
    .from('prescriptions')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) { logger.error('updatePrescription', error); return null }
  return data as Prescription
}

export async function deletePrescription(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('prescriptions')
    .delete()
    .eq('id', id)

  if (error) { logger.error('deletePrescription', error); return false }
  return true
}
