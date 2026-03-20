-- Phase 3 compatibility patch: temporary exception for documents plaintext columns.
-- Goal: keep document upload/download flows operational until encrypted-path write/read is implemented.

BEGIN;

DROP TRIGGER IF EXISTS trg_lockdown_documents_plaintext ON public.documents;

COMMIT;
