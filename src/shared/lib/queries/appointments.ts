// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { supabase } from '@/shared/lib/supabase'
import { logger } from '@/shared/lib/logger'

export type AppointmentMode = 'in_person' | 'video' | 'phone'
export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'

export interface Appointment {
  id: string
  patient_id: string
  doctor_id: string
  initiated_by: string | null   // patient_id = patient proposed, doctor_id = doctor proposed
  scheduled_at: string
  duration_min: number
  mode: AppointmentMode
  reason: string | null
  notes: string | null
  status: AppointmentStatus
  google_calendar_event_id: string | null
  created_at: string
  updated_at: string
}

export interface AppointmentWithDoctor extends Appointment {
  doctor_name: string | null
  doctor_avatar: string | null
}

export interface AppointmentWithPatient extends Appointment {
  patient_name: string | null
  patient_avatar: string | null
}

// ─── Create ───────────────────────────────────────────────────────────────────

/** Patient creates appointment — initiated_by = patient */
export async function createAppointment(data: {
  doctorId: string
  scheduledAt: string
  durationMin: number
  mode: AppointmentMode
  reason: string
  notes?: string
}): Promise<Appointment | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: appt, error } = await supabase
    .from('appointments')
    .insert({
      patient_id: user.id,
      doctor_id: data.doctorId,
      initiated_by: user.id,
      scheduled_at: data.scheduledAt,
      duration_min: data.durationMin,
      mode: data.mode,
      reason: data.reason,
      notes: data.notes ?? null,
      status: 'pending',
    })
    .select()
    .single()

  if (error) { logger.error('createAppointment', error); return null }
  return appt as Appointment
}

/** Doctor creates appointment for a patient — initiated_by = doctor */
export async function createAppointmentForPatient(data: {
  patientId: string
  scheduledAt: string
  durationMin: number
  mode: AppointmentMode
  reason: string
  notes?: string
}): Promise<Appointment | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: appt, error } = await supabase
    .from('appointments')
    .insert({
      patient_id: data.patientId,
      doctor_id: user.id,
      initiated_by: user.id,
      scheduled_at: data.scheduledAt,
      duration_min: data.durationMin,
      mode: data.mode,
      reason: data.reason,
      notes: data.notes ?? null,
      status: 'pending',
    })
    .select()
    .single()

  if (error) { logger.error('createAppointmentForPatient', error); return null }
  return appt as Appointment
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getAppointmentById(appointmentId: string): Promise<AppointmentWithPatient | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: appt, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', appointmentId)
    .eq('doctor_id', user.id)
    .single()

  if (error || !appt) { logger.error('getAppointmentById', error); return null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url')
    .eq('id', appt.patient_id)
    .single()

  return {
    ...appt,
    patient_name: profile?.full_name ?? null,
    patient_avatar: profile?.avatar_url ?? null,
  } as AppointmentWithPatient
}

export async function getPatientAppointments(): Promise<AppointmentWithDoctor[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: appts, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('patient_id', user.id)
    .order('scheduled_at', { ascending: false })

  if (error) { logger.error('getPatientAppointments', error); return [] }
  if (!appts?.length) return []

  const doctorIds = [...new Set(appts.map(a => a.doctor_id))]
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', doctorIds)

  const map = new Map((profiles ?? []).map(p => [p.id, p]))
  return appts.map(a => ({
    ...a,
    doctor_name: map.get(a.doctor_id)?.full_name ?? null,
    doctor_avatar: map.get(a.doctor_id)?.avatar_url ?? null,
  })) as AppointmentWithDoctor[]
}

export async function getDoctorAppointments(): Promise<AppointmentWithPatient[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: appts, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('doctor_id', user.id)
    .order('scheduled_at', { ascending: true })

  if (error) { logger.error('getDoctorAppointments', error); return [] }
  if (!appts?.length) return []

  const patientIds = [...new Set(appts.map(a => a.patient_id))]
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', patientIds)

  const map = new Map((profiles ?? []).map(p => [p.id, p]))
  return appts.map(a => ({
    ...a,
    patient_name: map.get(a.patient_id)?.full_name ?? null,
    patient_avatar: map.get(a.patient_id)?.avatar_url ?? null,
  })) as AppointmentWithPatient[]
}

/** Returns doctor's non-cancelled appointments for a given date (YYYY-MM-DD) */
export async function getDoctorAppointmentsForDate(date: string): Promise<Appointment[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const dayStart = `${date}T00:00:00`
  const dayEnd   = `${date}T23:59:59`

  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('doctor_id', user.id)
    .neq('status', 'cancelled')
    .gte('scheduled_at', dayStart)
    .lte('scheduled_at', dayEnd)

  if (error) { logger.error('getDoctorAppointmentsForDate', error); return [] }
  return (data ?? []) as Appointment[]
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateAppointmentStatus(
  appointmentId: string,
  status: AppointmentStatus
): Promise<boolean> {
  const { error } = await supabase
    .from('appointments')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', appointmentId)

  if (error) { logger.error('updateAppointmentStatus', error); return false }
  return true
}

export async function updateAppointmentCalendarEvent(
  appointmentId: string,
  googleEventId: string
): Promise<void> {
  const { error } = await supabase
    .from('appointments')
    .update({ google_calendar_event_id: googleEventId, updated_at: new Date().toISOString() })
    .eq('id', appointmentId)

  if (error) logger.error('updateAppointmentCalendarEvent', error)
}
