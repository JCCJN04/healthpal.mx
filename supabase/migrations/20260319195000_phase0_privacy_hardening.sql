-- Phase 0 privacy hardening
-- Goal: close critical access gaps before encryption rollout.

BEGIN;

-- 1) Fix high-risk INSERT policy on conversation_participants.
-- Previous state allowed WITH CHECK (true), enabling arbitrary participation attempts.
DROP POLICY IF EXISTS cp_insert ON public.conversation_participants;
CREATE POLICY cp_insert
ON public.conversation_participants
AS PERMISSIVE
FOR INSERT
TO public
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    public.current_role() = 'admin'::public.user_role
    OR (
      user_id = auth.uid()
      AND EXISTS (
        SELECT 1
        FROM public.conversation_participants cp
        WHERE cp.conversation_id = conversation_participants.conversation_id
          AND cp.user_id = auth.uid()
      )
    )
  )
);

-- 2) Fix shared-document access condition typo in documents_select.
-- Previous condition compared ds.document_id = ds.id (incorrect alias usage).
DROP POLICY IF EXISTS documents_select ON public.documents;
CREATE POLICY documents_select
ON public.documents
AS PERMISSIVE
FOR SELECT
TO public
USING (
  owner_id = auth.uid()
  OR public.current_role() = 'admin'::public.user_role
  OR (patient_id IS NOT NULL AND public.can_access_patient(patient_id))
  OR EXISTS (
    SELECT 1
    FROM public.document_shares ds
    WHERE ds.document_id = documents.id
      AND ds.shared_with = auth.uid()
  )
);

-- 3) Harden SECURITY DEFINER functions by pinning search_path.
ALTER FUNCTION public.get_folder_item_count(uuid)
  SET search_path = public;

ALTER FUNCTION public.get_public_doctor_by_slug(text)
  SET search_path = public;

ALTER FUNCTION public.get_public_specialties()
  SET search_path = public;

ALTER FUNCTION public.handle_new_message()
  SET search_path = public;

ALTER FUNCTION public.search_public_doctors(text, text, text, integer, integer)
  SET search_path = public;

COMMIT;
