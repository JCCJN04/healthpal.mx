import { supabase } from '@/shared/lib/supabase'
import { logger } from '@/shared/lib/logger'
import type { PatientInsurance, PatientInsuranceInsert, PatientInsuranceUpdate } from '@/shared/types/database'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

// ── Aseguradoras con plantilla PDF de informe médico ──────────────────────────
// Estas coinciden con los IDs en MedicalReportTab.tsx ASEGURADORAS.
// Mantener sincronizado si se agregan nuevas plantillas.
export const ASEGURADORAS_CON_INFORME = [
  'allianz',
  'axa',
  'axa-cirugias',
  'banamex',
  'banorte',
  'bbva',
  'bupa',
  'bxplus',
  'general-salud',
  'gnp',
  'inbursa',
  'latinoamerica',
  'mapfre',
  'metlife',
  'multiva',
  'pan-american',
  'plan-seguro',
  'prevem',
  'seguros-atlas',
  'seguros-monterrey',
  'sis-nova',
  'sura',
  'telmex',
  'zurich',
] as const

// ── Lista completa de aseguradoras (perfil paciente) ──────────────────────────
// Incluye instituciones públicas + todas las privadas con o sin plantilla PDF.
export const INSURANCE_PROVIDERS = [
  // ── Sector público / gobierno ──
  'IMSS',
  'ISSSTE',
  'PEMEX (IMSS)',
  'SEDENA',
  'SEMAR',
  'Bienestar / INSABI',
  // ── Privadas con plantilla de informe ──
  'Allianz',
  'AXA Gastos Médicos',
  'AXA Cirugías',
  'Citibanamex',
  'Banorte Seguros',
  'BBVA Seguros',
  'Bupa',
  'BX+',
  'General de Salud',
  'GNP Seguros',
  'Inbursa Seguros',
  'Latinoamérica Seguros',
  'Mapfre Seguros',
  'MetLife México',
  'Multiva Seguros',
  'Pan American Life',
  'Plan Seguro',
  'Prévem',
  'Seguros Atlas',
  'Seguros Monterrey',
  'Sis Nova',
  'SURA México',
  'Telmex Salud',
  'Zurich Seguros',
  // ── Otras privadas ──
  'Cigna México',
  'HDI Seguros',
  'Monterrey New York Life',
  'Qualitas Salud',
  'Sanitas',
  'Skandia',
  'Otro',
] as const

export const HOLDER_RELATIONSHIPS = [
  { value: 'self',    label: 'Titular (yo mismo/a)' },
  { value: 'spouse',  label: 'Cónyuge' },
  { value: 'parent',  label: 'Padre / Madre' },
  { value: 'child',   label: 'Hijo/a' },
  { value: 'other',   label: 'Otro' },
]

export const COVERAGE_TYPES = [
  { value: 'individual', label: 'Individual' },
  { value: 'family',     label: 'Familiar' },
  { value: 'employer',   label: 'Por empleador' },
]

/** Patient: get own insurance records */
export async function getMyInsurances(patientId: string): Promise<PatientInsurance[]> {
  const { data, error } = await db
    .from('patient_insurances')
    .select('*')
    .eq('patient_id', patientId)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true })

  if (error) {
    logger.error('getMyInsurances', error)
    return []
  }
  return (data ?? []) as PatientInsurance[]
}

/** Patient: upsert an insurance record */
export async function upsertInsurance(
  patientId: string,
  data: Omit<PatientInsuranceInsert, 'patient_id'> & { id?: string },
): Promise<PatientInsurance | null> {
  const payload = { ...data, patient_id: patientId }

  const { data: row, error } = await db
    .from('patient_insurances')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single()

  if (error) {
    logger.error('upsertInsurance', error)
    throw error
  }
  return row as PatientInsurance
}

/** Patient: update an existing insurance record */
export async function updateInsurance(
  id: string,
  data: PatientInsuranceUpdate,
): Promise<PatientInsurance | null> {
  const { data: row, error } = await db
    .from('patient_insurances')
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    logger.error('updateInsurance', error)
    throw error
  }
  return row as PatientInsurance
}

/** Patient: delete an insurance record */
export async function deleteInsurance(id: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await db
    .from('patient_insurances')
    .delete()
    .eq('id', id)

  if (error) {
    logger.error('deleteInsurance', error)
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

/** Doctor: get patient insurances — RLS enforces share_insurance=true */
export async function getPatientInsurancesForDoctor(patientId: string): Promise<PatientInsurance[]> {
  const { data, error } = await db
    .from('patient_insurances')
    .select('*')
    .eq('patient_id', patientId)
    .order('is_primary', { ascending: false })

  if (error) {
    logger.error('getPatientInsurancesForDoctor', error)
    return []
  }
  return (data ?? []) as PatientInsurance[]
}

/** Helper: display label for a provider_name */
export function insuranceDisplayName(ins: Pick<PatientInsurance, 'provider_name' | 'provider_other'>): string {
  if (ins.provider_name === 'Otro' && ins.provider_other) return ins.provider_other
  return ins.provider_name
}

/**
 * Maps a provider_name string → ASEGURADORAS id (for linking to informe PDF).
 * Returns null if no template exists for this provider.
 */
const PROVIDER_TO_INFORME_ID: Record<string, string> = {
  'Allianz':               'allianz',
  'AXA Gastos Médicos':    'axa',
  'AXA Cirugías':          'axa-cirugias',
  'Citibanamex':           'banamex',
  'Banorte Seguros':       'banorte',
  'BBVA Seguros':          'bbva',
  'Bupa':                  'bupa',
  'BX+':                   'bxplus',
  'General de Salud':      'general-salud',
  'GNP Seguros':           'gnp',
  'Inbursa Seguros':       'inbursa',
  'Latinoamérica Seguros': 'latinoamerica',
  'Mapfre Seguros':        'mapfre',
  'MetLife México':        'metlife',
  'Multiva Seguros':       'multiva',
  'Pan American Life':     'pan-american',
  'Plan Seguro':           'plan-seguro',
  'Prévem':                'prevem',
  'Seguros Atlas':         'seguros-atlas',
  'Seguros Monterrey':     'seguros-monterrey',
  'Sis Nova':              'sis-nova',
  'SURA México':           'sura',
  'Telmex Salud':          'telmex',
  'Zurich Seguros':        'zurich',
}

export function getInformeId(providerName: string): string | null {
  return PROVIDER_TO_INFORME_ID[providerName] ?? null
}
