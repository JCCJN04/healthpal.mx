-- ============================================================
--  FIX URGENTE: Asegurar que usuarios pueden leer su propio perfil
--  Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- Asegurar que la política de auto-lectura existe
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
END $$;

CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Asegurar que usuarios pueden actualizar su propio perfil
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
END $$;

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Verificar que las políticas existen
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;
