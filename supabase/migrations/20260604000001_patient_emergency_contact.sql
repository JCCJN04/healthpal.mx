-- Add emergency contact fields to patient_profiles
ALTER TABLE patient_profiles
  ADD COLUMN IF NOT EXISTS emergency_contact_name  text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text;
