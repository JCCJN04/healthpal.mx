-- ============================================
-- VERIFICACIÓN DE ESTADO DE USUARIO
-- ============================================
-- Consultas útiles para verificar el estado de los usuarios

-- 1. Ver todos los usuarios y su estado de onboarding
SELECT 
  id,
  email,
  role,
  onboarding_completed,
  onboarding_step,
  created_at
FROM profiles
ORDER BY created_at DESC;

-- 2. Usuarios que NO han completado onboarding
SELECT 
  id,
  email,
  role,
  onboarding_step,
  created_at
FROM profiles
WHERE onboarding_completed = false
ORDER BY created_at DESC;

-- 3. Usuarios que SÍ completaron onboarding
SELECT 
  id,
  email,
  role,
  full_name,
  phone,
  created_at
FROM profiles
WHERE onboarding_completed = true
ORDER BY created_at DESC;

-- 4. Buscar usuario específico por email
SELECT 
  id,
  email,
  role,
  onboarding_completed,
  onboarding_step,
  full_name,
  phone,
  gender,
  date_of_birth
FROM profiles
WHERE email = 'tu@email.com'; -- Reemplaza con el email del usuario

-- 5. Marcar onboarding como completo manualmente (si es necesario)
UPDATE profiles
SET 
  onboarding_completed = true,
  onboarding_step = 'done'
WHERE email = 'tu@email.com'; -- Reemplaza con el email del usuario

-- 6. Resetear onboarding (para pruebas)
UPDATE profiles
SET 
  onboarding_completed = false,
  onboarding_step = 'role'
WHERE email = 'tu@email.com'; -- Reemplaza con el email del usuario

-- 7. Ver sesiones activas (últimas 24 horas)
-- Nota: Supabase auth.users no tiene last_sign_in_at directamente
-- pero puedes ver los logs en el dashboard

-- 8. Contar usuarios por estado de onboarding
SELECT 
  onboarding_completed,
  COUNT(*) as total
FROM profiles
GROUP BY onboarding_completed;

-- 9. Contar usuarios por rol
SELECT 
  role,
  COUNT(*) as total
FROM profiles
WHERE role IS NOT NULL
GROUP BY role;

-- 10. Ver usuarios creados en las últimas 24 horas
SELECT 
  id,
  email,
  role,
  onboarding_completed,
  created_at
FROM profiles
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- ============================================
-- COMANDOS ÚTILES PARA DEBUGGING
-- ============================================

-- Ver estructura completa de la tabla profiles
\d profiles;

-- Ver todos los enums disponibles
SELECT 
  n.nspname as schema,
  t.typname as type_name,
  e.enumlabel as value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE t.typname = 'doc_category' 
   OR t.typname = 'user_role'
ORDER BY t.typname, e.enumsortorder;

-- Ver políticas RLS activas en profiles
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'profiles';
