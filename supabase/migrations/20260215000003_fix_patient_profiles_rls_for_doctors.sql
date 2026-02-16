-- Allow doctors to view the medical profile of patients they are connected to
-- via an appointment or a conversation.

-- Step 1: Drop existing policies to ensure a clean state
DROP POLICY IF EXISTS "Doctors can view profiles of their patients" ON public.patient_profiles;

-- Step 2: Create a robust policy using aliases
CREATE POLICY "Doctors can view profiles of their patients"
ON public.patient_profiles FOR SELECT
TO authenticated
USING (
  -- Current user is the patient
  auth.uid() = patient_id
  OR
  -- Current user is a doctor with an appointment for this patient
  EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.doctor_id = auth.uid()
    AND a.patient_id = public.patient_profiles.patient_id
  )
  OR
  -- Current user is a doctor in a conversation with this patient
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp1
    JOIN public.conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
    WHERE cp1.user_id = auth.uid()
    AND cp2.user_id = public.patient_profiles.patient_id
  )
);

-- Ensure RLS is enabled
ALTER TABLE public.patient_profiles ENABLE ROW LEVEL SECURITY;
