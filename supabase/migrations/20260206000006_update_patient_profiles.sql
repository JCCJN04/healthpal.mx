-- Add missing columns to patient_profiles table
ALTER TABLE public.patient_profiles
ADD COLUMN IF NOT EXISTS height_cm integer,
ADD COLUMN IF NOT EXISTS weight_kg integer,
ADD COLUMN IF NOT EXISTS insurance_provider text,
ADD COLUMN IF NOT EXISTS insurance_policy_number text,
ADD COLUMN IF NOT EXISTS preferred_language text,
ADD COLUMN IF NOT EXISTS notes_for_doctor text;

-- Ensure RLS policies exist for patient_profiles
-- Enable RLS
ALTER TABLE public.patient_profiles ENABLE ROW LEVEL SECURITY;

-- Note: Policies might already exist, so we drop them first to ensure they are updated correctly without error.
DROP POLICY IF EXISTS "Patients can view their own profile" ON public.patient_profiles;
DROP POLICY IF EXISTS "Patients can insert their own profile" ON public.patient_profiles;
DROP POLICY IF EXISTS "Patients can update their own profile" ON public.patient_profiles;

-- Policy: Patients can view their own profile
CREATE POLICY "Patients can view their own profile"
ON public.patient_profiles FOR SELECT
USING (auth.uid() = patient_id);

-- Policy: Patients can insert their own profile
CREATE POLICY "Patients can insert their own profile"
ON public.patient_profiles FOR INSERT
WITH CHECK (auth.uid() = patient_id);

-- Policy: Patients can update their own profile
CREATE POLICY "Patients can update their own profile"
ON public.patient_profiles FOR UPDATE
USING (auth.uid() = patient_id);
