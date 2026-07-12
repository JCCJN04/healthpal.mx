-- Add patient_weight column to prescriptions table.
-- Field was captured in the form (Recetas.tsx) and included in save payloads
-- but was missing from the original migration — all saved values were NULL.
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS patient_weight text;
