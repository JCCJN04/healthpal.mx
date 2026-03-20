-- Phase 3 plaintext lockdown (breaking for legacy plaintext writes)
-- Goal: prevent new plaintext sensitive writes and clean plaintext already encrypted.

BEGIN;

-- Safety gate: do not proceed if there are pending rows to encrypt.
DO $$
DECLARE
  v_pending bigint;
  v_processing bigint;
  v_errors bigint;
BEGIN
  SELECT COUNT(*) INTO v_pending
  FROM public.encryption_backfill_queue
  WHERE status = 'pending';

  SELECT COUNT(*) INTO v_processing
  FROM public.encryption_backfill_queue
  WHERE status = 'processing';

  SELECT COUNT(*) INTO v_errors
  FROM public.encryption_backfill_queue
  WHERE status = 'error';

  IF v_pending > 0 OR v_processing > 0 OR v_errors > 0 THEN
    RAISE EXCEPTION 'Backfill queue is not clean (pending=%, processing=%, error=%)', v_pending, v_processing, v_errors;
  END IF;
END;
$$;

-- Plaintext columns must become nullable before cleanup, otherwise existing NOT NULL constraints will fail.
ALTER TABLE public.patient_notes
  ALTER COLUMN body DROP NOT NULL;

ALTER TABLE public.appointment_notes
  ALTER COLUMN note DROP NOT NULL;

ALTER TABLE public.appointments
  ALTER COLUMN reason DROP NOT NULL,
  ALTER COLUMN symptoms DROP NOT NULL;

ALTER TABLE public.patient_profiles
  ALTER COLUMN allergies DROP NOT NULL,
  ALTER COLUMN chronic_conditions DROP NOT NULL,
  ALTER COLUMN current_medications DROP NOT NULL,
  ALTER COLUMN notes_for_doctor DROP NOT NULL,
  ALTER COLUMN insurance_policy_number DROP NOT NULL,
  ALTER COLUMN emergency_contact_name DROP NOT NULL,
  ALTER COLUMN emergency_contact_phone DROP NOT NULL;

ALTER TABLE public.documents
  ALTER COLUMN file_path DROP NOT NULL,
  ALTER COLUMN checksum DROP NOT NULL;

-- Cleanup plaintext values that already have encrypted payloads.
UPDATE public.patient_notes
SET body = NULL
WHERE body IS NOT NULL
  AND body <> ''
  AND body_enc IS NOT NULL;

UPDATE public.appointment_notes
SET note = NULL
WHERE note IS NOT NULL
  AND note <> ''
  AND note_enc IS NOT NULL;

UPDATE public.appointments
SET reason = NULL
WHERE reason IS NOT NULL
  AND reason <> ''
  AND reason_enc IS NOT NULL;

UPDATE public.appointments
SET symptoms = NULL
WHERE symptoms IS NOT NULL
  AND symptoms <> ''
  AND symptoms_enc IS NOT NULL;

UPDATE public.patient_profiles
SET allergies = NULL
WHERE allergies IS NOT NULL
  AND allergies <> ''
  AND allergies_enc IS NOT NULL;

UPDATE public.patient_profiles
SET chronic_conditions = NULL
WHERE chronic_conditions IS NOT NULL
  AND chronic_conditions <> ''
  AND chronic_conditions_enc IS NOT NULL;

UPDATE public.patient_profiles
SET current_medications = NULL
WHERE current_medications IS NOT NULL
  AND current_medications <> ''
  AND current_medications_enc IS NOT NULL;

UPDATE public.patient_profiles
SET notes_for_doctor = NULL
WHERE notes_for_doctor IS NOT NULL
  AND notes_for_doctor <> ''
  AND notes_for_doctor_enc IS NOT NULL;

UPDATE public.patient_profiles
SET insurance_policy_number = NULL
WHERE insurance_policy_number IS NOT NULL
  AND insurance_policy_number <> ''
  AND insurance_policy_number_enc IS NOT NULL;

UPDATE public.patient_profiles
SET emergency_contact_name = NULL
WHERE emergency_contact_name IS NOT NULL
  AND emergency_contact_name <> ''
  AND emergency_contact_name_enc IS NOT NULL;

UPDATE public.patient_profiles
SET emergency_contact_phone = NULL
WHERE emergency_contact_phone IS NOT NULL
  AND emergency_contact_phone <> ''
  AND emergency_contact_phone_enc IS NOT NULL;

UPDATE public.documents
SET file_path = NULL
WHERE file_path IS NOT NULL
  AND file_path <> ''
  AND file_path_enc IS NOT NULL;

UPDATE public.documents
SET checksum = NULL
WHERE checksum IS NOT NULL
  AND checksum <> ''
  AND checksum_enc IS NOT NULL;

-- Trigger function to block new plaintext writes for sensitive fields.
CREATE OR REPLACE FUNCTION public.enforce_sensitive_plaintext_lockdown()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'patient_notes' THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.body IS NOT NULL AND NEW.body <> '' THEN
        RAISE EXCEPTION 'patient_notes.body plaintext writes are disabled; write encrypted columns only';
      END IF;
    ELSIF TG_OP = 'UPDATE' THEN
      IF NEW.body IS DISTINCT FROM OLD.body AND NEW.body IS NOT NULL AND NEW.body <> '' THEN
        RAISE EXCEPTION 'patient_notes.body plaintext writes are disabled; write encrypted columns only';
      END IF;
    END IF;

  ELSIF TG_TABLE_NAME = 'appointment_notes' THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.note IS NOT NULL AND NEW.note <> '' THEN
        RAISE EXCEPTION 'appointment_notes.note plaintext writes are disabled; write encrypted columns only';
      END IF;
    ELSIF TG_OP = 'UPDATE' THEN
      IF NEW.note IS DISTINCT FROM OLD.note AND NEW.note IS NOT NULL AND NEW.note <> '' THEN
        RAISE EXCEPTION 'appointment_notes.note plaintext writes are disabled; write encrypted columns only';
      END IF;
    END IF;

  ELSIF TG_TABLE_NAME = 'appointments' THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.reason IS NOT NULL AND NEW.reason <> '' THEN
        RAISE EXCEPTION 'appointments.reason plaintext writes are disabled; write encrypted columns only';
      END IF;
      IF NEW.symptoms IS NOT NULL AND NEW.symptoms <> '' THEN
        RAISE EXCEPTION 'appointments.symptoms plaintext writes are disabled; write encrypted columns only';
      END IF;
    ELSIF TG_OP = 'UPDATE' THEN
      IF NEW.reason IS DISTINCT FROM OLD.reason AND NEW.reason IS NOT NULL AND NEW.reason <> '' THEN
        RAISE EXCEPTION 'appointments.reason plaintext writes are disabled; write encrypted columns only';
      END IF;
      IF NEW.symptoms IS DISTINCT FROM OLD.symptoms AND NEW.symptoms IS NOT NULL AND NEW.symptoms <> '' THEN
        RAISE EXCEPTION 'appointments.symptoms plaintext writes are disabled; write encrypted columns only';
      END IF;
    END IF;

  ELSIF TG_TABLE_NAME = 'patient_profiles' THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.allergies IS NOT NULL AND NEW.allergies <> '' THEN
        RAISE EXCEPTION 'patient_profiles.allergies plaintext writes are disabled; write encrypted columns only';
      END IF;
      IF NEW.chronic_conditions IS NOT NULL AND NEW.chronic_conditions <> '' THEN
        RAISE EXCEPTION 'patient_profiles.chronic_conditions plaintext writes are disabled; write encrypted columns only';
      END IF;
      IF NEW.current_medications IS NOT NULL AND NEW.current_medications <> '' THEN
        RAISE EXCEPTION 'patient_profiles.current_medications plaintext writes are disabled; write encrypted columns only';
      END IF;
      IF NEW.notes_for_doctor IS NOT NULL AND NEW.notes_for_doctor <> '' THEN
        RAISE EXCEPTION 'patient_profiles.notes_for_doctor plaintext writes are disabled; write encrypted columns only';
      END IF;
      IF NEW.insurance_policy_number IS NOT NULL AND NEW.insurance_policy_number <> '' THEN
        RAISE EXCEPTION 'patient_profiles.insurance_policy_number plaintext writes are disabled; write encrypted columns only';
      END IF;
      IF NEW.emergency_contact_name IS NOT NULL AND NEW.emergency_contact_name <> '' THEN
        RAISE EXCEPTION 'patient_profiles.emergency_contact_name plaintext writes are disabled; write encrypted columns only';
      END IF;
      IF NEW.emergency_contact_phone IS NOT NULL AND NEW.emergency_contact_phone <> '' THEN
        RAISE EXCEPTION 'patient_profiles.emergency_contact_phone plaintext writes are disabled; write encrypted columns only';
      END IF;
    ELSIF TG_OP = 'UPDATE' THEN
      IF NEW.allergies IS DISTINCT FROM OLD.allergies AND NEW.allergies IS NOT NULL AND NEW.allergies <> '' THEN
        RAISE EXCEPTION 'patient_profiles.allergies plaintext writes are disabled; write encrypted columns only';
      END IF;
      IF NEW.chronic_conditions IS DISTINCT FROM OLD.chronic_conditions AND NEW.chronic_conditions IS NOT NULL AND NEW.chronic_conditions <> '' THEN
        RAISE EXCEPTION 'patient_profiles.chronic_conditions plaintext writes are disabled; write encrypted columns only';
      END IF;
      IF NEW.current_medications IS DISTINCT FROM OLD.current_medications AND NEW.current_medications IS NOT NULL AND NEW.current_medications <> '' THEN
        RAISE EXCEPTION 'patient_profiles.current_medications plaintext writes are disabled; write encrypted columns only';
      END IF;
      IF NEW.notes_for_doctor IS DISTINCT FROM OLD.notes_for_doctor AND NEW.notes_for_doctor IS NOT NULL AND NEW.notes_for_doctor <> '' THEN
        RAISE EXCEPTION 'patient_profiles.notes_for_doctor plaintext writes are disabled; write encrypted columns only';
      END IF;
      IF NEW.insurance_policy_number IS DISTINCT FROM OLD.insurance_policy_number AND NEW.insurance_policy_number IS NOT NULL AND NEW.insurance_policy_number <> '' THEN
        RAISE EXCEPTION 'patient_profiles.insurance_policy_number plaintext writes are disabled; write encrypted columns only';
      END IF;
      IF NEW.emergency_contact_name IS DISTINCT FROM OLD.emergency_contact_name AND NEW.emergency_contact_name IS NOT NULL AND NEW.emergency_contact_name <> '' THEN
        RAISE EXCEPTION 'patient_profiles.emergency_contact_name plaintext writes are disabled; write encrypted columns only';
      END IF;
      IF NEW.emergency_contact_phone IS DISTINCT FROM OLD.emergency_contact_phone AND NEW.emergency_contact_phone IS NOT NULL AND NEW.emergency_contact_phone <> '' THEN
        RAISE EXCEPTION 'patient_profiles.emergency_contact_phone plaintext writes are disabled; write encrypted columns only';
      END IF;
    END IF;

  ELSIF TG_TABLE_NAME = 'documents' THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.file_path IS NOT NULL AND NEW.file_path <> '' THEN
        RAISE EXCEPTION 'documents.file_path plaintext writes are disabled; write encrypted columns only';
      END IF;
      IF NEW.checksum IS NOT NULL AND NEW.checksum <> '' THEN
        RAISE EXCEPTION 'documents.checksum plaintext writes are disabled; write encrypted columns only';
      END IF;
    ELSIF TG_OP = 'UPDATE' THEN
      IF NEW.file_path IS DISTINCT FROM OLD.file_path AND NEW.file_path IS NOT NULL AND NEW.file_path <> '' THEN
        RAISE EXCEPTION 'documents.file_path plaintext writes are disabled; write encrypted columns only';
      END IF;
      IF NEW.checksum IS DISTINCT FROM OLD.checksum AND NEW.checksum IS NOT NULL AND NEW.checksum <> '' THEN
        RAISE EXCEPTION 'documents.checksum plaintext writes are disabled; write encrypted columns only';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lockdown_patient_notes_plaintext ON public.patient_notes;
CREATE TRIGGER trg_lockdown_patient_notes_plaintext
BEFORE INSERT OR UPDATE ON public.patient_notes
FOR EACH ROW
EXECUTE FUNCTION public.enforce_sensitive_plaintext_lockdown();

DROP TRIGGER IF EXISTS trg_lockdown_appointment_notes_plaintext ON public.appointment_notes;
CREATE TRIGGER trg_lockdown_appointment_notes_plaintext
BEFORE INSERT OR UPDATE ON public.appointment_notes
FOR EACH ROW
EXECUTE FUNCTION public.enforce_sensitive_plaintext_lockdown();

DROP TRIGGER IF EXISTS trg_lockdown_appointments_plaintext ON public.appointments;
CREATE TRIGGER trg_lockdown_appointments_plaintext
BEFORE INSERT OR UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.enforce_sensitive_plaintext_lockdown();

DROP TRIGGER IF EXISTS trg_lockdown_patient_profiles_plaintext ON public.patient_profiles;
CREATE TRIGGER trg_lockdown_patient_profiles_plaintext
BEFORE INSERT OR UPDATE ON public.patient_profiles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_sensitive_plaintext_lockdown();

DROP TRIGGER IF EXISTS trg_lockdown_documents_plaintext ON public.documents;
CREATE TRIGGER trg_lockdown_documents_plaintext
BEFORE INSERT OR UPDATE ON public.documents
FOR EACH ROW
EXECUTE FUNCTION public.enforce_sensitive_plaintext_lockdown();

COMMIT;
