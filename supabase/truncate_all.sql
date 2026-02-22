-- ============================================================
--  TRUNCATE COMPLETO — HealthPal.mx
--  Ejecutar en: Supabase Dashboard → SQL Editor
--  ⚠️  IRREVERSIBLE: elimina todos los usuarios y datos
-- ============================================================

-- 1. Tablas dependientes (sin FKs hacia otras tablas de usuario)
TRUNCATE TABLE public.user_status          CASCADE;
TRUNCATE TABLE public.patient_notes        CASCADE;
TRUNCATE TABLE public.messages             CASCADE;
TRUNCATE TABLE public.conversation_participants CASCADE;
TRUNCATE TABLE public.conversations        CASCADE;
TRUNCATE TABLE public.user_settings        CASCADE;
TRUNCATE TABLE public.folders              CASCADE;

-- 2. Documentos y citas
TRUNCATE TABLE public.documents            CASCADE;
TRUNCATE TABLE public.appointments         CASCADE;

-- 3. Perfiles de rol
TRUNCATE TABLE public.doctor_profiles      CASCADE;
TRUNCATE TABLE public.patient_profiles     CASCADE;

-- 4. Perfil base (depende de auth.users)
TRUNCATE TABLE public.profiles             CASCADE;

-- 5. Usuarios de autenticación (debe ir al final — todo lo demás depende de esto)
DELETE FROM auth.users;

-- Verificar que quedó vacío
SELECT
  'auth.users'            AS tabla, COUNT(*) AS registros FROM auth.users
UNION ALL SELECT 'profiles',               COUNT(*) FROM public.profiles
UNION ALL SELECT 'doctor_profiles',        COUNT(*) FROM public.doctor_profiles
UNION ALL SELECT 'patient_profiles',       COUNT(*) FROM public.patient_profiles
UNION ALL SELECT 'appointments',           COUNT(*) FROM public.appointments
UNION ALL SELECT 'documents',              COUNT(*) FROM public.documents
UNION ALL SELECT 'conversations',          COUNT(*) FROM public.conversations
UNION ALL SELECT 'messages',               COUNT(*) FROM public.messages
UNION ALL SELECT 'user_settings',          COUNT(*) FROM public.user_settings
UNION ALL SELECT 'patient_notes',          COUNT(*) FROM public.patient_notes
UNION ALL SELECT 'user_status',            COUNT(*) FROM public.user_status;
