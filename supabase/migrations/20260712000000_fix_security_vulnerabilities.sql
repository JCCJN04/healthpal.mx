-- 1. Fix RLS on whatsapp_reply_dedup
CREATE POLICY "Service Role Full Access"
ON public.whatsapp_reply_dedup
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 2. Fix Function Search Path Mutable (excluding storage schema to avoid ownership errors)
ALTER FUNCTION public.update_subscriptions_updated_at() SET search_path = public;
ALTER FUNCTION public.update_nota_evolucion_updated_at() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;

-- 3. Revoke public/anon execute on SECURITY DEFINER functions where not intended
REVOKE EXECUTE ON FUNCTION public.fulfill_document_request_by_token(text, uuid, uuid) FROM public;
REVOKE EXECUTE ON FUNCTION public.fulfill_document_request_by_token(text, uuid, uuid) FROM anon;

-- Revoke execute from PUBLIC on all these functions to follow best practice, and explicitly grant to authenticated where needed.
REVOKE EXECUTE ON FUNCTION public.can_access_patient(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.can_access_patient(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.current_role() FROM public;
GRANT EXECUTE ON FUNCTION public.current_role() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_doctor_patients_for_assistant(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_doctor_patients_for_assistant(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_folder_item_count(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_folder_item_count(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_my_role() FROM public;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_reviewable_appointments() FROM public;
GRANT EXECUTE ON FUNCTION public.get_reviewable_appointments() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_unread_total(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_unread_total(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_consent(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.has_consent(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_patient_scope(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.has_patient_scope(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_conversation_participant(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_conversation_participant(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_doctor() FROM public;
GRANT EXECUTE ON FUNCTION public.is_doctor() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_participant_of(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_participant_of(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_patient() FROM public;
GRANT EXECUTE ON FUNCTION public.is_patient() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.link_my_pending_assistant_invitations() FROM public;
GRANT EXECUTE ON FUNCTION public.link_my_pending_assistant_invitations() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.link_whatsapp_preregistered() FROM public;
GRANT EXECUTE ON FUNCTION public.link_whatsapp_preregistered() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.log_audit_event(text, text, uuid, uuid, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.log_audit_event(text, text, uuid, uuid, jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.log_sensitive_access(text, text, uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.log_sensitive_access(text, text, uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.mark_conversation_read(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.mark_conversation_read(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.search_patients_for_doctor(text, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.search_patients_for_doctor(text, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.submit_verified_review(uuid, integer, integer, integer, integer, text, boolean) FROM public;
GRANT EXECUTE ON FUNCTION public.submit_verified_review(uuid, integer, integer, integer, integer, text, boolean) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_document_request_by_token(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_document_request_by_token(text) TO anon, authenticated;
