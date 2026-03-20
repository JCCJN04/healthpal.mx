-- Phase 2 backfill orchestration (non-breaking)
-- Goal: safely track and execute plaintext -> encrypted migration by batches.

BEGIN;

CREATE TABLE IF NOT EXISTS public.encryption_backfill_queue (
  id bigserial PRIMARY KEY,
  target_table text NOT NULL,
  target_id uuid NOT NULL,
  field_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'error')),
  attempts integer NOT NULL DEFAULT 0,
  last_error text NULL,
  locked_by uuid NULL,
  locked_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (target_table, target_id, field_name)
);

CREATE INDEX IF NOT EXISTS idx_encryption_backfill_queue_status
  ON public.encryption_backfill_queue(status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_encryption_backfill_queue_target
  ON public.encryption_backfill_queue(target_table, target_id);

ALTER TABLE public.encryption_backfill_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS encryption_backfill_queue_admin_read ON public.encryption_backfill_queue;
CREATE POLICY encryption_backfill_queue_admin_read
ON public.encryption_backfill_queue
FOR SELECT
TO public
USING (public.current_role() = 'admin'::public.user_role);

DROP POLICY IF EXISTS encryption_backfill_queue_admin_write ON public.encryption_backfill_queue;
CREATE POLICY encryption_backfill_queue_admin_write
ON public.encryption_backfill_queue
FOR ALL
TO public
USING (public.current_role() = 'admin'::public.user_role)
WITH CHECK (public.current_role() = 'admin'::public.user_role);

CREATE OR REPLACE FUNCTION public.enqueue_encryption_backfill()
RETURNS TABLE(enqueued_rows bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_before bigint;
  v_after bigint;
BEGIN
  IF public.current_role() <> 'admin'::public.user_role THEN
    RAISE EXCEPTION 'Admin role required';
  END IF;

  SELECT COUNT(*) INTO v_before
  FROM public.encryption_backfill_queue;

  INSERT INTO public.encryption_backfill_queue (target_table, target_id, field_name)
  SELECT 'patient_notes', pn.id, 'body'
  FROM public.patient_notes pn
  WHERE pn.body IS NOT NULL
    AND pn.body_enc IS NULL
  ON CONFLICT (target_table, target_id, field_name) DO NOTHING;

  INSERT INTO public.encryption_backfill_queue (target_table, target_id, field_name)
  SELECT 'appointment_notes', an.id, 'note'
  FROM public.appointment_notes an
  WHERE an.note IS NOT NULL
    AND an.note_enc IS NULL
  ON CONFLICT (target_table, target_id, field_name) DO NOTHING;

  INSERT INTO public.encryption_backfill_queue (target_table, target_id, field_name)
  SELECT 'appointments', a.id, 'reason'
  FROM public.appointments a
  WHERE a.reason IS NOT NULL
    AND a.reason_enc IS NULL
  ON CONFLICT (target_table, target_id, field_name) DO NOTHING;

  INSERT INTO public.encryption_backfill_queue (target_table, target_id, field_name)
  SELECT 'appointments', a.id, 'symptoms'
  FROM public.appointments a
  WHERE a.symptoms IS NOT NULL
    AND a.symptoms_enc IS NULL
  ON CONFLICT (target_table, target_id, field_name) DO NOTHING;

  INSERT INTO public.encryption_backfill_queue (target_table, target_id, field_name)
  SELECT 'patient_profiles', pp.patient_id, 'allergies'
  FROM public.patient_profiles pp
  WHERE pp.allergies IS NOT NULL
    AND pp.allergies_enc IS NULL
  ON CONFLICT (target_table, target_id, field_name) DO NOTHING;

  INSERT INTO public.encryption_backfill_queue (target_table, target_id, field_name)
  SELECT 'patient_profiles', pp.patient_id, 'chronic_conditions'
  FROM public.patient_profiles pp
  WHERE pp.chronic_conditions IS NOT NULL
    AND pp.chronic_conditions_enc IS NULL
  ON CONFLICT (target_table, target_id, field_name) DO NOTHING;

  INSERT INTO public.encryption_backfill_queue (target_table, target_id, field_name)
  SELECT 'patient_profiles', pp.patient_id, 'current_medications'
  FROM public.patient_profiles pp
  WHERE pp.current_medications IS NOT NULL
    AND pp.current_medications_enc IS NULL
  ON CONFLICT (target_table, target_id, field_name) DO NOTHING;

  INSERT INTO public.encryption_backfill_queue (target_table, target_id, field_name)
  SELECT 'patient_profiles', pp.patient_id, 'notes_for_doctor'
  FROM public.patient_profiles pp
  WHERE pp.notes_for_doctor IS NOT NULL
    AND pp.notes_for_doctor_enc IS NULL
  ON CONFLICT (target_table, target_id, field_name) DO NOTHING;

  INSERT INTO public.encryption_backfill_queue (target_table, target_id, field_name)
  SELECT 'patient_profiles', pp.patient_id, 'insurance_policy_number'
  FROM public.patient_profiles pp
  WHERE pp.insurance_policy_number IS NOT NULL
    AND pp.insurance_policy_number_enc IS NULL
  ON CONFLICT (target_table, target_id, field_name) DO NOTHING;

  INSERT INTO public.encryption_backfill_queue (target_table, target_id, field_name)
  SELECT 'patient_profiles', pp.patient_id, 'emergency_contact_name'
  FROM public.patient_profiles pp
  WHERE pp.emergency_contact_name IS NOT NULL
    AND pp.emergency_contact_name_enc IS NULL
  ON CONFLICT (target_table, target_id, field_name) DO NOTHING;

  INSERT INTO public.encryption_backfill_queue (target_table, target_id, field_name)
  SELECT 'patient_profiles', pp.patient_id, 'emergency_contact_phone'
  FROM public.patient_profiles pp
  WHERE pp.emergency_contact_phone IS NOT NULL
    AND pp.emergency_contact_phone_enc IS NULL
  ON CONFLICT (target_table, target_id, field_name) DO NOTHING;

  INSERT INTO public.encryption_backfill_queue (target_table, target_id, field_name)
  SELECT 'documents', d.id, 'file_path'
  FROM public.documents d
  WHERE d.file_path IS NOT NULL
    AND d.file_path_enc IS NULL
  ON CONFLICT (target_table, target_id, field_name) DO NOTHING;

  INSERT INTO public.encryption_backfill_queue (target_table, target_id, field_name)
  SELECT 'documents', d.id, 'checksum'
  FROM public.documents d
  WHERE d.checksum IS NOT NULL
    AND d.checksum_enc IS NULL
  ON CONFLICT (target_table, target_id, field_name) DO NOTHING;

  SELECT COUNT(*) INTO v_after
  FROM public.encryption_backfill_queue;

  RETURN QUERY SELECT (v_after - v_before);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_encryption_backfill_stats()
RETURNS TABLE(target_table text, status text, total bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT q.target_table, q.status, COUNT(*)::bigint AS total
  FROM public.encryption_backfill_queue q
  WHERE public.current_role() = 'admin'::public.user_role
  GROUP BY q.target_table, q.status
  ORDER BY q.target_table, q.status;
$$;

COMMIT;