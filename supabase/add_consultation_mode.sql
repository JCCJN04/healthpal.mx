-- =========================================================================
--  AGREGAR MODALIDAD DE CONSULTA (PRESENCIAL / LÍNEA / AMBAS)
--  Ejecutar en: Supabase Dashboard → SQL Editor
-- =========================================================================

-- 1. Agregamos la columna 'consultation_mode' a la tabla 'doctor_profiles' si no existe.
-- Los valores posibles serán:
--   'in-person' : Presencial (por defecto)
--   'video'     : En línea (Videoconsulta)
--   'both'      : Ambas modalidades

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'doctor_profiles'
        AND column_name = 'consultation_mode'
    ) THEN
        ALTER TABLE public.doctor_profiles
        ADD COLUMN consultation_mode text DEFAULT 'in-person';
    END IF;
END $$;
