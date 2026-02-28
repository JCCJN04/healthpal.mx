import { supabase } from '@/shared/lib/supabase';
import { logger } from '@/shared/lib/logger';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DoctorServiceRow {
  id: string;
  doctor_id: string;
  name: string;
  description: string | null;
  price: number | null;
  duration: number | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DoctorServiceInput {
  name: string;
  description?: string;
  price?: number;
  duration?: number;
  is_active?: boolean;
  sort_order?: number;
}

export interface DoctorScheduleRow {
  id: string;
  doctor_id: string;
  day_of_week: number; // 0=Sun … 6=Sat
  open_time: string;   // "09:00:00"
  close_time: string;  // "17:00:00"
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScheduleBlockInput {
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_active: boolean;
}

// ─── Services CRUD ──────────────────────────────────────────────────────────

export async function getDoctorServices(doctorId: string): Promise<DoctorServiceRow[]> {
  try {
    const { data, error } = await supabase
      .from('doctor_services')
      .select('*')
      .eq('doctor_id', doctorId)
      .order('sort_order', { ascending: true });

    if (error) { logger.error('getDoctorServices', error); return []; }
    return (data ?? []) as DoctorServiceRow[];
  } catch (err) {
    logger.error('getDoctorServices:unexpected', err);
    return [];
  }
}

export async function createDoctorService(
  doctorId: string,
  input: DoctorServiceInput,
): Promise<DoctorServiceRow | null> {
  try {
    const { data, error } = await (supabase
      .from('doctor_services') as any)
      .insert({
        doctor_id: doctorId,
        name: input.name,
        description: input.description ?? null,
        price: input.price ?? null,
        duration: input.duration ?? null,
        is_active: input.is_active ?? true,
        sort_order: input.sort_order ?? 0,
      })
      .select()
      .single();

    if (error) { logger.error('createDoctorService', error); return null; }
    return data as DoctorServiceRow;
  } catch (err) {
    logger.error('createDoctorService:unexpected', err);
    return null;
  }
}

export async function updateDoctorService(
  serviceId: string,
  input: Partial<DoctorServiceInput>,
): Promise<DoctorServiceRow | null> {
  try {
    const { data, error } = await (supabase
      .from('doctor_services') as any)
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', serviceId)
      .select()
      .single();

    if (error) { logger.error('updateDoctorService', error); return null; }
    return data as DoctorServiceRow;
  } catch (err) {
    logger.error('updateDoctorService:unexpected', err);
    return null;
  }
}

export async function deleteDoctorService(serviceId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('doctor_services')
      .delete()
      .eq('id', serviceId);

    if (error) { logger.error('deleteDoctorService', error); return false; }
    return true;
  } catch (err) {
    logger.error('deleteDoctorService:unexpected', err);
    return false;
  }
}

// ─── Schedule CRUD ──────────────────────────────────────────────────────────

export async function getDoctorSchedule(doctorId: string): Promise<DoctorScheduleRow[]> {
  try {
    const { data, error } = await supabase
      .from('doctor_schedules')
      .select('*')
      .eq('doctor_id', doctorId)
      .order('day_of_week', { ascending: true });

    if (error) { logger.error('getDoctorSchedule', error); return []; }
    return (data ?? []) as DoctorScheduleRow[];
  } catch (err) {
    logger.error('getDoctorSchedule:unexpected', err);
    return [];
  }
}

export async function upsertDoctorSchedule(
  doctorId: string,
  blocks: ScheduleBlockInput[],
): Promise<boolean> {
  try {
    // Delete existing schedule and insert fresh
    const { error: delError } = await supabase
      .from('doctor_schedules')
      .delete()
      .eq('doctor_id', doctorId);

    if (delError) {
      logger.error('upsertDoctorSchedule:delete', delError);
      return false;
    }

    if (blocks.length === 0) return true;

    const rows = blocks.map((b) => ({
      doctor_id: doctorId,
      day_of_week: b.day_of_week,
      open_time: b.open_time,
      close_time: b.close_time,
      is_active: b.is_active,
    }));

    const { error: insError } = await (supabase
      .from('doctor_schedules') as any)
      .insert(rows);

    if (insError) {
      logger.error('upsertDoctorSchedule:insert', insError);
      return false;
    }

    return true;
  } catch (err) {
    logger.error('upsertDoctorSchedule:unexpected', err);
    return false;
  }
}

export async function toggleScheduleDay(
  scheduleId: string,
  isActive: boolean,
): Promise<boolean> {
  try {
    const { error } = await (supabase
      .from('doctor_schedules') as any)
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', scheduleId);

    if (error) { logger.error('toggleScheduleDay', error); return false; }
    return true;
  } catch (err) {
    logger.error('toggleScheduleDay:unexpected', err);
    return false;
  }
}
