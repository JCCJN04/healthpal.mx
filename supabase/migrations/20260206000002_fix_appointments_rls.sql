-- Migration: Fix Appointments RLS
-- Description: Ensures patients and doctors can only see/manage their own appointments.

-- Enable RLS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- 1. Patients can insert their own appointments
CREATE POLICY "Patients can insert their own appointments"
ON public.appointments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = patient_id);

-- 2. Participants can view their own appointments (Patient or Doctor)
CREATE POLICY "Participants can view their own appointments"
ON public.appointments
FOR SELECT
TO authenticated
USING (auth.uid() = patient_id OR auth.uid() = doctor_id);

-- 3. Participants can update their own appointments (e.g., cancel or reschedule)
CREATE POLICY "Participants can update their own appointments"
ON public.appointments
FOR UPDATE
TO authenticated
USING (auth.uid() = patient_id OR auth.uid() = doctor_id)
WITH CHECK (auth.uid() = patient_id OR auth.uid() = doctor_id);

-- 4. Enable public read of doctor profiles for searching (needed for the wizard)
-- This might already exist, but ensuring patients can see doctors to book them.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Doctor profiles are viewable by everyone" ON public.doctor_profiles;
CREATE POLICY "Doctor profiles are viewable by everyone"
ON public.doctor_profiles
FOR SELECT
TO authenticated
USING (true);
