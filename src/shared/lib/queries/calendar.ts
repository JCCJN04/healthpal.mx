import { supabase } from '@/shared/lib/supabase'
import type { Database } from '@/shared/types/database'
import { logger } from '@/shared/lib/logger'

export type Appointment = Database['public']['Tables']['appointments']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']

export interface AppointmentWithProfiles extends Appointment {
    patient?: Partial<Profile>
    doctor?: Partial<Profile>
}

/**
 * Get the current user's role
 */
export async function getMyRole(userId: string): Promise<'patient' | 'doctor' | 'admin' | null> {
    const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

    if (error || !data) {
        logger.error('CalendarQuery.getMyRole', error)
        return null
    }

    return data.role
}

/**
 * List appointments in a specific date range
 */
export async function listAppointmentsInRange(params: {
    userId: string
    role: 'patient' | 'doctor'
    from: string
    to: string
}): Promise<AppointmentWithProfiles[]> {
    const { userId, role, from, to } = params

    let query = supabase
        .from('appointments')
        .select(`
      *,
      patient:profiles!appointments_patient_id_fkey (id, full_name, avatar_url),
      doctor:profiles!appointments_doctor_id_fkey (id, full_name, avatar_url)
    `)
        .gte('start_at', from)
        .lt('start_at', to)

    if (role === 'patient') {
        query = query.eq('patient_id', userId)
    } else {
        query = query.eq('doctor_id', userId)
    }

    const { data, error } = await query.order('start_at', { ascending: true })

    if (error) {
        logger.error('CalendarQuery.listAppointmentsInRange', error)
        return []
    }

    return data as AppointmentWithProfiles[]
}

/**
 * Get a single appointment with details
 */
export async function getAppointmentById(id: string): Promise<AppointmentWithProfiles | null> {
    const { data, error } = await supabase
        .from('appointments')
        .select(`
      *,
      patient:profiles!appointments_patient_id_fkey (id, full_name, avatar_url, email, phone),
      doctor:profiles!appointments_doctor_id_fkey (id, full_name, avatar_url)
    `)
        .eq('id', id)
        .single()

    if (error) {
        logger.error('CalendarQuery.getAppointmentById', error)
        return null
    }

    return data as AppointmentWithProfiles
}
