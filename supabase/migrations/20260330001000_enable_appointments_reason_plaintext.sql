-- Re-enable appointments reason/symptoms persistence for product UX.
-- Columns were restored in a prior compatibility migration; remove nullify trigger.

BEGIN;

DROP TRIGGER IF EXISTS trg_nullify_appointments_legacy_plaintext ON public.appointments;
DROP FUNCTION IF EXISTS public.nullify_appointments_legacy_plaintext();

COMMIT;
