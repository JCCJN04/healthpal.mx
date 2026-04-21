// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { supabase } from '@/shared/lib/supabase'
import { logger } from '@/shared/lib/logger'
import type { Database } from '@/shared/types/database'
import { isDemoMode } from '@/context/DemoContext'
import { demoAppointments, demoDoctorProfile, demoPatients } from '@/data/demoData'
import { createNotification } from '@/shared/lib/queries/notifications'

type Appointment = Database['public']['Tables']['appointments']['Row']
type AppointmentInsert = Database['public']['Tables']['appointments']['Insert']
type AppointmentUpdate = Database['public']['Tables']['appointments']['Update']
type AppointmentStatus = Database['public']['Enums']['appointment_status']

const DEMO_APPOINTMENTS_KEY = 'healthpal:demo:appointments'

function getDemoAppointmentsState(): Appointment[] {
  if (typeof window === 'undefined') return demoAppointments as Appointment[]

  const raw = window.sessionStorage.getItem(DEMO_APPOINTMENTS_KEY)
  if (!raw) {
    window.sessionStorage.setItem(DEMO_APPOINTMENTS_KEY, JSON.stringify(demoAppointments))
    return demoAppointments as Appointment[]
  }

  try {
    return JSON.parse(raw) as Appointment[]
  } catch {
    window.sessionStorage.setItem(DEMO_APPOINTMENTS_KEY, JSON.stringify(demoAppointments))
    return demoAppointments as Appointment[]
  }
}

function setDemoAppointmentsState(next: Appointment[]) {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(DEMO_APPOINTMENTS_KEY, JSON.stringify(next))
}

function getDemoAppointmentDetailsState(): AppointmentWithDetails[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return getDemoAppointmentsState().map((appointment: any) => {
    const patient = demoPatients.find((p) => p.id === appointment.patient_id)
    return {
      ...appointment,
      doctor: {
        id: demoDoctorProfile.id,
        full_name: demoDoctorProfile.full_name,
        avatar_url: demoDoctorProfile.avatar_url,
        email: demoDoctorProfile.email,
        specialty: 'Medicina General',
        clinic_name: 'Healthpal Demo Clinic',
      },
      patient: patient
        ? {
            id: patient.id,
            full_name: patient.full_name,
            avatar_url: patient.avatar_url,
            email: patient.email,
          }
        : null,
    }
  }) as AppointmentWithDetails[]
}

export function getDemoAppointmentsForCalendar() {
  return getDemoAppointmentsState()
}

function sanitizeAppointmentInsertPayload(payload: AppointmentInsert): AppointmentInsert {
  return { ...payload }
}

function sanitizeAppointmentUpdatePayload(payload: AppointmentUpdate): AppointmentUpdate {
  return { ...payload }
}

export interface AppointmentWithDetails extends Appointment {
  doctor: {
    id: string
    full_name: string | null
    avatar_url: string | null
    email?: string | null
    specialty?: string | null
    clinic_name?: string | null
  } | null
  patient: {
    id: string
    full_name: string | null
    avatar_url: string | null
    email?: string | null
  } | null
}

/**
 * Get appointment by ID with details
 */
export async function getAppointmentById(id: string, userId: string): Promise<AppointmentWithDetails | null> {
  if (isDemoMode()) {
    const demo = getDemoAppointmentDetailsState().find((apt) => apt.id === id)
    if (!demo) return null
    if (demo.doctor_id !== userId && demo.patient_id !== userId) return null
    return demo as AppointmentWithDetails
  }

  try {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        doctor:doctor_id (
          id,
          full_name,
          avatar_url,
          email
        ),
        patient:patient_id (
          id,
          full_name,
          avatar_url,
          email
        )
      `)
      .eq('id', id)
      .or(`doctor_id.eq.${userId},patient_id.eq.${userId}`)
      .single()

    if (error) {
      logger.error('getAppointmentById', error)
      return null
    }

    if (!data) return null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const appointment = data as any

    // Fetch doctor specialty
    if (appointment.doctor?.id) {
      const { data: doctorProfile } = await supabase
        .from('doctor_profiles')
        .select('specialty, clinic_name')
        .eq('doctor_id', appointment.doctor.id)
        .single()

      return {
        ...appointment,
        doctor: {
          ...appointment.doctor,
          specialty: doctorProfile?.specialty || null,
          clinic_name: doctorProfile?.clinic_name || null,
        },
      } as AppointmentWithDetails
    }

    return data as AppointmentWithDetails
  } catch (err) {
    logger.error('getAppointmentById', err)
    return null
  }
}

/**
 * List upcoming appointments
 */
export async function listUpcomingAppointments({ userId, role }: { userId: string, role?: string }): Promise<AppointmentWithDetails[]> {
  if (isDemoMode()) {
    const now = new Date().toISOString()
    return getDemoAppointmentDetailsState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((apt: any) => apt.start_at >= now)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((apt: any) => {
        if (role === 'doctor') return apt.doctor_id === userId
        if (role === 'patient') return apt.patient_id === userId
        return apt.doctor_id === userId || apt.patient_id === userId
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .sort((a: any, b: any) => a.start_at.localeCompare(b.start_at)) as AppointmentWithDetails[]
  }

  try {
    const now = new Date().toISOString()

    let query = supabase
      .from('appointments')
      .select(`
        *,
        doctor:doctor_id (
          id,
          full_name,
          avatar_url,
          email
        ),
        patient:patient_id (
          id,
          full_name,
          avatar_url,
          email
        )
      `)
      .gte('start_at', now)
      .in('status', ['requested', 'confirmed'])
      .order('start_at', { ascending: true })

    if (role === 'doctor') {
      query = query.eq('doctor_id', userId)
    } else if (role === 'patient') {
      query = query.eq('patient_id', userId)
    } else {
      query = query.or(`doctor_id.eq.${userId},patient_id.eq.${userId}`)
    }

    const { data, error } = await query

    if (error) {
      logger.error('listUpcomingAppointments', error)
      return []
    }

    return await enrichWithDoctorProfiles(data || [])
  } catch (err) {
    logger.error('listUpcomingAppointments', err)
    return []
  }
}

/**
 * List past appointments
 */
export async function listPastAppointments({ userId, role }: { userId: string, role?: string }): Promise<AppointmentWithDetails[]> {
  if (isDemoMode()) {
    const now = new Date().toISOString()
    return getDemoAppointmentDetailsState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((apt: any) => apt.start_at < now || ['completed', 'cancelled', 'rejected', 'no_show'].includes(apt.status))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((apt: any) => {
        if (role === 'doctor') return apt.doctor_id === userId
        if (role === 'patient') return apt.patient_id === userId
        return apt.doctor_id === userId || apt.patient_id === userId
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .sort((a: any, b: any) => b.start_at.localeCompare(a.start_at)) as AppointmentWithDetails[]
  }

  try {
    const now = new Date().toISOString()

    let query = supabase
      .from('appointments')
      .select(`
        *,
        doctor:doctor_id (
          id,
          full_name,
          avatar_url,
          email
        ),
        patient:patient_id (
          id,
          full_name,
          avatar_url,
          email
        )
      `)
      .order('start_at', { ascending: false })

    if (role === 'doctor') {
      query = query.eq('doctor_id', userId)
    } else if (role === 'patient') {
      query = query.eq('patient_id', userId)
    } else {
      query = query.or(`doctor_id.eq.${userId},patient_id.eq.${userId}`)
    }

    // Include appointments that are in the past OR have a "terminal" status (completed, cancelled, rejected, no_show)
    query = query.or(`start_at.lt.${now},status.in.(completed,cancelled,rejected,no_show)`)

    const { data, error } = await query

    if (error) {
      logger.error('listPastAppointments', error)
      return []
    }

    return await enrichWithDoctorProfiles(data || [])
  } catch (err) {
    logger.error('listPastAppointments', err)
    return []
  }
}

/**
 * Helper to enrich appointments with doctor specialty/clinic info
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function enrichWithDoctorProfiles(appointments: any[]): Promise<AppointmentWithDetails[]> {
  const doctorIds = [...new Set(appointments.map(a => a.doctor_id).filter(Boolean))]

  if (doctorIds.length === 0) return appointments as AppointmentWithDetails[]

  const { data: profiles } = await supabase
    .from('doctor_profiles')
    .select('doctor_id, specialty, clinic_name')
    .in('doctor_id', doctorIds)

  const profileMap = (profiles || []).reduce((acc, p) => {
    acc[p.doctor_id] = p
    return acc
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }, {} as Record<string, any>)

  return appointments.map(apt => ({
    ...apt,
    doctor: apt.doctor ? {
      ...apt.doctor,
      specialty: profileMap[apt.doctor_id]?.specialty || null,
      clinic_name: profileMap[apt.doctor_id]?.clinic_name || null,
    } : null
  })) as AppointmentWithDetails[]
}

/**
 * Create appointment
 */
export async function createAppointment(payload: AppointmentInsert): Promise<{ success: boolean; data?: Appointment; error?: string }> {
  if (isDemoMode()) {
    const now = new Date().toISOString()
    const created = {
      id: crypto.randomUUID(),
      created_at: now,
      updated_at: now,
      status: payload.status || 'requested',
      mode: payload.mode || 'in_person',
      location_text: payload.location_text || null,
      location: payload.location || null,
      created_by: payload.created_by,
      doctor_id: payload.doctor_id,
      patient_id: payload.patient_id,
      start_at: payload.start_at,
      end_at: payload.end_at,
    } as Appointment

    const current = getDemoAppointmentsState()
    setDemoAppointmentsState([created, ...current])

    return {
      success: true,
      data: created,
    }
  }

  try {
    const safePayload = sanitizeAppointmentInsertPayload(payload)
    const { data, error } = await supabase
      .from('appointments')
      .insert(safePayload)
      .select()
      .single()

    if (error) {
      logger.error('createAppointment', error)
      return { success: false, error: error.message }
    }

    // Notify doctor of new appointment request (DB trigger handles this too, but
    // calling from client ensures delivery in case the trigger is unavailable)
    if (data?.doctor_id) {
      const startAt = data.start_at
        ? new Date(data.start_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })
        : ''
      createNotification({
        user_id: data.doctor_id,
        type: 'appointment_requested',
        title: 'Nueva solicitud de cita',
        body: `Un paciente quiere una cita el ${startAt}`,
        entity_table: 'appointments',
        entity_id: data.id,
      }).catch(e => logger.warn('createAppointment:notify', e))
    }

    return { success: true, data }
  } catch (err) {
    logger.error('createAppointment', err)
    return { success: false, error: 'Error inesperado al crear la cita' }
  }
}

/**
 * Update appointment
 */
export async function updateAppointment(id: string, patch: AppointmentUpdate): Promise<{ success: boolean; error?: string }> {
  if (isDemoMode()) {
    const current = getDemoAppointmentsState()
    const exists = current.some((apt) => apt.id === id)
    if (!exists) {
      return { success: false, error: 'Cita no encontrada en demo' }
    }

    const updated = current.map((apt) => {
      if (apt.id !== id) return apt
      return {
        ...apt,
        ...patch,
        updated_at: new Date().toISOString(),
      }
    }) as Appointment[]

    setDemoAppointmentsState(updated)
    logger.info('demo:updateAppointment', { id, patch })
    return { success: true }
  }

  try {
    const safePatch = sanitizeAppointmentUpdatePayload(patch)

    // Fetch current appointment before update to detect status changes
    let prevStatus: string | null = null
    if (patch.status) {
      const { data: current } = await supabase
        .from('appointments')
        .select('status, doctor_id, patient_id, start_at, created_by')
        .eq('id', id)
        .single()
      prevStatus = current?.status ?? null

      // Send notification if status actually changed (DB trigger handles this too)
      if (current && patch.status !== prevStatus) {
        const startAt = current.start_at
          ? new Date(current.start_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })
          : ''

        const notificationMap: Record<string, { userId: string; type: string; title: string; body: string }> = {
          confirmed: {
            userId: current.patient_id,
            type: 'appointment_confirmed',
            title: 'Cita confirmada',
            body: `Tu cita del ${startAt} fue confirmada.`,
          },
          rejected: {
            userId: current.patient_id,
            type: 'appointment_rejected',
            title: 'Solicitud rechazada',
            body: `Tu solicitud de cita del ${startAt} no fue aceptada.`,
          },
          completed: {
            userId: current.patient_id,
            type: 'appointment_completed',
            title: 'Cita completada — deja tu reseña',
            body: `¿Cómo fue tu consulta del ${startAt}? Comparte tu experiencia.`,
          },
          cancelled: {
            userId: current.created_by === current.patient_id ? current.doctor_id : current.patient_id,
            type: 'appointment_cancelled',
            title: 'Cita cancelada',
            body: `La cita del ${startAt} fue cancelada.`,
          },
        }

        const notif = notificationMap[patch.status as string]
        if (notif) {
          createNotification({
            user_id: notif.userId,
            type: notif.type,
            title: notif.title,
            body: notif.body,
            entity_table: 'appointments',
            entity_id: id,
          }).catch(e => logger.warn('updateAppointment:notify', e))
        }
      }
    }

    const { error } = await supabase
      .from('appointments')
      .update(safePatch)
      .eq('id', id)

    if (error) {
      logger.error('updateAppointment', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    logger.error('updateAppointment', err)
    return { success: false, error: 'Error inesperado al actualizar la cita' }
  }
}

/**
 * Cancel appointment
 */
export async function cancelAppointment(id: string): Promise<{ success: boolean; error?: string }> {
  return updateAppointment(id, { status: 'cancelled' })
}

/**
 * Compatibility: updateAppointmentStatus (old name)
 */
export async function updateAppointmentStatus(id: string, status: AppointmentStatus) {
  return updateAppointment(id, { status })
}

/**
 * Compatibility: getUpcomingAppointments (old name)
 */
export async function getUpcomingAppointments(userId: string) {
  return listUpcomingAppointments({ userId })
}

/**
 * Compatibility: getPastAppointments (old name)
 */
export async function getPastAppointments(userId: string) {
  return listPastAppointments({ userId })
}
/**
 * Get days with appointments in a month
 */
export async function getAppointmentDaysInMonth(userId: string, start: Date, end: Date, role: 'patient' | 'doctor' = 'patient'): Promise<string[]> {
  if (isDemoMode()) {
    const days = getDemoAppointmentDetailsState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((apt: any) => {
        if (role === 'doctor') return apt.doctor_id === userId
        return apt.patient_id === userId
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((apt: any) => {
        const startAt = new Date(apt.start_at)
        return startAt >= start && startAt <= end && ['requested', 'confirmed'].includes(apt.status)
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((apt: any) => new Date(apt.start_at).toISOString().split('T')[0])

    return [...new Set(days)]
  }

  try {
    let query = supabase
      .from('appointments')
      .select('start_at')
      .gte('start_at', start.toISOString())
      .lte('start_at', end.toISOString())
      .in('status', ['requested', 'confirmed'])

    query = role === 'doctor'
      ? query.eq('doctor_id', userId)
      : query.eq('patient_id', userId)

    const { data, error } = await query

    if (error) {
      logger.error('getAppointmentDaysInMonth', error)
      return []
    }

    // Extract unique dates as YYYY-MM-DD
    const days = data.map(apt => new Date(apt.start_at).toISOString().split('T')[0])
    return [...new Set(days)]
  } catch (err) {
    logger.error('getAppointmentDaysInMonth', err)
    return []
  }
}

/**
 * Get a lightweight snapshot of patients for a doctor (distinct patients + last interaction)
 */
export async function getDoctorPatientsSnapshot(doctorId: string): Promise<{ patient_id: string, last_interaction: string }[]> {
  if (isDemoMode()) {
    const rows = getDemoAppointmentsState()
      .filter((apt) => apt.doctor_id === doctorId)
      .sort((a, b) => b.start_at.localeCompare(a.start_at))

    const map = new Map<string, string>()
    rows.forEach((row) => {
      if (!map.has(row.patient_id)) {
        map.set(row.patient_id, row.start_at)
      }
    })

    return Array.from(map.entries()).map(([patient_id, last_interaction]) => ({ patient_id, last_interaction }))
  }

  try {
    const { data, error } = await supabase
      .from('appointments')
      .select('patient_id,start_at')
      .eq('doctor_id', doctorId)
      .not('patient_id', 'is', null)
      .order('start_at', { ascending: false })
      .limit(200)

    if (error) {
      logger.error('getDoctorPatientsSnapshot', error)
      return []
    }

    const map = new Map<string, string>()
      ; (data || []).forEach((row) => {
        if (!row.patient_id) return
        if (!map.has(row.patient_id)) {
          map.set(row.patient_id, row.start_at)
        }
      })

    return Array.from(map.entries()).map(([patient_id, last_interaction]) => ({ patient_id, last_interaction }))
  } catch (err) {
    logger.error('getDoctorPatientsSnapshot', err)
    return []
  }
}
/**
 * Get all appointments for a specific doctor on a specific date
 */
export async function getDoctorAppointments(doctorId: string, date: string): Promise<Appointment[]> {
  if (isDemoMode()) {
    return getDemoAppointmentsState()
      .filter((apt) => apt.doctor_id === doctorId)
      .filter((apt) => apt.start_at.startsWith(date)) as Appointment[]
  }

  try {
    const startOfDay = new Date(`${date}T00:00:00Z`).toISOString()
    const endOfDay = new Date(`${date}T23:59:59Z`).toISOString()

    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('doctor_id', doctorId)
      .gte('start_at', startOfDay)
      .lte('start_at', endOfDay)
      .in('status', ['requested', 'confirmed'])

    if (error) {
      logger.error('getDoctorAppointments', error)
      return []
    }

    return data || []
  } catch (err) {
    logger.error('getDoctorAppointments', err)
    return []
  }
}

/**
 * Global search across appointments limited to the current user's visibility
 */
export async function searchAppointments(
  term: string,
  userId: string,
  role: 'doctor' | 'patient' | undefined,
  limit = 50
): Promise<AppointmentWithDetails[]> {
  if (!term.trim() || !userId) return []

  if (isDemoMode()) {
    const termLower = term.trim().toLowerCase()
    return getDemoAppointmentDetailsState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((apt: any) => {
        if (role === 'doctor') return apt.doctor_id === userId
        if (role === 'patient') return apt.patient_id === userId
        return apt.doctor_id === userId || apt.patient_id === userId
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((apt: any) => {
        const doctorMatch = apt.doctor?.full_name?.toLowerCase().includes(termLower)
        const patientMatch = apt.patient?.full_name?.toLowerCase().includes(termLower)
        const statusMatch = apt.status?.toLowerCase().includes(termLower)
        return Boolean(doctorMatch || patientMatch || statusMatch)
      })
      .slice(0, limit) as AppointmentWithDetails[]
  }

  try {
    let query = supabase
      .from('appointments')
      .select(`
        *,
        doctor:doctor_id (
          id,
          full_name,
          avatar_url,
          email
        ),
        patient:patient_id (
          id,
          full_name,
          avatar_url,
          email
        )
      `)
      .order('start_at', { ascending: false })
      .limit(limit)

    if (role === 'doctor') {
      query = query.eq('doctor_id', userId)
    } else if (role === 'patient') {
      query = query.eq('patient_id', userId)
    } else {
      query = query.or(`doctor_id.eq.${userId},patient_id.eq.${userId}`)
    }

    const { data, error } = await query

    if (error) {
      logger.error('searchAppointments', error)
      return []
    }

    const enriched = await enrichWithDoctorProfiles(data || [])
    const termLower = term.trim().toLowerCase()

    // Client-side refinement based on non-sensitive, still-available fields.
    return enriched.filter((apt) => {
      const doctorMatch = apt.doctor?.full_name?.toLowerCase().includes(termLower)
      const patientMatch = apt.patient?.full_name?.toLowerCase().includes(termLower)
      const statusMatch = apt.status?.toLowerCase().includes(termLower)

      return Boolean(doctorMatch || patientMatch || statusMatch)
    })
  } catch (err) {
    logger.error('searchAppointments', err)
    return []
  }
}
