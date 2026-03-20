-- Phase 1 encryption scaffold (non-breaking, additive)
-- Goal: prepare encrypted storage paths for highly sensitive fields.

BEGIN;

-- Registry table for envelope-encryption key metadata (no key material).
CREATE TABLE IF NOT EXISTS public.encryption_key_registry (
  key_id text PRIMARY KEY,
  provider text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'rotating', 'retired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  rotated_at timestamptz NULL,
  retired_at timestamptz NULL
);

ALTER TABLE public.encryption_key_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS encryption_key_registry_admin_read ON public.encryption_key_registry;
CREATE POLICY encryption_key_registry_admin_read
ON public.encryption_key_registry
FOR SELECT
TO public
USING (public.current_role() = 'admin'::public.user_role);

DROP POLICY IF EXISTS encryption_key_registry_admin_write ON public.encryption_key_registry;
CREATE POLICY encryption_key_registry_admin_write
ON public.encryption_key_registry
FOR ALL
TO public
USING (public.current_role() = 'admin'::public.user_role)
WITH CHECK (public.current_role() = 'admin'::public.user_role);

-- Generic audit trail for sensitive reads/decrypt attempts.
CREATE TABLE IF NOT EXISTS public.sensitive_access_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  action text NOT NULL,
  target_table text NOT NULL,
  target_id uuid NULL,
  reason text NULL,
  success boolean NOT NULL DEFAULT true,
  request_meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sensitive_access_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sensitive_access_audit_admin_read ON public.sensitive_access_audit;
CREATE POLICY sensitive_access_audit_admin_read
ON public.sensitive_access_audit
FOR SELECT
TO public
USING (public.current_role() = 'admin'::public.user_role);

DROP POLICY IF EXISTS sensitive_access_audit_insert_self ON public.sensitive_access_audit;
CREATE POLICY sensitive_access_audit_insert_self
ON public.sensitive_access_audit
FOR INSERT
TO public
WITH CHECK (
  auth.uid() IS NOT NULL
  AND actor_id = auth.uid()
);

-- Encrypted payload columns (additive, plaintext columns retained for phased migration).
ALTER TABLE public.patient_notes
  ADD COLUMN IF NOT EXISTS body_enc bytea,
  ADD COLUMN IF NOT EXISTS body_nonce bytea,
  ADD COLUMN IF NOT EXISTS body_kid text,
  ADD COLUMN IF NOT EXISTS body_ver smallint,
  ADD COLUMN IF NOT EXISTS body_hash bytea;

ALTER TABLE public.appointment_notes
  ADD COLUMN IF NOT EXISTS note_enc bytea,
  ADD COLUMN IF NOT EXISTS note_nonce bytea,
  ADD COLUMN IF NOT EXISTS note_kid text,
  ADD COLUMN IF NOT EXISTS note_ver smallint,
  ADD COLUMN IF NOT EXISTS note_hash bytea;

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS reason_enc bytea,
  ADD COLUMN IF NOT EXISTS reason_nonce bytea,
  ADD COLUMN IF NOT EXISTS reason_kid text,
  ADD COLUMN IF NOT EXISTS reason_ver smallint,
  ADD COLUMN IF NOT EXISTS symptoms_enc bytea,
  ADD COLUMN IF NOT EXISTS symptoms_nonce bytea,
  ADD COLUMN IF NOT EXISTS symptoms_kid text,
  ADD COLUMN IF NOT EXISTS symptoms_ver smallint;

ALTER TABLE public.patient_profiles
  ADD COLUMN IF NOT EXISTS allergies_enc bytea,
  ADD COLUMN IF NOT EXISTS allergies_nonce bytea,
  ADD COLUMN IF NOT EXISTS allergies_kid text,
  ADD COLUMN IF NOT EXISTS allergies_ver smallint,
  ADD COLUMN IF NOT EXISTS chronic_conditions_enc bytea,
  ADD COLUMN IF NOT EXISTS chronic_conditions_nonce bytea,
  ADD COLUMN IF NOT EXISTS chronic_conditions_kid text,
  ADD COLUMN IF NOT EXISTS chronic_conditions_ver smallint,
  ADD COLUMN IF NOT EXISTS current_medications_enc bytea,
  ADD COLUMN IF NOT EXISTS current_medications_nonce bytea,
  ADD COLUMN IF NOT EXISTS current_medications_kid text,
  ADD COLUMN IF NOT EXISTS current_medications_ver smallint,
  ADD COLUMN IF NOT EXISTS notes_for_doctor_enc bytea,
  ADD COLUMN IF NOT EXISTS notes_for_doctor_nonce bytea,
  ADD COLUMN IF NOT EXISTS notes_for_doctor_kid text,
  ADD COLUMN IF NOT EXISTS notes_for_doctor_ver smallint,
  ADD COLUMN IF NOT EXISTS insurance_policy_number_enc bytea,
  ADD COLUMN IF NOT EXISTS insurance_policy_number_nonce bytea,
  ADD COLUMN IF NOT EXISTS insurance_policy_number_kid text,
  ADD COLUMN IF NOT EXISTS insurance_policy_number_ver smallint,
  ADD COLUMN IF NOT EXISTS emergency_contact_name_enc bytea,
  ADD COLUMN IF NOT EXISTS emergency_contact_name_nonce bytea,
  ADD COLUMN IF NOT EXISTS emergency_contact_name_kid text,
  ADD COLUMN IF NOT EXISTS emergency_contact_name_ver smallint,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone_enc bytea,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone_nonce bytea,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone_kid text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone_ver smallint;

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS file_path_enc bytea,
  ADD COLUMN IF NOT EXISTS file_path_nonce bytea,
  ADD COLUMN IF NOT EXISTS file_path_kid text,
  ADD COLUMN IF NOT EXISTS file_path_ver smallint,
  ADD COLUMN IF NOT EXISTS checksum_enc bytea,
  ADD COLUMN IF NOT EXISTS checksum_nonce bytea,
  ADD COLUMN IF NOT EXISTS checksum_kid text,
  ADD COLUMN IF NOT EXISTS checksum_ver smallint;

-- Basic key-id referential guardrails.
ALTER TABLE public.patient_notes
  ADD CONSTRAINT patient_notes_body_kid_fkey
  FOREIGN KEY (body_kid) REFERENCES public.encryption_key_registry(key_id);

ALTER TABLE public.appointment_notes
  ADD CONSTRAINT appointment_notes_note_kid_fkey
  FOREIGN KEY (note_kid) REFERENCES public.encryption_key_registry(key_id);

COMMIT;
