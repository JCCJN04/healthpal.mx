import { supabase } from '@/shared/lib/supabase'
import { logger } from '@/shared/lib/logger'

export type StudyTipo =
  'laboratorio' | 'radiografia' | 'tomografia' | 'ultrasonido' | 'resonancia' | 'ecg' | 'otro'

export interface StudyResult {
  id: string
  appointment_id: string
  doctor_id: string
  patient_id: string
  tipo: StudyTipo
  nombre: string | null
  interpretacion: string
  fecha_estudio: string | null
  created_at: string
  updated_at: string
}

export interface StudyResultInput {
  appointment_id: string
  patient_id: string
  tipo: StudyTipo
  nombre?: string
  interpretacion: string
  fecha_estudio?: string | null
}

export const STUDY_TIPO_LABEL: Record<StudyTipo, string> = {
  laboratorio: 'Laboratorio',
  radiografia: 'Radiografía',
  tomografia: 'Tomografía',
  ultrasonido: 'Ultrasonido',
  resonancia: 'Resonancia magnética',
  ecg: 'ECG / Electrocardiograma',
  otro: 'Otro',
}

export const STUDY_TIPO_COLOR: Record<StudyTipo, string> = {
  laboratorio: 'bg-blue-50 text-blue-700 border-blue-100',
  radiografia: 'bg-amber-50 text-amber-700 border-amber-100',
  tomografia: 'bg-violet-50 text-violet-700 border-violet-100',
  ultrasonido: 'bg-teal-50 text-teal-700 border-teal-100',
  resonancia: 'bg-purple-50 text-purple-700 border-purple-100',
  ecg: 'bg-red-50 text-red-700 border-red-100',
  otro: 'bg-gray-100 text-gray-600 border-gray-200',
}

export async function getStudyResultsByAppointment(appointmentId: string): Promise<StudyResult[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('appointment_study_results')
    .select('*')
    .eq('appointment_id', appointmentId)
    .order('created_at', { ascending: true })

  if (error) {
    logger.error('getStudyResultsByAppointment', error)
    return []
  }
  return (data ?? []) as StudyResult[]
}

export async function createStudyResult(input: StudyResultInput): Promise<StudyResult | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('appointment_study_results')
    .insert({
      appointment_id: input.appointment_id,
      doctor_id: user.id,
      patient_id: input.patient_id,
      tipo: input.tipo,
      nombre: input.nombre?.trim() || null,
      interpretacion: input.interpretacion.trim(),
      fecha_estudio: input.fecha_estudio || null,
    })
    .select()
    .single()

  if (error) {
    logger.error('createStudyResult', error)
    return null
  }
  return data as StudyResult
}

export async function deleteStudyResult(id: string): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('appointment_study_results').delete().eq('id', id)

  if (error) {
    logger.error('deleteStudyResult', error)
    return false
  }
  return true
}
