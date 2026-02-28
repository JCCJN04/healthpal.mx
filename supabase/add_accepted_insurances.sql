-- ============================================================
--  Agregar columna accepted_insurances a doctor_profiles
--  Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- Solo agrega la columna si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'doctor_profiles'
      AND column_name = 'accepted_insurances'
  ) THEN
    ALTER TABLE public.doctor_profiles
      ADD COLUMN accepted_insurances text[] DEFAULT NULL;
  END IF;
END $$;

-- Verificar
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'doctor_profiles'
ORDER BY ordinal_position;
