// @ts-nocheck
import { supabase } from '../supabase'
import type { Database } from '../../types/database'

type Appointment = Database['public']['Tables']['appointments']['Row']
type AppointmentStatus = Database['public']['Enums']['appointment_status']

// Extended appointment with doctor details
export interface AppointmentWithDoctor extends Appointment {
  doctor_profile?: {
    id: string
    full_name: string | null
    avatar_url: string | null
    specialty: string | null
    clinic_name: string | null
  } | null
}

// Extended appointment with doctor and patient details
export interface AppointmentWithDetails extends Appointment {
  doctor: {
    id: string
    full_name: string | null
    avatar_url: string | null
    specialty: string | null
    clinic_name: string | null
  } | null
  patient: {
    id: string
    full_name: string | null
    avatar_url: string | null
  } | null
}

/**
 * Get appointment by ID with doctor and patient details
 * OPTIMIZED: Reduced redundant query - doctor profile fetched directly
 */
export async function getAppointmentById(id: string): Promise<AppointmentWithDetails | null> {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        id,
        doctor_id,
        patient_id,
        reason,
        start_at,
        end_at,
        status,
        visit_mode,
        notes,
        created_at,
        updated_at,
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
      .single()

    if (error) {
      console.error('Error fetching appointment:', error)
      return null
    }

    if (!data) return null

    const appointment = data as any

    // Fetch doctor specialty only if doctor exists
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
 * Get upcoming appointments for a user
 * OPTIMIZED: Fixed N+1 query - batch fetch doctor profiles
 */
export async function getUpcomingAppointments(userId: string): Promise<AppointmentWithDetails[]> {
  try {
    performance.mark('appointments-fetch-start')
    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        id,
        doctor_id,
        patient_id,
        reason,
        start_at,
        end_at,
        status,
        visit_mode,
        notes,
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
      .or(`doctor_id.eq.${userId},patient_id.eq.${userId}`)
      .gte('start_at', now)
      .in('status', ['requested', 'confirmed'])
      .order('start_at', { ascending: true })
      .limit(10)

    if (error) {
      console.error('Error fetching upcoming appointments:', error)
      return []
    }

    if (!data || data.length === 0) {
      performance.mark('appointments-fetch-end')
      performance.measure('appointments-total', 'appointments-fetch-start', 'appointments-fetch-end')
      return []
    }

    // OPTIMIZATION: Batch fetch all doctor profiles in ONE query instead of N queries
    const doctorIds = [...new Set(
      (data as any[])
        .map(apt => apt.doctor?.id)
        .filter(Boolean)
    )]

    let doctorProfilesMap: Record<string, any> = {}

    if (doctorIds.length > 0) {
      performance.mark('doctor-profiles-fetch-start')
      const { data: doctorProfiles } = await supabase
        .from('doctor_profiles')
        .select('doctor_id, specialty, clinic_name')
        .in('doctor_id', doctorIds)

      performance.mark('doctor-profiles-fetch-end')
      performance.measure('doctor-profiles-fetch', 'doctor-profiles-fetch-start', 'doctor-profiles-fetch-end')

      // Create a map for O(1) lookup
      if (doctorProfiles) {
        doctorProfilesMap = doctorProfiles.reduce((acc, profile) => {
          acc[profile.doctor_id] = profile
          return acc
        }, {} as Record<string, any>)
      }
    }

    // Merge doctor profiles with appointments
    const enrichedData = (data as any[]).map((apt) => {
      if (apt.doctor) {
        const doctorProfile = doctorProfilesMap[apt.doctor.id]
        return {
          ...apt,
          doctor: {
            ...apt.doctor,
            specialty: doctorProfile?.specialty || null,
            clinic_name: doctorProfile?.clinic_name || null,
          },
        }
      }
      return apt
    })

    performance.mark('appointments-fetch-end')
    performance.measure('appointments-total', 'appointments-fetch-start', 'appointments-fetch-end')
    const totalTime = performance.getEntriesByName('appointments-total')[0]?.duration
    const doctorProfileTime = performance.getEntriesByName('doctor-profiles-fetch')[0]?.duration || 0
    console.log(`✓ Appointments fetched: ${enrichedData.length} (${Math.round(totalTime)}ms total, ${Math.round(doctorProfileTime)}ms doctor profiles)`)

    return enrichedData as AppointmentWithDetails[]
  } catch (err) {
    console.error('Error in getUpcomingAppointments:', err)
    return []
  }
}

/**
 * Get past appointments for a user
 * OPTIMIZED: Fixed N+1 query - batch fetch doctor profiles
 */
export async function getPastAppointments(userId: string): Promise<AppointmentWithDetails[]> {
  try {
    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        id,
        doctor_id,
        patient_id,
        reason,
        start_at,
        end_at,
        status,
        visit_mode,
        notes,
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
      .or(`doctor_id.eq.${userId},patient_id.eq.${userId}`)
      .lt('end_at', now)
      .order('start_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Error fetching past appointments:', error)
      return []
    }

    if (!data || data.length === 0) return []

    // Batch fetch doctor profiles
    const doctorIds = [...new Set(
      (data as any[])
        .map(apt => apt.doctor?.id)
        .filter(Boolean)
    )]

    let doctorProfilesMap: Record<string, any> = {}

    if (doctorIds.length > 0) {
      const { data: doctorProfiles } = await supabase
        .from('doctor_profiles')
        .select('doctor_id, specialty, clinic_name')
        .in('doctor_id', doctorIds)

      if (doctorProfiles) {
        doctorProfilesMap = doctorProfiles.reduce((acc, profile) => {
          acc[profile.doctor_id] = profile
          return acc
        }, {} as Record<string, any>)
      }
    }

    // Merge doctor profiles
    const enrichedData = (data as any[]).map((apt) => {
      if (apt.doctor) {
        const doctorProfile = doctorProfilesMap[apt.doctor.id]
        return {
          ...apt,
          doctor: {
            ...apt.doctor,
            specialty: doctorProfile?.specialty || null,
            clinic_name: doctorProfile?.clinic_name || null,
          },
        }
      }
      return apt
    })

    return enrichedData as AppointmentWithDetails[]
  } catch (err) {
    console.error('Error in getPastAppointments:', err)
    return []
  }
}

/**
 * Get appointments for a specific date range
 */
export async function getAppointmentsByDateRange(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<AppointmentWithDetails[]> {
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
      .or(`doctor_id.eq.${userId},patient_id.eq.${userId}`)
      .gte('start_at', startDate.toISOString())
      .lte('start_at', endDate.toISOString())
      .order('start_at', { ascending: true })

    if (error) {
      console.error('Error fetching appointments by date range:', error)
      return []
    }

    // Enrich with doctor specialties
    const enrichedData = await Promise.all(
      (data || []).map(async (apt: any) => {
        if (apt.doctor) {
          const { data: doctorProfile } = await supabase
            .from('doctor_profiles')
            .select('specialty, clinic_name')
            .eq('doctor_id', apt.doctor.id)
            .single()

          return {
            ...apt,
            doctor: {
              ...apt.doctor,
              specialty: doctorProfile?.specialty || null,
              clinic_name: doctorProfile?.clinic_name || null,
            },
          }
        }
        return apt
      })
    )

    return enrichedData as AppointmentWithDetails[]
  } catch (err) {
    console.error('Error in getAppointmentsByDateRange:', err)
    return []
  }
}

/**
 * Update appointment status (cancel, confirm, etc.)
 */
export async function updateAppointmentStatus(
  appointmentId: string,
  status: AppointmentStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('appointments')
      .update({ status } as any)
      .eq('id', appointmentId)

    if (error) {
      console.error('Error updating appointment status:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('Error in updateAppointmentStatus:', err)
    return { success: false, error: 'Error inesperado al actualizar la cita' }
  }
}

/**
 * Create a new appointment
 */
export async function createAppointment(
  appointment: Database['public']['Tables']['appointments']['Insert']
): Promise<{ success: boolean; data?: Appointment; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .insert(appointment as any)
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
 * Get distinct dates within a month that have appointments
 */
export async function getAppointmentDaysInMonth(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select('start_at')
      .or(`doctor_id.eq.${userId},patient_id.eq.${userId}`)
      .gte('start_at', startDate.toISOString())
      .lte('start_at', endDate.toISOString())
      .not('status', 'eq', 'cancelled')

    if (error) {
      console.error('Error fetching appointment days:', error)
      return []
    }

    // Extract unique YYYY-MM-DD dates
    const dates = data.map(apt => apt.start_at.split('T')[0])
    return [...new Set(dates)]
  } catch (err) {
    console.error('Error in getAppointmentDaysInMonth:', err)
    return []
  }
}
