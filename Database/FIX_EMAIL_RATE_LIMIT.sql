-- ============================================
-- SOLUCIÓN: Email Rate Limit Exceeded
-- ============================================
-- Este script confirma manualmente los usuarios
-- y proporciona opciones para desarrollo
-- ============================================

-- OPCIÓN 1: Confirmar manualmente tu usuario específico
-- Reemplaza 'tu_email@ejemplo.com' con tu email real
UPDATE auth.users 
SET 
  email_confirmed_at = NOW(),
  confirmed_at = NOW()
WHERE 
  email = 'tu_email@ejemplo.com'  -- ⚠️ CAMBIA ESTO POR TU EMAIL
  AND email_confirmed_at IS NULL;

-- OPCIÓN 2: Confirmar TODOS los usuarios no confirmados (solo para desarrollo)
-- Descomenta las siguientes líneas si quieres confirmar todos los usuarios:
/*
UPDATE auth.users 
SET 
  email_confirmed_at = NOW(),
  confirmed_at = NOW()
WHERE 
  email_confirmed_at IS NULL;
*/

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Ejecuta esta query para ver el estado de tu usuario:
SELECT 
  id,
  email,
  email_confirmed_at,
  confirmed_at,
  created_at
FROM auth.users 
WHERE email = 'tu_email@ejemplo.com';  -- ⚠️ CAMBIA ESTO POR TU EMAIL

-- ============================================
-- CONFIGURACIÓN PARA DESARROLLO (OPCIONAL)
-- ============================================
-- Para evitar este problema en el futuro durante desarrollo:
-- 1. Ve a tu proyecto en Supabase Dashboard
-- 2. Settings > Authentication
-- 3. En "Email Auth" desactiva "Enable email confirmations"
--    (SOLO para desarrollo, actívalo de nuevo en producción)
-- ============================================
