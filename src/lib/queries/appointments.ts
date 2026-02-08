// @ts-nocheck
import { supabase } from '../supabase'
import type { Database } from '../../types/database'

type Appointment = Database['public']['Tables']['appointments']['Row']
type AppointmentInsert = Database['public']['Tables']['appointments']['Insert']
type AppointmentUpdate = Database['public']['Tables']['appointments']['Update']
type AppointmentStatus = Database['public']['Enums']['appointment_status']

export interface AppointmentWithDetails extends Appointment {
  doctor: {
    id: string
    full_name: string | null
    avatar_url: string | null
    specialty?: string | null
    clinic_name?: string | null
  } | null
  patient: {
    id: string
    full_name: string | null
    avatar_url: string | null
  } | null
}

/**
 * Get appointment by ID with details
 */
export async function getAppointmentById(id: string, userId: string): Promise<AppointmentWithDetails | null> {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        doctor:doctor_id (
          id,
          full_name,
          avatar_url
        ),
        patient:patient_id (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('id', id)
      .or(`doctor_id.eq.${userId},patient_id.eq.${userId}`)
      .single()

    if (error) {
      console.error('Error fetching appointment:', error)
      return null
    }

    if (!data) return null

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
    console.error('Error in getAppointmentById:', err)
    return null
  }
}

/**
 * List upcoming appointments
 */
export async function listUpcomingAppointments({ userId, role }: { userId: string, role?: string }): Promise<AppointmentWithDetails[]> {
  try {
    const now = new Date().toISOString()

    let query = supabase
      .from('appointments')
      .select(`
        *,
        doctor:doctor_id (
          id,
          full_name,
          avatar_url
        ),
        patient:patient_id (
          id,
          full_name,
          avatar_url
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
      console.error('Error fetching upcoming appointments:', error)
      return []
    }

    return await enrichWithDoctorProfiles(data || [])
  } catch (err) {
    console.error('Error in listUpcomingAppointments:', err)
    return []
  }
}

/**
 * List past appointments
 */
export async function listPastAppointments({ userId, role }: { userId: string, role?: string }): Promise<AppointmentWithDetails[]> {
  try {
    const now = new Date().toISOString()

    let query = supabase
      .from('appointments')
      .select(`
        *,
        doctor:doctor_id (
          id,
          full_name,
          avatar_url
        ),
        patient:patient_id (
          id,
          full_name,
          avatar_url
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
      console.error('Error fetching past appointments:', error)
      return []
    }

    return await enrichWithDoctorProfiles(data || [])
  } catch (err) {
    console.error('Error in listPastAppointments:', err)
    return []
  }
}

/**
 * Helper to enrich appointments with doctor specialty/clinic info
 */
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
  try {
    const { data, error } = await supabase
      .from('appointments')
      .insert(payload)
      .select()
      .single()

    if (error) {
      console.error('Error creating appointment:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (err) {
    console.error('Error in createAppointment:', err)
    return { success: false, error: 'Error inesperado al crear la cita' }
  }
}

/**
 * Update appointment
 */
export async function updateAppointment(id: string, patch: AppointmentUpdate): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('appointments')
      .update(patch)
      .eq('id', id)

    if (error) {
      console.error('Error updating appointment:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('Error in updateAppointment:', err)
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
export async function getAppointmentDaysInMonth(userId: string, start: Date, end: Date): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select('start_at')
      .eq('patient_id', userId)
      .gte('start_at', start.toISOString())
      .lte('start_at', end.toISOString())
      .in('status', ['requested', 'confirmed'])

    if (error) {
      console.error('Error fetching appointment days:', error)
      return []
    }

    // Extract unique dates as YYYY-MM-DD
    const days = data.map(apt => new Date(apt.start_at).toISOString().split('T')[0])
    return [...new Set(days)]
  } catch (err) {
    console.error('Error in getAppointmentDaysInMonth:', err)
    return []
  }
}
/**
 * Get all appointments for a specific doctor on a specific date
 */
export async function getDoctorAppointments(doctorId: string, date: string): Promise<Appointment[]> {
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
      console.error('Error fetching doctor appointments:', error)
      return []
    }

    return data || []
  } catch (err) {
    console.error('Error in getDoctorAppointments:', err)
    return []
  }
}
