// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { supabase } from '@/shared/lib/supabase'
import { logger } from '@/shared/lib/logger'

export type DocumentRequest = {
  id: string
  doctor_id: string
  patient_email: string | null
  patient_id: string | null
  document_type: string
  description: string | null
  token: string
  status: 'pending' | 'fulfilled' | 'expired'
  expires_at: string
  fulfilled_at: string | null
  document_id: string | null
  created_at: string
}

export type DocumentRequestWithDoctor = DocumentRequest & {
  doctor: {
    full_name: string | null
    email: string | null
    avatar_url: string | null
    doctor_profiles: { specialty: string | null; clinic_name: string | null } | null
  }
}

/** Doctor: create a new document request link */
export async function createDocumentRequest(
  doctorId: string,
  patientEmail: string,
  documentType: string,
  description?: string,
  patientPhone?: string,
): Promise<{ data: DocumentRequest | null; error: string | null }> {
  try {
    const trimmedEmail = patientEmail.trim()
    const { data, error } = await supabase
      .from('document_requests')
      .insert({
        doctor_id: doctorId,
        patient_email: trimmedEmail ? trimmedEmail.toLowerCase() : null,
        document_type: documentType,
        description: description || null,
        ...(patientPhone ? { patient_phone: patientPhone } : {}),
      })
      .select()
      .single()

    if (error) {
      logger.error('documentRequests:create', error)
      return { data: null, error: 'No se pudo crear la solicitud' }
    }
    return { data, error: null }
  } catch (err) {
    logger.error('documentRequests:create:catch', err)
    return { data: null, error: 'Error inesperado al crear la solicitud' }
  }
}

/** Doctor: list all requests they sent */
export async function getDoctorDocumentRequests(
  doctorId: string,
): Promise<DocumentRequest[]> {
  const { data, error } = await supabase
    .from('document_requests')
    .select('*')
    .eq('doctor_id', doctorId)
    .order('created_at', { ascending: false })

  if (error) {
    logger.error('documentRequests:list', error)
    return []
  }
  return data ?? []
}

/** Public: fetch a request by token (for the public upload page)
 *  Uses a SECURITY DEFINER RPC to avoid exposing the entire document_requests table to anon.
 */
export async function getDocumentRequestByToken(
  token: string,
): Promise<{ data: DocumentRequestWithDoctor | null; error: string | null }> {
  const { data, error } = await supabase
    .rpc('get_document_request_by_token', { p_token: token })

  if (error) {
    logger.error('documentRequests:byToken', error)
    return { data: null, error: 'Solicitud no encontrada' }
  }
  if (!data) {
    return { data: null, error: 'Solicitud no encontrada' }
  }
  return { data: data as DocumentRequestWithDoctor, error: null }
}

/** Patient: mark a request as fulfilled after uploading a document */
export async function fulfillDocumentRequest(
  token: string,
  patientId: string,
  documentId: string,
): Promise<{ error: string | null }> {
  const { data, error } = await supabase
    .rpc('fulfill_document_request_by_token', {
      p_token: token,
      p_patient_id: patientId,
      p_document_id: documentId,
    })

  if (error) {
    logger.error('documentRequests:fulfill', error)
    return { error: 'No se pudo registrar el documento' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (data && !(data as any).success) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    logger.warn('documentRequests:fulfill:notFound', (data as any).error)
    // Non-fatal: request may already be fulfilled from a prior attempt
  }

  return { error: null }
}

/** Doctor: get fulfilled requests (to show docs in patient view) */
export async function getFulfilledRequestsByDoctor(
  doctorId: string,
): Promise<DocumentRequest[]> {
  const { data, error } = await supabase
    .from('document_requests')
    .select('*')
    .eq('doctor_id', doctorId)
    .eq('status', 'fulfilled')
    .not('document_id', 'is', null)

  if (error) {
    logger.error('documentRequests:fulfilled', error)
    return []
  }
  return data ?? []
}

/** Doctor: get documents from fulfilled requests for a specific patient */
export async function getFulfilledRequestDocsByPatient(
  doctorId: string,
  patientId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> {
  const { data, error } = await supabase
    .from('document_requests')
    .select('document_id, document:documents(*)')
    .eq('doctor_id', doctorId)
    .eq('patient_id', patientId)
    .eq('status', 'fulfilled')
    .not('document_id', 'is', null)

  if (error) {
    logger.error('documentRequests:fulfilledByPatient', error)
    return []
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => r.document).filter(Boolean)
}

/** Patient: revoke a doctor's access that was granted via a fulfilled document_request.
 *  Sets document_id = null and status = 'expired' so the doctor's RLS access disappears.
 *  Also deletes the matching document_shares row created during solicitud fulfillment.
 */
export async function revokeRequestAccess(
  requestId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Fetch first so we can clean up the matching document_shares row
    const { data: req } = await supabase
      .from('document_requests')
      .select('document_id, doctor_id')
      .eq('id', requestId)
      .maybeSingle()

    const { error } = await supabase
      .from('document_requests')
      .update({ document_id: null, status: 'expired' })
      .eq('id', requestId)
      .eq('status', 'fulfilled')

    if (error) {
      logger.error('revokeRequestAccess', error)
      return { success: false, error: 'No se pudo revocar el acceso' }
    }

    // Also delete the document_shares row for this (document, doctor) pair
    if (req?.document_id && req?.doctor_id) {
      await supabase
        .from('document_shares')
        .delete()
        .eq('document_id', req.document_id)
        .eq('shared_with', req.doctor_id)
    }

    return { success: true }
  } catch (err) {
    logger.error('revokeRequestAccess:catch', err)
    return { success: false, error: 'Error inesperado al revocar el acceso' }
  }
}

/** Patient: get all fulfilled document requests for a patient (to show in AccessPanel) */
export async function getFulfilledRequestsByPatient(
  patientId: string,
): Promise<Array<{
  id: string
  document_id: string
  doctor_id: string
  created_at: string
  fulfilled_at: string | null
}>> {
  const { data, error } = await supabase
    .from('document_requests')
    .select('id, document_id, doctor_id, created_at, fulfilled_at')
    .eq('patient_id', patientId)
    .eq('status', 'fulfilled')
    .not('document_id', 'is', null)
    .order('fulfilled_at', { ascending: false })

  if (error) {
    logger.error('getFulfilledRequestsByPatient', error)
    return []
  }
  return data ?? []
}

/** Doctor: get distinct patient IDs that have fulfilled document requests */
export async function getPatientsWithFulfilledRequests(
  doctorId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('document_requests')
    .select('patient_id')
    .eq('doctor_id', doctorId)
    .eq('status', 'fulfilled')
    .not('patient_id', 'is', null)
    .not('document_id', 'is', null)

  if (error) {
    logger.error('documentRequests:patientsWithFulfilled', error)
    return []
  }
  const ids = new Set((data ?? []).map((r: { patient_id: string | null }) => r.patient_id).filter(Boolean) as string[])
  return Array.from(ids)
}
