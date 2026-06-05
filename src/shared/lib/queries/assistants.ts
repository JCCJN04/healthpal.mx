// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
/**
 * Assistant service — manages doctor↔assistant relationships.
 *
 * Tables used:
 *   - doctor_assistants (doctor_id, assistant_id, assistant_email, status)
 *
 * Doctor-side: addAssistant, removeAssistant, getDoctorAssistants
 * Assistant-side: getMyDoctorLink, getPendingInvitationsForMe, acceptInvitation
 */

import { supabase } from '@/shared/lib/supabase'
import { logger } from '@/shared/lib/logger'

export type AssistantStatus = 'pending' | 'active' | 'suspended'

export interface DoctorAssistant {
  id: string
  doctor_id: string
  assistant_id: string | null
  assistant_email: string
  status: AssistantStatus
  created_at: string
  updated_at: string
  doctor?: { id: string; full_name: string | null; email: string | null; avatar_url: string | null }
  assistant?: { id: string; full_name: string | null; email: string | null; avatar_url: string | null }
}

// ─── Doctor-side ─────────────────────────────────────────────────────────────

/**
 * Doctor: list all assistants (any status).
 */
export async function getDoctorAssistants(doctorId: string): Promise<DoctorAssistant[]> {
  try {
    const { data, error } = await supabase
      .from('doctor_assistants')
      .select('*, assistant:assistant_id(id, full_name, email, avatar_url)')
      .eq('doctor_id', doctorId)
      .order('created_at', { ascending: false })

    if (error) { logger.error('getDoctorAssistants', error); return [] }
    return (data || []) as DoctorAssistant[]
  } catch (err) {
    logger.error('getDoctorAssistants', err)
    return []
  }
}

/**
 * Doctor: invite / add an assistant by email.
 * - If the email already has a profile, links immediately with status='active'.
 * - If not, creates a pending invite (assistant_id = null).
 */
export async function addAssistant(
  doctorId: string,
  email: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const cleanEmail = email.trim().toLowerCase()

    // Check if a profile with this email already exists
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('email', cleanEmail)
      .maybeSingle()

    if (profile && profile.role !== 'assistant') {
      return { ok: false, error: 'Este correo pertenece a una cuenta que no es de asistente.' }
    }

    const { error } = await supabase
      .from('doctor_assistants')
      .insert({
        doctor_id: doctorId,
        assistant_id: profile?.id ?? null,
        assistant_email: cleanEmail,
        status: profile ? 'active' : 'pending',
      })

    if (error) {
      if (error.code === '23505') return { ok: false, error: 'Este asistente ya está registrado.' }
      logger.error('addAssistant', error)
      return { ok: false, error: error.message }
    }

    return { ok: true }
  } catch (err) {
    logger.error('addAssistant', err)
    return { ok: false, error: 'Error inesperado.' }
  }
}

/**
 * Doctor: remove an assistant (deletes the record).
 */
export async function removeAssistant(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('doctor_assistants')
      .delete()
      .eq('id', id)

    if (error) { logger.error('removeAssistant', error); return { ok: false, error: error.message } }
    return { ok: true }
  } catch (err) {
    logger.error('removeAssistant', err)
    return { ok: false, error: 'Error inesperado.' }
  }
}

// ─── Assistant-side ───────────────────────────────────────────────────────────

/**
 * Assistant: get their linked doctor (active only).
 */
export async function getMyDoctorLink(): Promise<DoctorAssistant | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('doctor_assistants')
      .select('*, doctor:doctor_id(id, full_name, email, avatar_url)')
      .eq('assistant_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    if (error) { logger.error('getMyDoctorLink', error); return null }
    return data as DoctorAssistant | null
  } catch (err) {
    logger.error('getMyDoctorLink', err)
    return null
  }
}

/**
 * Assistant: get pending invitations for their email (called during onboarding).
 */
export async function getPendingInvitationsForMe(): Promise<DoctorAssistant[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) return []

    const { data, error } = await supabase
      .from('doctor_assistants')
      .select('*, doctor:doctor_id(id, full_name, email, avatar_url)')
      .eq('assistant_email', user.email.toLowerCase())
      .eq('status', 'pending')

    if (error) { logger.error('getPendingInvitationsForMe', error); return [] }
    return (data || []) as DoctorAssistant[]
  } catch (err) {
    logger.error('getPendingInvitationsForMe', err)
    return []
  }
}

/**
 * Assistant: accept a pending invitation (sets assistant_id + status=active).
 */
export async function acceptInvitation(
  inviteId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: 'No autenticado.' }

    const { error } = await supabase
      .from('doctor_assistants')
      .update({ assistant_id: user.id, status: 'active', updated_at: new Date().toISOString() })
      .eq('id', inviteId)
      .eq('assistant_email', user.email!.toLowerCase())

    if (error) { logger.error('acceptInvitation', error); return { ok: false, error: error.message } }
    return { ok: true }
  } catch (err) {
    logger.error('acceptInvitation', err)
    return { ok: false, error: 'Error inesperado.' }
  }
}

/**
 * Called at the end of assistant onboarding to link by email (self-registration case).
 * Finds ALL pending invitations for the user's email and links them.
 */
export async function linkPendingInvitations(): Promise<void> {
  try {
    const { error } = await supabase.rpc('link_my_pending_assistant_invitations')
    if (error) logger.error('linkPendingInvitations', error)
  } catch (err) {
    logger.error('linkPendingInvitations', err)
  }
}
