-- 1. Create patient_notes table
CREATE TABLE IF NOT EXISTS public.patient_notes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    doctor_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    title text,
    body text NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.patient_notes ENABLE ROW LEVEL SECURITY;

-- 3. Clear existing policies if any
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' AND tablename = 'patient_notes' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- 4. Policies
-- A doctor can only see notes they authored
CREATE POLICY "Doctors can view their own clinical notes"
ON public.patient_notes FOR SELECT
TO authenticated
USING (auth.uid() = doctor_id);

-- A doctor can only insert notes where they are the author
CREATE POLICY "Doctors can insert their own clinical notes"
ON public.patient_notes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = doctor_id);

-- A doctor can only update/delete their own notes
CREATE POLICY "Doctors can update their own clinical notes"
ON public.patient_notes FOR UPDATE
TO authenticated
USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can delete their own clinical notes"
ON public.patient_notes FOR DELETE
TO authenticated
USING (auth.uid() = doctor_id);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_patient_notes_patient_id ON public.patient_notes(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_notes_doctor_id ON public.patient_notes(doctor_id);
