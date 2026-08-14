import { supabase } from '@/shared/lib/supabase'
import { auditLog } from '@/shared/lib/audit'

// Component-facing interface — JSONB fields typed loosely for flexibility
export interface ClinicalHistoryData {
    id?: string
    patient_id: string
    allergies: string | null
    referral_source: string | null
    consultation_reason: string | null
    patient_observations: string | null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    family_history: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pathological_history: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    non_pathological_history: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gynecological_history: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    psychiatric_history: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    developmental_history: any
    systems_review: string | null
    // NOM-004 §7.1.5–12 — secciones finales
    current_illness: string | null
    physical_examination: string | null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    initial_diagnoses: any
    prognosis: string | null
    initial_plan: string | null
    last_edited_by?: string | null
    updated_at?: string | null
}

export async function getClinicalHistory(patientId: string): Promise<ClinicalHistoryData | null> {
    const { data, error } = await supabase
        .from('clinical_histories')
        .select('*')
        .eq('patient_id', patientId)
        .maybeSingle()

    if (error) throw error
    if (data) {
        // NOM-024 §6.6: log read access to clinical history
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        auditLog.readClinicalHistory((data as any).id ?? patientId, patientId)
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data as any) as ClinicalHistoryData | null
}

export async function upsertClinicalHistory(history: ClinicalHistoryData): Promise<ClinicalHistoryData> {

    const { id: _id, updated_at: _ts, ...payload } = history

    const { data, error } = await supabase
        .from('clinical_histories')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .upsert(payload as any, { onConflict: 'patient_id' })
        .select()
        .single()

    if (error) throw error
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data as any) as ClinicalHistoryData
}
