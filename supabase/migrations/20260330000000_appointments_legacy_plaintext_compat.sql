-- Compatibility patch for legacy clients still sending appointments.reason/symptoms.
-- Keeps phase-4 privacy posture by nullifying legacy plaintext fields on every write.

BEGIN;

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS reason text,
  ADD COLUMN IF NOT EXISTS symptoms text;

CREATE OR REPLACE FUNCTION public.nullify_appointments_legacy_plaintext()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Accept legacy payload shape but never persist plaintext values.
  NEW.reason := NULL;
  NEW.symptoms := NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_nullify_appointments_legacy_plaintext ON public.appointments;
CREATE TRIGGER trg_nullify_appointments_legacy_plaintext
BEFORE INSERT OR UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.nullify_appointments_legacy_plaintext();

COMMIT;
