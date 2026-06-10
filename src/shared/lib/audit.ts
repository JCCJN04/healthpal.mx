/**
 * NOM-024-SSA3-2012 §6.6 / §3.42 — Trazabilidad
 *
 * Client-side utility to log read events to audit_log via the
 * log_audit_event RPC (SECURITY DEFINER, bypasses RLS).
 *
 * Write events (create/update/delete) are logged automatically
 * by database triggers (see migration 20260609000001_nom024_audit_log.sql).
 *
 * Usage:
 *   await auditLog.read('document', documentId, patientId)
 *   await auditLog.exportData('document', patientId)
 */

import { supabase } from '@/shared/lib/supabase'
import { logger } from '@/shared/lib/logger'

export type AuditAction =
  | 'read_document'
  | 'download_document'
  | 'read_clinical_history'
  | 'read_appointment'
  | 'export_data'
  | 'login'
  | 'logout'
  | 'consent_viewed'

export type AuditResourceType =
  | 'document'
  | 'clinical_history'
  | 'appointment'
  | 'consent'
  | 'profile'
  | 'session'

async function logEvent(
  action: AuditAction,
  resourceType: AuditResourceType,
  resourceId?: string,
  patientId?: string,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    const { error } = await supabase.rpc('log_audit_event', {
      p_action:        action,
      p_resource_type: resourceType,
      p_resource_id:   resourceId ?? null,
      p_patient_id:    patientId ?? null,
      p_details:       details ?? null,
    })

    if (error) {
      // Audit failure must not break the main flow — log locally only
      logger.error('[audit] Failed to log event', { action, resourceType, resourceId })
    }
  } catch {
    logger.error('[audit] Unexpected error logging event', { action, resourceType })
  }
}

export const auditLog = {
  /** Log that a user read/opened a document */
  readDocument(documentId: string, patientId?: string) {
    return logEvent('read_document', 'document', documentId, patientId)
  },

  /** Log that a user downloaded a document file */
  downloadDocument(documentId: string, patientId?: string) {
    return logEvent('download_document', 'document', documentId, patientId)
  },

  /** Log that a user read clinical history */
  readClinicalHistory(historyId: string, patientId: string) {
    return logEvent('read_clinical_history', 'clinical_history', historyId, patientId)
  },

  /** Log bulk data export (NOM-024 §6.6.6) */
  exportData(resourceType: AuditResourceType, patientId: string) {
    return logEvent('export_data', resourceType, undefined, patientId)
  },

  /** Log authentication events */
  login() {
    return logEvent('login', 'session')
  },

  logout() {
    return logEvent('logout', 'session')
  },
}
