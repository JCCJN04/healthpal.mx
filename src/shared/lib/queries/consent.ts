// @ts-nocheck
/**
 * Consent service — manages doctor↔patient access requests and granular scopes.
 *
 * Tables used:
 *   - doctor_patient_consent (status, scopes, expiry)
 *
 * Functions:
 *   - Doctor: requestAccess, getMyRequests, getConsentForPatient
 *   - Patient: getPendingRequests, respondToRequest, updateScopes, revokeAccess, getMyDoctorAccess
 *   - Shared:  getConsentBetween
 */

import { supabase } from '@/shared/lib/supabase'
import { logger } from '@/shared/lib/logger'
import type {
  DoctorPatientConsent,
  ConsentStatus,
} from '@/shared/types/database'

// ─── Types used by UI ──────────────────────────────────
export interface ConsentWithProfile extends DoctorPatientConsent {
  doctor?: { id: string; full_name: string | null; avatar_url: string | null; email: string | null }
  patient?: { id: string; full_name: string | null; avatar_url: string | null; email: string | null }
}

export interface ConsentScopes {
  share_basic_profile: boolean
  share_contact: boolean
  share_documents: boolean
  share_appointments: boolean
  share_medical_notes: boolean
}

const DEFAULT_SCOPES: ConsentScopes = {
  share_basic_profile: true,
  share_contact: false,
  share_documents: false,
  share_appointments: false,
  share_medical_notes: false,
}

// ─── Doctor-side ────────────────────────────────────────

/**
 * Doctor requests access to a patient. Inserts a row with status='requested'.
 */
export async function requestPatientAccess(
  doctorId: string,
  patientId: string,
  reason?: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('doctor_patient_consent')
      .insert({
        doctor_id: doctorId,
        patient_id: patientId,
        status: 'requested',
        request_reason: reason?.trim() || null,
      })

    if (error) {
      // Unique constraint violation = already exists
      if (error.code === '23505') {
        return { ok: false, error: 'Ya existe una solicitud para este paciente.' }
      }
      logger.error('requestPatientAccess', error)
      return { ok: false, error: error.message }
    }

    return { ok: true }
  } catch (err) {
    logger.error('requestPatientAccess', err)
    return { ok: false, error: 'Error inesperado.' }
  }
}

/**
 * Doctor: re-request after rejection/revocation.
 * Only updates if current status is rejected or revoked.
 */
export async function reRequestAccess(
  doctorId: string,
  patientId: string,
  reason?: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error, count } = await supabase
      .from('doctor_patient_consent')
      .update({
        status: 'requested',
        request_reason: reason?.trim() || null,
        requested_at: new Date().toISOString(),
        responded_at: null,
        share_basic_profile: false,
        share_contact: false,
        share_documents: false,
        share_appointments: false,
        share_medical_notes: false,
      })
      .eq('doctor_id', doctorId)
      .eq('patient_id', patientId)
      .in('status', ['rejected', 'revoked'])

    if (error) {
      logger.error('reRequestAccess', error)
      return { ok: false, error: error.message }
    }
    if (count === 0) return { ok: false, error: 'No se puede re-solicitar en este estado.' }
    return { ok: true }
  } catch (err) {
    logger.error('reRequestAccess', err)
    return { ok: false, error: 'Error inesperado.' }
  }
}

/**
 * Doctor: list all consent rows (sent requests).
 * Enriched with patient profile info.
 */
export async function getDoctorConsentRequests(
  doctorId: string
): Promise<ConsentWithProfile[]> {
  try {
    const { data, error } = await supabase
      .from('doctor_patient_consent')
      .select('*, patient:patient_id(id, full_name, avatar_url, email)')
      .eq('doctor_id', doctorId)
      .order('updated_at', { ascending: false })

    if (error) {
      logger.error('getDoctorConsentRequests', error)
      return []
    }

    return (data || []) as ConsentWithProfile[]
  } catch (err) {
    logger.error('getDoctorConsentRequests', err)
    return []
  }
}

/**
 * Doctor: get consent row for a specific patient (or null).
 */
export async function getConsentForPatient(
  doctorId: string,
  patientId: string
): Promise<DoctorPatientConsent | null> {
  try {
    const { data, error } = await supabase
      .from('doctor_patient_consent')
      .select('*')
      .eq('doctor_id', doctorId)
      .eq('patient_id', patientId)
      .maybeSingle()

    if (error) {
      logger.error('getConsentForPatient', error)
      return null
    }

    return data
  } catch (err) {
    logger.error('getConsentForPatient', err)
    return null
  }
}

// ─── Patient-side ───────────────────────────────────────

/**
 * Patient: get pending (requested) access from doctors.
 */
export async function getPatientPendingRequests(
  patientId: string
): Promise<ConsentWithProfile[]> {
  try {
    const { data, error } = await supabase
      .from('doctor_patient_consent')
      .select('*, doctor:doctor_id(id, full_name, avatar_url, email)')
      .eq('patient_id', patientId)
      .eq('status', 'requested')
      .order('requested_at', { ascending: false })

    if (error) {
      logger.error('getPatientPendingRequests', error)
      return []
    }

    return (data || []) as ConsentWithProfile[]
  } catch (err) {
    logger.error('getPatientPendingRequests', err)
    return []
  }
}

/**
 * Patient: get all doctors that have (or had) access.
 */
export async function getPatientDoctorAccess(
  patientId: string
): Promise<ConsentWithProfile[]> {
  try {
    const { data, error } = await supabase
      .from('doctor_patient_consent')
      .select('*, doctor:doctor_id(id, full_name, avatar_url, email)')
      .eq('patient_id', patientId)
      .order('updated_at', { ascending: false })

    if (error) {
      logger.error('getPatientDoctorAccess', error)
      return []
    }

    return (data || []) as ConsentWithProfile[]
  } catch (err) {
    logger.error('getPatientDoctorAccess', err)
    return []
  }
}

/**
 * Patient: accept a request (supply scopes).
 */
export async function acceptConsentRequest(
  consentId: string,
  scopes: Partial<ConsentScopes> = {}
): Promise<{ ok: boolean; error?: string }> {
  try {
    const merged = { ...DEFAULT_SCOPES, ...scopes }
    const { error } = await supabase
      .from('doctor_patient_consent')
      .update({
        status: 'accepted',
        responded_at: new Date().toISOString(),
        ...merged,
      })
      .eq('id', consentId)

    if (error) {
      logger.error('acceptConsentRequest', error)
      return { ok: false, error: error.message }
    }

    return { ok: true }
  } catch (err) {
    logger.error('acceptConsentRequest', err)
    return { ok: false, error: 'Error inesperado.' }
  }
}

/**
 * Patient: reject a request.
 */
export async function rejectConsentRequest(
  consentId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('doctor_patient_consent')
      .update({
        status: 'rejected',
        responded_at: new Date().toISOString(),
      })
      .eq('id', consentId)

    if (error) {
      logger.error('rejectConsentRequest', error)
      return { ok: false, error: error.message }
    }

    return { ok: true }
  } catch (err) {
    logger.error('rejectConsentRequest', err)
    return { ok: false, error: 'Error inesperado.' }
  }
}

/**
 * Patient: revoke previously-accepted access.
 */
export async function revokeConsentAccess(
  consentId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('doctor_patient_consent')
      .update({
        status: 'revoked',
        responded_at: new Date().toISOString(),
        share_basic_profile: false,
        share_contact: false,
        share_documents: false,
        share_appointments: false,
        share_medical_notes: false,
      })
      .eq('id', consentId)

    if (error) {
      logger.error('revokeConsentAccess', error)
      return { ok: false, error: error.message }
    }

    return { ok: true }
  } catch (err) {
    logger.error('revokeConsentAccess', err)
    return { ok: false, error: 'Error inesperado.' }
  }
}

/**
 * Patient: update scopes on an accepted consent.
 */
export async function updateConsentScopes(
  consentId: string,
  scopes: Partial<ConsentScopes>
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('doctor_patient_consent')
      .update(scopes)
      .eq('id', consentId)

    if (error) {
      logger.error('updateConsentScopes', error)
      return { ok: false, error: error.message }
    }

    return { ok: true }
  } catch (err) {
    logger.error('updateConsentScopes', err)
    return { ok: false, error: 'Error inesperado.' }
  }
}

/**
 * Count pending requests for a patient (for badge).
 */
export async function countPendingRequests(
  patientId: string
): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('doctor_patient_consent')
      .select('id', { count: 'exact', head: true })
      .eq('patient_id', patientId)
      .eq('status', 'requested')

    if (error) {
      logger.error('countPendingRequests', error)
      return 0
    }

    return count ?? 0
  } catch (err) {
    logger.error('countPendingRequests', err)
    return 0
  }
}
