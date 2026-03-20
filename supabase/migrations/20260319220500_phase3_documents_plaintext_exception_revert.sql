-- Phase 3: revert temporary documents plaintext exception.
-- Goal: restore trigger-based plaintext lockdown once app no longer depends on documents.file_path/checksum.

BEGIN;

CREATE TRIGGER trg_lockdown_documents_plaintext
BEFORE INSERT OR UPDATE ON public.documents
FOR EACH ROW
EXECUTE FUNCTION public.enforce_sensitive_plaintext_lockdown();

COMMIT;
