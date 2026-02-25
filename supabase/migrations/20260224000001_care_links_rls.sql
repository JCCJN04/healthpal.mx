-- =============================================================
-- Care Links RLS Policies
-- Date: 2026-02-24
-- Purpose: Add RLS policies so patients/doctors can manage care links
-- =============================================================

-- Ensure RLS is enabled
ALTER TABLE public.care_links ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "care_links_select" ON public.care_links;
DROP POLICY IF EXISTS "care_links_insert" ON public.care_links;
DROP POLICY IF EXISTS "care_links_update" ON public.care_links;
DROP POLICY IF EXISTS "care_links_delete" ON public.care_links;

-- SELECT: patients and doctors can see their own care links
CREATE POLICY "care_links_select"
  ON public.care_links
  FOR SELECT
  TO authenticated
  USING (patient_id = auth.uid() OR doctor_id = auth.uid());

-- INSERT: patients can add doctors to their care team
CREATE POLICY "care_links_insert"
  ON public.care_links
  FOR INSERT
  TO authenticated
  WITH CHECK (patient_id = auth.uid());

-- UPDATE: patients can update their own care links (e.g. change status)
CREATE POLICY "care_links_update"
  ON public.care_links
  FOR UPDATE
  TO authenticated
  USING (patient_id = auth.uid())
  WITH CHECK (patient_id = auth.uid());

-- DELETE: patients can remove doctors from their care team
CREATE POLICY "care_links_delete"
  ON public.care_links
  FOR DELETE
  TO authenticated
  USING (patient_id = auth.uid());
