-- ============================================
-- DIAGNÓSTICO Y REPARACIÓN COMPLETA
-- ============================================
-- Este script diagnostica y repara todos los problemas
-- relacionados con el login
-- ============================================

-- PASO 1: VERIFICAR USUARIO EN auth.users
SELECT 
  id,
  email,
  email_confirmed_at,
  raw_user_meta_data->>'role' as metadata_role,
  created_at
FROM auth.users 
WHERE email = 'juan.mendozac@udem.edu';

-- Si ves NULL en email_confirmed_at, continúa con el paso 2


-- PASO 2: CONFIRMAR EMAIL (si está NULL arriba)
UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE 
  email = 'juan.mendozac@udem.edu'
  AND email_confirmed_at IS NULL;

-- Debería mostrar: "UPDATE 1" si se actualizó


-- PASO 3: VERIFICAR PERFIL EN profiles
SELECT 
  id, 
  email, 
  role, 
  onboarding_completed, 
  onboarding_step,
  created_at
FROM public.profiles 
WHERE email = 'juan.mendozac@udem.edu';

-- Si NO ves resultados, el perfil no existe (continúa al paso 4)
-- Si ves NULL en onboarding_completed o onboarding_step (continúa al paso 5)


-- PASO 4: CREAR PERFIL (solo si no existe)
-- Obtén el user_id del paso 1 y reemplázalo abajo
INSERT INTO public.profiles (
  id, 
  email, 
  role,
  onboarding_completed,
  onboarding_step
)
SELECT 
  id,
  email,
  COALESCE((raw_user_meta_data->>'role')::public.user_role, 'patient'::public.user_role),
  false,
  'role'
FROM auth.users 
WHERE email = 'juan.mendozac@udem.edu'
ON CONFLICT (id) DO NOTHING;


-- PASO 5: ASEGURAR CAMPOS DE ONBOARDING
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_step text;


-- PASO 6: REPARAR PERFILES INCOMPLETOS
UPDATE public.profiles 
SET 
  onboarding_completed = COALESCE(onboarding_completed, false),
  onboarding_step = COALESCE(onboarding_step, 'role'),
  role = COALESCE(role, 'patient'::public.user_role)
WHERE 
  email = 'juan.mendozac@udem.edu';


-- PASO 7: ARREGLAR FUNCIÓN DE CREACIÓN AUTOMÁTICA
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
BEGIN
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
    role = COALESCE((new.raw_user_meta_data->>'role')::public.user_role, profiles.role),
    onboarding_completed = COALESCE(profiles.onboarding_completed, false),
    onboarding_step = COALESCE(profiles.onboarding_step, 'role');

  RETURN new;
END $$;


-- PASO 8: ASEGURAR TRIGGER
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE PROCEDURE public.handle_new_user();


-- PASO 9: VERIFICACIÓN FINAL
SELECT 
  u.id,
  u.email,
  u.email_confirmed_at IS NOT NULL as email_confirmed,
  p.role,
  p.onboarding_completed,
  p.onboarding_step
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.email = 'juan.mendozac@udem.edu';

-- RESULTADO ESPERADO:
-- ✅ email_confirmed: true
-- ✅ role: 'patient' o 'doctor'  
-- ✅ onboarding_completed: false
-- ✅ onboarding_step: 'role'

-- Si todo está correcto, intenta iniciar sesión nuevamente
