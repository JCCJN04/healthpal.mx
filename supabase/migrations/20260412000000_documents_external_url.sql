-- Add external_url column to documents table
-- Enables saving radiology/lab links and other external study URLs
-- without requiring a file upload.

BEGIN;

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS external_url text;

COMMIT;
