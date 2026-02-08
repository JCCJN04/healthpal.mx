-- Comprehensive fix for patient_profiles table
-- This script ensures the table structure, constraints, and permissions are 100% correct.

-- 1. Ensure columns exist
ALTER TABLE public.patient_profiles ADD COLUMN IF NOT EXISTS height_cm integer;
ALTER TABLE public.patient_profiles ADD COLUMN IF NOT EXISTS weight_kg integer;
ALTER TABLE public.patient_profiles ADD COLUMN IF NOT EXISTS insurance_provider text;
ALTER TABLE public.patient_profiles ADD COLUMN IF NOT EXISTS insurance_policy_number text;
ALTER TABLE public.patient_profiles ADD COLUMN IF NOT EXISTS preferred_language text;
ALTER TABLE public.patient_profiles ADD COLUMN IF NOT EXISTS notes_for_doctor text;
ALTER TABLE public.patient_profiles ADD COLUMN IF NOT EXISTS current_medications text;

-- 2. Ensure Primary Key exists (Crucial for upsert to work)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'patient_profiles_pkey') THEN
        ALTER TABLE public.patient_profiles ADD CONSTRAINT patient_profiles_pkey PRIMARY KEY (patient_id);
    END IF;
END
$$;

-- 3. Ensure Foreign Key to profiles exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'patient_profiles_patient_id_fkey') THEN
        ALTER TABLE public.patient_profiles
        ADD CONSTRAINT patient_profiles_patient_id_fkey
        FOREIGN KEY (patient_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;
    END IF;
END
$$;

-- 4. Enable RLS
ALTER TABLE public.patient_profiles ENABLE ROW LEVEL SECURITY;

-- 5. Re-create Policies safely (Drop first)
DROP POLICY IF EXISTS "Patients can view their own profile" ON public.patient_profiles;
DROP POLICY IF EXISTS "Patients can insert their own profile" ON public.patient_profiles;
DROP POLICY IF EXISTS "Patients can update their own profile" ON public.patient_profiles;

CREATE POLICY "Patients can view their own profile"
ON public.patient_profiles FOR SELECT
USING (auth.uid() = patient_id);

CREATE POLICY "Patients can insert their own profile"
ON public.patient_profiles FOR INSERT
WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Patients can update their own profile"
ON public.patient_profiles FOR UPDATE
USING (auth.uid() = patient_id);

-- 6. Grant permissions explicitly to authenticated users
GRANT ALL ON public.patient_profiles TO authenticated;
GRANT ALL ON public.patient_profiles TO service_role;
