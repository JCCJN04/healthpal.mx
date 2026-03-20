-- Phase 4: drop legacy plaintext sensitive columns.
-- Goal: complete migration to encrypted-only storage for sensitive fields.

BEGIN;

DROP POLICY IF EXISTS documents_bucket_read_shared ON storage.objects;
CREATE POLICY documents_bucket_read_shared
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1
    FROM public.documents d
    WHERE split_part(objects.name, '/', 1) = d.owner_id::text
      AND split_part(objects.name, '/', 2) = d.id::text
      AND (
        d.owner_id = auth.uid()
        OR d.id IN (
          SELECT ds.document_id
          FROM public.document_shares ds
          WHERE ds.shared_with = auth.uid()
        )
      )
  )
);

-- Keep the queue/stats schema for observability, but disable new enqueue attempts.
CREATE OR REPLACE FUNCTION public.enqueue_encryption_backfill()
RETURNS TABLE(enqueued_rows bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 0::bigint AS enqueued_rows;
$$;

-- Lockdown triggers are no longer needed once plaintext columns are removed.
DROP TRIGGER IF EXISTS trg_lockdown_patient_notes_plaintext ON public.patient_notes;
DROP TRIGGER IF EXISTS trg_lockdown_appointment_notes_plaintext ON public.appointment_notes;
DROP TRIGGER IF EXISTS trg_lockdown_appointments_plaintext ON public.appointments;
DROP TRIGGER IF EXISTS trg_lockdown_patient_profiles_plaintext ON public.patient_profiles;
DROP TRIGGER IF EXISTS trg_lockdown_documents_plaintext ON public.documents;

DROP FUNCTION IF EXISTS public.enforce_sensitive_plaintext_lockdown();

ALTER TABLE public.patient_notes
  DROP COLUMN IF EXISTS body;

ALTER TABLE public.appointment_notes
  DROP COLUMN IF EXISTS note;

ALTER TABLE public.appointments
  DROP COLUMN IF EXISTS reason,
  DROP COLUMN IF EXISTS symptoms;

ALTER TABLE public.patient_profiles
  DROP COLUMN IF EXISTS allergies,
  DROP COLUMN IF EXISTS chronic_conditions,
  DROP COLUMN IF EXISTS current_medications,
  DROP COLUMN IF EXISTS notes_for_doctor,
  DROP COLUMN IF EXISTS insurance_policy_number,
  DROP COLUMN IF EXISTS emergency_contact_name,
  DROP COLUMN IF EXISTS emergency_contact_phone;

ALTER TABLE public.documents
  DROP COLUMN IF EXISTS file_path,
  DROP COLUMN IF EXISTS checksum;

COMMIT;
