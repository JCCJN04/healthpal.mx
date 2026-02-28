-- =========================================================================
--  PERMITIR A PACIENTES VER HORARIOS DE DOCTORES (RLS POLICY)
--  Ejecutar en: Supabase Dashboard → SQL Editor
-- =========================================================================

-- 1. Asegurarnos que la tabla tiene RLS activado.
ALTER TABLE public.doctor_schedules ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar políticas de lectura restrictivas si existen (opcional, pero buena práctica si causan conflicto).
-- Buscar y eliminar si hay una política previa de "Select" restrictiva.
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'doctor_schedules' AND cmd = 'SELECT'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.doctor_schedules', pol.policyname);
    END LOOP;
END
$$;

-- 3. Crear una nueva política que permita a todos los usuarios (autenticados o anónimos) 
--    ver los horarios de los médicos.
CREATE POLICY "Public profiles are viewable by everyone." 
ON public.doctor_schedules FOR SELECT 
USING (true);
