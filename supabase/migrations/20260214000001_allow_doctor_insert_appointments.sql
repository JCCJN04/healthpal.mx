-- Migration: Allow doctors to insert appointments
-- Description: Doctors should be able to create appointments on behalf of their patients.

-- Policy to let doctors create appointments when they are the doctor on record
CREATE POLICY "Doctors can insert appointments for their patients"
ON public.appointments
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = doctor_id
  AND patient_id IS NOT NULL
);
