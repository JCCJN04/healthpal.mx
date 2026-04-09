// @ts-nocheck
import { supabase } from '@/shared/lib/supabase'
import { logger } from '@/shared/lib/logger'

export type DocumentRequest = {
  id: string
  doctor_id: string
  patient_email: string
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
): Promise<{ data: DocumentRequest | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('document_requests')
      .insert({
        doctor_id: doctorId,
        patient_email: patientEmail.toLowerCase().trim(),
        document_type: documentType,
        description: description || null,
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

/** Public: fetch a request by token (for the public upload page) */
export async function getDocumentRequestByToken(
  token: string,
): Promise<{ data: DocumentRequestWithDoctor | null; error: string | null }> {
  const { data, error } = await supabase
    .from('document_requests')
    .select(`
      *,
      doctor:doctor_id (
        full_name,
        email,
        avatar_url,
        doctor_profiles ( specialty, clinic_name )
      )
    `)
    .eq('token', token)
    .single()

  if (error) {
    logger.error('documentRequests:byToken', error)
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
  const { error } = await supabase
    .from('document_requests')
    .update({
      status: 'fulfilled',
      patient_id: patientId,
      document_id: documentId,
      fulfilled_at: new Date().toISOString(),
    })
    .eq('token', token)
    .eq('status', 'pending')

  if (error) {
    logger.error('documentRequests:fulfill', error)
    return { error: 'No se pudo registrar el documento' }
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
