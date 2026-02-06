-- ============================================
-- SCRIPT DE REPARACIÓN URGENTE
-- ============================================
-- Este script arregla el problema de inicio de sesión
-- después del registro de nuevos usuarios.
--
-- INSTRUCCIONES:
-- 1. Ve a tu proyecto de Supabase
-- 2. Abre el SQL Editor
-- 3. Copia y pega este script completo
-- 4. Ejecuta el script
-- ============================================

-- Paso 1: Asegurar que los campos de onboarding existen en la tabla profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_step text;

-- Paso 2: Actualizar la función que crea perfiles automáticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
BEGIN
  -- Intentar insertar un nuevo perfil
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name, 
    role,
    onboarding_completed,
    onboarding_step
  )
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE((new.raw_user_meta_data->>'role')::public.user_role, 'patient'::public.user_role),
    false,
    'role'
  )
  ON CONFLICT (id) DO UPDATE SET
    -- Si el perfil ya existe, actualizar solo si los campos están vacíos
    role = COALESCE((new.raw_user_meta_data->>'role')::public.user_role, profiles.role),
    onboarding_completed = COALESCE(profiles.onboarding_completed, false),
    onboarding_step = COALESCE(profiles.onboarding_step, 'role');

  RETURN new;
END $$;

-- Paso 3: Reparar perfiles existentes que puedan tener datos incompletos
UPDATE public.profiles 
SET 
  onboarding_completed = false,
  onboarding_step = 'role'
WHERE 
  onboarding_completed IS NULL 
  OR onboarding_step IS NULL;

-- Paso 4: Verificar que el trigger está activo
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE PROCEDURE public.handle_new_user();

-- Paso 5: Crear índice para mejorar rendimiento de búsquedas
CREATE INDEX IF NOT EXISTS profiles_onboarding_idx 
ON public.profiles(onboarding_completed);

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Ejecuta esta query para verificar que todo está correcto:
-- SELECT id, email, role, onboarding_completed, onboarding_step 
-- FROM public.profiles 
-- WHERE email = 'tu_email@ejemplo.com';
-- ============================================

SELECT 'Migración completada exitosamente. Ahora puedes intentar iniciar sesión nuevamente.' as status;
