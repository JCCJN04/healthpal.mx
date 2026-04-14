-- =====================================================
-- FIX RLS: eliminar políticas permisivas USING (true)
-- y reemplazar con restricciones basadas en is_public
-- =====================================================

-- FIX 1: doctor_profiles
DROP POLICY IF EXISTS "Doctor profiles are viewable by everyone" ON public.doctor_profiles;
DROP POLICY IF EXISTS "doctor_profiles_public_read" ON public.doctor_profiles;

CREATE POLICY "doctor_profiles_public_read"
ON public.doctor_profiles
FOR SELECT
USING (
  is_public = true
  OR doctor_id = auth.uid()
  OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- FIX 2: doctor_schedules
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.doctor_schedules;

CREATE POLICY "doctor_schedules_select"
ON public.doctor_schedules
FOR SELECT
USING (
  doctor_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.doctor_profiles dp
    WHERE dp.doctor_id = doctor_schedules.doctor_id
    AND dp.is_public = true
  )
);

-- FIX 3: doctor_insurances
DROP POLICY IF EXISTS "doctor_insurances_select" ON public.doctor_insurances;

CREATE POLICY "doctor_insurances_select"
ON public.doctor_insurances
FOR SELECT
USING (
  doctor_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.doctor_profiles dp
    WHERE dp.doctor_id = doctor_insurances.doctor_id
    AND dp.is_public = true
  )
);
